'use client';

import { useState } from 'react';
import { Plus, Trash2, Pencil, Save, Loader2, Link2, ImageIcon, X } from 'lucide-react';
import { apiGet, apiPost, apiPatch, apiDelete, apiPut } from '@/infra/http-client';
import { eur } from '@/domains/shared-kernel/money';

type CategoryRow = { id: string; name: string; slug: string; description: string | null; sort: number; productsCount: number };
type ProductRow = {
  id: string; name: string; slug: string; description: string; categoryId: string; category: string;
  priceCents: number; image: string; isFeatured: boolean; isNew: boolean; isVegetarian: boolean; isSpicy: boolean;
  sort: number; available: boolean; hasOptions: boolean;
};
type OptionDraft = { name: string; priceCents: number; available: boolean; sort: number };
type GroupDraft = { name: string; required: boolean; multiple: boolean; maxSelect: number | null; sort: number; options: OptionDraft[] };

const emptyProduct = (categoryId: string): ProductRow => ({
  id: '', name: '', slug: '', description: '', categoryId, category: '', priceCents: 0, image: '', isFeatured: false, isNew: false, isVegetarian: false, isSpicy: false, sort: 0, available: true, hasOptions: false,
});

export function MenuManager({ initialProducts, initialCategories }: { initialProducts: ProductRow[]; initialCategories: CategoryRow[] }) {
  const [products, setProducts] = useState(initialProducts);
  const [categories, setCategories] = useState(initialCategories);
  const [draft, setDraft] = useState<ProductRow | null>(null);
  const [groups, setGroups] = useState<GroupDraft[]>([]);
  const [groupsDirty, setGroupsDirty] = useState(false);
  const [catDraft, setCatDraft] = useState<CategoryRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reload = async () => {
    const [p, c] = await Promise.all([apiGet<{ products: ProductRow[] }>('/api/admin/products'), apiGet<{ categories: CategoryRow[] }>('/api/admin/categories')]);
    if (p.ok) setProducts(p.data.products);
    if (c.ok) setCategories(c.data.categories);
  };

  const set = <K extends keyof ProductRow>(key: K, value: ProductRow[K]) => setDraft((d) => (d ? { ...d, [key]: value } : d));

  const openProduct = async (p: ProductRow | null) => {
    setError(null);
    if (!p) {
      setDraft(emptyProduct(categories[0]?.id ?? ''));
      setGroups([]);
      setGroupsDirty(false);
      return;
    }
    setDraft({ ...p });
    const r = await apiGet(`/api/admin/products/${p.id}/options`);
    if (r.ok) setGroups(r.data.groups as GroupDraft[]);
    setGroupsDirty(false);
  };

  const saveProduct = async () => {
    if (!draft) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const body = {
        name: draft.name, slug: draft.slug || undefined, priceCents: draft.priceCents, categoryId: draft.categoryId,
        image: draft.image, description: draft.description, isFeatured: draft.isFeatured, isNew: draft.isNew,
        isVegetarian: draft.isVegetarian, isSpicy: draft.isSpicy, sort: draft.sort, available: draft.available,
      };
      const r = draft.id ? await apiPatch(`/api/admin/products/${draft.id}`, body) : await apiPost('/api/admin/products', body);
      if (!r.ok) {
        setError(r.data.error?.message ?? 'Não foi possível guardar.');
        return;
      }
      setNotice(draft.id ? 'Produto atualizado.' : 'Produto criado.');
      await reload();
      if (!draft.id) {
        const created = products.find((x) => x.name === draft.name);
        const fresh = r.data as unknown as { product: { id: string } };
        if (fresh.product?.id) await openProduct({ ...draft, id: fresh.product.id, hasOptions: false, category: categories.find((c) => c.id === draft.categoryId)?.name ?? '' });
      }
    } finally {
      setBusy(false);
    }
  };

  const saveGroups = async () => {
    if (!draft?.id) return;
    setBusy(true);
    setError(null);
    try {
      const r = await apiPut(`/api/admin/products/${draft.id}/options`, { groups });
      if (!r.ok) {
        setError(r.data.error?.message ?? 'Não foi possível guardar os adicionais.');
        return;
      }
      setGroupsDirty(false);
      setNotice('Adicionais guardados.');
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const toggleAvailable = async (p: ProductRow) => {
    const r = await apiPatch(`/api/admin/products/${p.id}`, { available: !p.available });
    if (r.ok) await reload();
  };

  const disableProduct = async (p: ProductRow) => {
    if (!window.confirm(`Desativar "${p.name}"? O artigo deixa de aparecer no site (histórico mantém-se).`)) return;
    await apiDelete(`/api/admin/products/${p.id}`);
    await reload();
    if (draft?.id === p.id) openProduct(null);
  };

  const saveCategory = async () => {
    if (!catDraft) return;
    setBusy(true);
    setError(null);
    try {
      const body = { name: catDraft.name, slug: catDraft.slug || undefined, description: catDraft.description || undefined, sort: catDraft.sort };
      const r = catDraft.id ? await apiPatch(`/api/admin/categories/${catDraft.id}`, body) : await apiPost('/api/admin/categories', body);
      if (!r.ok) {
        setError(r.data.error?.message ?? 'Não foi possível guardar a categoria.');
        return;
      }
      setCatDraft(null);
      setNotice('Categoria guardada.');
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const deleteCategory = async (c: CategoryRow) => {
    if (!window.confirm(`Remover a categoria "${c.name}"?`)) return;
    const r = await apiDelete(`/api/admin/categories/${c.id}`);
    if (!r.ok) setError(r.data.error?.message ?? 'Não foi possível remover.');
    await reload();
  };

  const mutateGroups = (fn: (gs: GroupDraft[]) => GroupDraft[]) => {
    setGroups(fn);
    setGroupsDirty(true);
  };
  const setGroup = (i: number, patch: Partial<GroupDraft>) =>
    mutateGroups((gs) => gs.map((g, idx) => (idx === i ? { ...g, ...patch } : g)));
  const setOption = (gi: number, oi: number, patch: Partial<OptionDraft>) =>
    mutateGroups((gs) => gs.map((g, idx) => (idx === gi ? { ...g, options: g.options.map((o, j) => (j === oi ? { ...o, ...patch } : o)) } : g)));

  return (
    <div className="mt-6 space-y-6">
      {error && <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">{error}</p>}
      {notice && <p className="rounded-xl bg-success/10 px-4 py-3 text-sm font-medium text-success">{notice}</p>}

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Coluna esquerda: categorias + lista de produtos */}
        <div className="space-y-6">
          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-bold">Categorias (menus)</h2>
              <button onClick={() => setCatDraft(catDraft?.id === '' ? null : { id: '', name: '', slug: '', description: '', sort: categories.length, productsCount: 0 })} className="btn-secondary text-xs">
                <Plus className="h-3.5 w-3.5" /> Nova
              </button>
            </div>
            <ul className="mt-3 divide-y divide-line">
              {categories.map((c) => (
                <li key={c.id} className="flex items-center gap-2 py-2 text-sm">
                  <button onClick={() => setCatDraft({ ...c })} className="min-w-0 flex-1 text-left">
                    <span className="block truncate font-medium hover:underline underline-offset-2">{c.name}</span>
                    <span className="text-xs text-muted">{c.productsCount} produtos · ordem {c.sort}</span>
                  </button>
                  <button onClick={() => deleteCategory(c)} disabled={c.productsCount > 0} title={c.productsCount > 0 ? 'Só remove categorias vazias' : 'Remover'} className="rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger disabled:opacity-30">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
              {categories.length === 0 && <li className="py-2 text-xs text-muted">Sem categorias — crie a primeira.</li>}
            </ul>
            {catDraft && (
              <div className="mt-3 space-y-2 rounded-xl border border-line bg-paper p-3">
                <input className="input" placeholder="Nome (ex.: Hambúrgueres)" value={catDraft.name} onChange={(e) => setCatDraft({ ...catDraft, name: e.target.value })} />
                <input className="input" placeholder="Slug (vazio = automático)" value={catDraft.slug} onChange={(e) => setCatDraft({ ...catDraft, slug: e.target.value })} />
                <input className="input" placeholder="Ordem" type="number" value={catDraft.sort} onChange={(e) => setCatDraft({ ...catDraft, sort: Number(e.target.value) })} />
                <div className="flex gap-2">
                  <button onClick={saveCategory} disabled={busy} className="btn-primary h-9 flex-1 text-xs"><Save className="h-3.5 w-3.5" /> Guardar</button>
                  <button onClick={() => setCatDraft(null)} className="btn-secondary h-9 text-xs">Cancelar</button>
                </div>
              </div>
            )}
          </section>

          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-bold">Produtos</h2>
              <button onClick={() => openProduct(null)} className="btn-primary text-xs"><Plus className="h-3.5 w-3.5" /> Novo produto</button>
            </div>
            <ul className="mt-3 max-h-[520px] divide-y divide-line overflow-y-auto">
              {products.map((p) => (
                <li key={p.id} className="flex items-center gap-2 py-2.5">
                  <button onClick={() => openProduct(p)} className={`min-w-0 flex-1 text-left ${draft?.id === p.id ? 'text-accent-ink' : ''}`}>
                    <span className={`block truncate text-sm font-medium ${p.available ? '' : 'text-muted line-through'}`}>{p.name}</span>
                    <span className="text-xs text-muted">{p.category} · {eur(p.priceCents)}{p.hasOptions ? ' · com adicionais' : ''}</span>
                  </button>
                  <button onClick={() => toggleAvailable(p)} aria-pressed={p.available} aria-label={`${p.name}: ${p.available ? 'disponível' : 'esgotado'}`} className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${p.available ? 'bg-success' : 'bg-ink/20'}`}>
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-surface shadow transition-all ${p.available ? 'left-[18px]' : 'left-0.5'}`} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Editor do produto */}
        <section className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-bold">{draft?.id ? `Editar: ${draft.name}` : 'Novo produto'}</h2>
            {draft?.id && (
              <div className="flex gap-2">
                <button onClick={() => disableProduct(draft)} className="btn-ghost text-xs text-danger">Desativar</button>
                <button onClick={() => openProduct(null)} className="btn-secondary text-xs"><X className="h-3.5 w-3.5" /> Fechar</button>
              </div>
            )}
          </div>

          {!draft ? (
            <p className="mt-6 rounded-xl bg-paper px-4 py-6 text-center text-sm text-muted">Selecione um produto à esquerda para editar (nome, preço, foto, adicionais) ou crie um novo.</p>
          ) : (
            <div className="mt-4 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="p-name">Nome</label>
                  <input id="p-name" className="input" value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="X-Salada da Casa" />
                </div>
                <div>
                  <label className="label" htmlFor="p-slug">Slug (URL — vazio = automático)</label>
                  <input id="p-slug" className="input" value={draft.slug} onChange={(e) => set('slug', e.target.value)} placeholder="x-salada-da-casa" />
                </div>
                <div>
                  <label className="label" htmlFor="p-price">Preço (cêntimos)</label>
                  <input id="p-price" className="input" type="number" min={0} value={draft.priceCents} onChange={(e) => set('priceCents', Number(e.target.value))} />
                  <p className="mt-1 text-xs text-muted">= {eur(draft.priceCents)}</p>
                </div>
                <div>
                  <label className="label" htmlFor="p-category">Categoria</label>
                  <select id="p-category" className="input" value={draft.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="p-image">Foto (URL)</label>
                  <div className="flex items-center gap-2">
                    <input id="p-image" className="input" value={draft.image} onChange={(e) => set('image', e.target.value)} placeholder="https://… ou /img/items/…" />
                    {draft.image && <a href={draft.image} target="_blank" rel="noreferrer" className="btn-secondary shrink-0 p-2.5" aria-label="Abrir imagem"><Link2 className="h-4 w-4" /></a>}
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor="p-sort">Ordem</label>
                  <input id="p-sort" className="input" type="number" min={0} value={draft.sort} onChange={(e) => set('sort', Number(e.target.value))} />
                </div>
              </div>

              {draft.image && (
                <div className="overflow-hidden rounded-xl border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={draft.image} alt="Pré-visualização" className="h-36 w-full object-cover" />
                </div>
              )}

              <div>
                <label className="label" htmlFor="p-description">Descrição</label>
                <textarea id="p-description" className="input min-h-[90px]" value={draft.description} onChange={(e) => set('description', e.target.value)} placeholder="Carne 160 g, queijo, molho da casa…" />
              </div>

              <div className="flex flex-wrap gap-4 text-sm">
                {([['isFeatured', 'Destaque da casa'], ['isNew', 'Novo'], ['isVegetarian', 'Vegetariano'], ['isSpicy', 'Picante']] as const).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 font-medium">
                    <input type="checkbox" checked={draft[key]} onChange={(e) => set(key, e.target.checked)} className="h-4 w-4 accent-[#E9A400]" /> {label}
                  </label>
                ))}
              </div>

              <button onClick={saveProduct} disabled={busy || !draft.name || !draft.categoryId} className="btn-primary">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar produto
              </button>

              {/* Adicionais */}
              {draft.id && (
                <div className="rounded-2xl border border-dashed border-ink/20 bg-paper p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-display text-sm font-bold">Adicionais</p>
                      <p className="text-xs text-muted">Grupos com opções e preço extra (ex.: "Molhos" → ovo +0,80 €). Aparecem na página do produto.</p>
                    </div>
                    <button
                      onClick={() => mutateGroups((gs) => [...gs, { name: '', required: true, multiple: false, maxSelect: null, sort: gs.length, options: [{ name: '', priceCents: 0, available: true, sort: 0 }] }])}
                      className="btn-secondary text-xs"
                    >
                      <Plus className="h-3.5 w-3.5" /> Grupo
                    </button>
                  </div>

                  {groups.map((g, gi) => (
                    <div key={gi} className="mt-4 rounded-xl border border-line bg-surface p-3">
                      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto_auto]">
                        <input className="input" placeholder="Nome do grupo (ex.: Extras)" value={g.name} onChange={(e) => setGroup(gi, { name: e.target.value })} />
                        <label className="flex items-center gap-1.5 text-xs font-medium"><input type="checkbox" checked={g.required} onChange={(e) => setGroup(gi, { required: e.target.checked })} className="h-3.5 w-3.5 accent-[#E9A400]" /> Obrigatório</label>
                        <label className="flex items-center gap-1.5 text-xs font-medium"><input type="checkbox" checked={g.multiple} onChange={(e) => setGroup(gi, { multiple: e.target.checked, maxSelect: e.target.checked ? g.maxSelect ?? 4 : null })} className="h-3.5 w-3.5 accent-[#E9A400]" /> Múltipla</label>
                        {g.multiple && <input className="input w-20" type="number" min={2} max={20} placeholder="Máx." value={g.maxSelect ?? ''} onChange={(e) => setGroup(gi, { maxSelect: e.target.value ? Number(e.target.value) : null })} />}
                        <button onClick={() => mutateGroups((gs) => gs.filter((_, i) => i !== gi))} className="rounded-lg p-2 text-muted hover:bg-danger/10 hover:text-danger" aria-label="Remover grupo"><Trash2 className="h-4 w-4" /></button>
                      </div>
                      <div className="mt-2 space-y-2">
                        {g.options.map((o, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <input className="input flex-1" placeholder="Opção (ex.: Ovo frito)" value={o.name} onChange={(e) => setOption(gi, oi, { name: e.target.value })} />
                            <input className="input w-28" type="number" min={0} placeholder="€ cênt." value={o.priceCents} onChange={(e) => setOption(gi, oi, { priceCents: Number(e.target.value) })} />
                            <span className="w-16 text-right text-xs text-muted">{eur(o.priceCents)}</span>
                            <button onClick={() => setOption(gi, oi, { available: !o.available })} className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${o.available ? 'bg-success/10 text-success' : 'bg-ink/10 text-muted'}`} aria-label="Disponibilidade">disponível</button>
                            <button onClick={() => mutateGroups((gs) => gs.map((x, i) => (i === gi ? { ...x, options: x.options.filter((_, j) => j !== oi) } : x)))} className="rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger" aria-label="Remover opção"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        ))}
                        <button onClick={() => mutateGroups((gs) => gs.map((x, i) => (i === gi ? { ...x, options: [...x.options, { name: '', priceCents: 0, available: true, sort: x.options.length }] } : x)))} className="btn-ghost text-xs">
                          <Plus className="h-3.5 w-3.5" /> Opção
                        </button>
                      </div>
                    </div>
                  ))}
                  {groups.length > 0 && (
                    <button onClick={saveGroups} disabled={busy || !groupsDirty} className="btn-secondary mt-3 text-xs disabled:opacity-50">
                      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Guardar adicionais
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
