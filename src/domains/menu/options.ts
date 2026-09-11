import { prisma } from '@/infra/db';

export type SelectedOption = { itemId: string };

export type OptionSnapshot = { itemId: string; name: string; priceCents: number };

export type OptionGroupWithItems = {
  id: string;
  name: string;
  required: boolean;
  multiple: boolean;
  maxSelect: number | null;
  sort: number;
  options: { id: string; name: string; priceCents: number; available: boolean; sort: number }[];
};

// Chave de combinação: ids das opções por ordem alfabética — duas linhas do
// mesmo produto com as mesmas escolhas fundem-se no carrinho (unique composto).
export function optionsKey(selected: SelectedOption[]): string {
  return selected.map((s) => s.itemId).sort().join('|');
}

export function optionGroupsOf(productId: string): Promise<OptionGroupWithItems[]> {
  return prisma.optionGroup.findMany({
    where: { productId },
    orderBy: { sort: 'asc' },
    include: { options: { orderBy: { sort: 'asc' } } },
  });
}

export type SelectionResult =
  | { ok: true; key: string; extraCents: number; snapshot: OptionSnapshot[] }
  | { ok: false; message: string };

// Valida a seleção do cliente contra os grupos do produto (nunca confiar no
// cliente para preços): obrigatórios, rádio vs múltipla, limites e existência.
export async function validateSelection(productId: string, selected: SelectedOption[]): Promise<SelectionResult> {
  const groups = await optionGroupsOf(productId);
  if (groups.length === 0) {
    return selected.length
      ? { ok: false, message: 'Este produto não tem adicionais.' }
      : { ok: true, key: '', extraCents: 0, snapshot: [] };
  }

  const ids = selected.map((s) => s.itemId);
  if (new Set(ids).size !== ids.length) return { ok: false, message: 'Adicional repetido.' };

  const items = ids.length
    ? await prisma.optionItem.findMany({ where: { id: { in: ids }, available: true } })
    : [];
  if (items.length !== ids.length) return { ok: false, message: 'Um dos adicionais já não está disponível.' };

  const byId = new Map(items.map((i) => [i.id, i]));
  const groupOf = new Map(groups.map((g) => [g.id, g]));

  for (const g of groups) {
    const chosen = ids.filter((id) => groupOf.get(byId.get(id)?.groupId ?? '')?.id === g.id);
    if (g.required && chosen.length === 0) return { ok: false, message: `Escolha uma opção em "${g.name}".` };
    if (!g.multiple && chosen.length > 1) return { ok: false, message: `"${g.name}" só permite uma opção.` };
    if (g.multiple && g.maxSelect && chosen.length > g.maxSelect) {
      return { ok: false, message: `"${g.name}" permite no máximo ${g.maxSelect} opções.` };
    }
  }

  const snapshot: OptionSnapshot[] = ids.map((id) => {
    const item = byId.get(id)!;
    return { itemId: item.id, name: item.name, priceCents: item.priceCents };
  });
  return {
    ok: true,
    key: optionsKey(selected),
    extraCents: snapshot.reduce((s, o) => s + o.priceCents, 0),
    snapshot,
  };
}

export function unitPriceCents(productPriceCents: number, options: OptionSnapshot[] | null): number {
  return productPriceCents + (options ?? []).reduce((s, o) => s + o.priceCents, 0);
}
