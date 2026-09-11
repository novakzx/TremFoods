import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Menu Oficial Trem Food — Hamburgueria e Petiscaria em Almada.
 */
const categories = [
  { name: 'Hambúrgueres', slug: 'hamburgueres', description: 'Hambúrgueres artesanais fartos na chapa com muito sabor e ingredientes frescos.', sort: 1 },
  { name: 'Combos & Menus', slug: 'combos', description: 'Menus completos com hambúrguer, batatas fritas crocantes e bebida à escolha.', sort: 2 },
  { name: 'Petiscos & Tábuas', slug: 'petiscos', description: 'Tábuas fartas, porções e petiscos irresistíveis para partilhar.', sort: 3 },
  { name: 'Pratos & Massas', slug: 'pratos', description: 'Pratos executivos, picanha grelhada, frango e esparguetes da casa.', sort: 4 },
  { name: 'Hot Dogs & Lanches', slug: 'hot-dogs', description: 'Cachorros-quentes prensados no estilo brasileiro e lanches caprichados.', sort: 5 },
  { name: 'Caldos & Salgados', slug: 'caldos-salgados', description: 'Caldos reconfortantes, salgados artesanais e pães de alho especiais.', sort: 6 },
  { name: 'Sobremesas', slug: 'sobremesas', description: 'Açaí montado na taça, pudim brasileiro tradicional e doces da casa.', sort: 7 },
  { name: 'Bebidas', slug: 'bebidas', description: 'Refrigerantes, sumos, cervejas e águas frescas.', sort: 8 },
];

interface OptionItemSeed {
  name: string;
  priceCents: number;
  sort?: number;
}

interface OptionGroupSeed {
  name: string;
  required: boolean;
  multiple: boolean;
  maxSelect?: number;
  sort?: number;
  options: OptionItemSeed[];
}

interface ProductSeed {
  slug: string;
  name: string;
  category: string;
  priceCents: number;
  image: string;
  description: string;
  isFeatured?: boolean;
  isNew?: boolean;
  isVegetarian?: boolean;
  isSpicy?: boolean;
  optionGroups?: OptionGroupSeed[];
}

const burgerExtras: OptionGroupSeed = {
  name: 'Adicionais & Extras (Opcional)',
  required: false,
  multiple: true,
  sort: 2,
  options: [
    { name: 'Bacon em Cubos Extra (+1,50 €)', priceCents: 150, sort: 1 },
    { name: 'Queijo Derretido Extra (+1,00 €)', priceCents: 100, sort: 2 },
    { name: 'Ovo Estrelado (+1,00 €)', priceCents: 100, sort: 3 },
    { name: 'Carne de Hambúrguer 120g (+2,50 €)', priceCents: 250, sort: 4 },
    { name: 'Molho Especial da Casa (+0,80 €)', priceCents: 80, sort: 5 },
  ],
};

const products: ProductSeed[] = [
  // ── 1. Trem Tropical
  {
    slug: 'trem-tropical',
    name: 'Trem Tropical',
    category: 'hamburgueres',
    priceCents: 950,
    image: '/img/items/1.png',
    isFeatured: true,
    isNew: true,
    description: 'Hambúrguer 120g, queijo, bacon em cubos, fiambre, abacaxi (ananás), salada, milho, batata palha e molho especial.',
    optionGroups: [burgerExtras],
  },
  // ── 2. Trem Picanha
  {
    slug: 'trem-picanha',
    name: 'Trem Picanha',
    category: 'hamburgueres',
    priceCents: 1290,
    image: '/img/items/2.png',
    isFeatured: true,
    description: 'Carne de hambúrguer 120g, carne de picanha, 2 queijos, 2 fiambres, ovo, salada, milho, batata palha e molho especial.',
    optionGroups: [burgerExtras],
  },
  // ── 3. Trem Bagunça
  {
    slug: 'trem-bagunca',
    name: 'Trem Bagunça',
    category: 'hamburgueres',
    priceCents: 1350,
    image: '/img/items/3.png',
    isFeatured: true,
    description: '2 carnes de hambúrguer de 120g, frango desfiado, queijo, bacon, fiambre, ovo, salada, milho, batata palha e molho especial.',
    optionGroups: [burgerExtras],
  },
  // ── 4. Trem Costela
  {
    slug: 'trem-costela',
    name: 'Trem Costela',
    category: 'hamburgueres',
    priceCents: 1390,
    image: '/img/items/4.png',
    isFeatured: true,
    description: 'Pão Brioche, Hambúrguer de costela, bacon fatiado, queijo coalho, alface, tomate e cebola caramelizada.',
    optionGroups: [burgerExtras],
  },
  // ── 5. Trem Bacon
  {
    slug: 'trem-bacon',
    name: 'Trem Bacon',
    category: 'hamburgueres',
    priceCents: 900,
    image: '/img/items/5.png',
    description: 'Hambúrguer 120g, queijo, bacon em cubos, fiambre, salada, milho, batata palha e molho especial.',
    optionGroups: [burgerExtras],
  },
  // ── 6. Trem Laçador Burger
  {
    slug: 'trem-lacador-burger',
    name: 'Trem Laçador Burger',
    category: 'hamburgueres',
    priceCents: 800,
    image: '/img/items/6.png',
    description: 'Hambúrguer 120g, queijo, ovo, salada, milho, batata palha e molho especial.',
    optionGroups: [burgerExtras],
  },
  // ── 7. Trem Banana Burger
  {
    slug: 'trem-banana-burger',
    name: 'Trem Banana Burger',
    category: 'hamburgueres',
    priceCents: 950,
    image: '/img/items/7.png',
    description: 'Hambúrguer 120g, queijo, bacon em cubos, fiambre, banana, salada, milho, batata palha e molho especial.',
    optionGroups: [burgerExtras],
  },
  // ── 8. Combo Menu Trem Tudo Especial
  {
    slug: 'combo-menu-trem-tudo-especial',
    name: 'Combo Menu Trem Tudo Especial',
    category: 'combos',
    priceCents: 1090,
    image: '/img/items/8.png',
    isFeatured: true,
    isNew: true,
    description: 'Carne de hambúrguer 120g, 2 fatias de queijo, 2 fatias de fiambre, bacon em cubos, ovo, salada, milho, batata palha e molho especial da casa + batata frita e bebida à escolha.',
    optionGroups: [
      {
        name: 'Escolha a sua Bebida',
        required: true,
        multiple: false,
        sort: 1,
        options: [
          { name: 'Coca-Cola Normal (33cl)', priceCents: 0, sort: 1 },
          { name: 'Coca-Cola Sem Açúcar (33cl)', priceCents: 0, sort: 2 },
          { name: 'Guaraná Antarctica (33cl)', priceCents: 0, sort: 3 },
          { name: 'Água Mineral (50cl)', priceCents: 0, sort: 4 },
          { name: 'Cerveja Super Bock (33cl)', priceCents: 0, sort: 5 },
          { name: 'Cerveja Sagres (33cl)', priceCents: 0, sort: 6 },
          { name: 'Cerveja Heineken (33cl)', priceCents: 0, sort: 7 },
        ],
      },
      burgerExtras,
    ],
  },
  // ── 9. Tábua Trem Food
  {
    slug: 'tabua-trem-food',
    name: 'Tábua Trem Food',
    category: 'petiscos',
    priceCents: 4450,
    image: '/img/items/9.png',
    isFeatured: true,
    description: 'Maminha acebolada, torresmo crocante, frango a passarinho, linguiça, mandioca frita, batata frita, farofa da casa e molho especial.',
  },
  // ── 10. Fritas com Bacon e Cheddar
  {
    slug: 'fritas-com-bacon-e-cheddar',
    name: 'Fritas com Bacon e Cheddar',
    category: 'petiscos',
    priceCents: 890,
    image: '/img/items/10.png',
    description: 'Porção farta de batatas fritas crocantes cobertas com creme de queijo cheddar derretido e cubos de bacon crocantes.',
  },
  // ── 11. Coração com Fritas
  {
    slug: 'coracao-com-fritas',
    name: 'Coração com Fritas',
    category: 'petiscos',
    priceCents: 990,
    image: '/img/items/11.png',
    description: 'Porção de coração de frango grelhado e acebolado com tempero especial da casa, servido com batatas fritas crocantes.',
  },
  // ── 12. Trio Trem Food
  {
    slug: 'trio-trem-food',
    name: 'Trio Trem Food',
    category: 'petiscos',
    priceCents: 2490,
    image: '/img/items/12.png',
    description: 'Torresmo de barriga crocante (500g), mandioca frita dourada (400g) e filé de tilápia empanado crocante com molho especial.',
  },
  // ── 13. Torre de Batata
  {
    slug: 'torre-de-batata',
    name: 'Torre de Batata',
    category: 'petiscos',
    priceCents: 1790,
    image: '/img/items/13.png',
    isFeatured: true,
    description: 'Torre espetacular de batatas fritas crocantes montada com linguiça calabresa, bacon crocante em cubos e muito queijo cheddar derretido.',
  },
  // ── 14. Picanha com Mandioca e Queijo
  {
    slug: 'picanha-com-mandioca-e-queijo',
    name: 'Picanha com Mandioca e Queijo',
    category: 'petiscos',
    priceCents: 1390,
    image: '/img/items/14.png',
    description: 'Tiras de picanha suculenta grelhada na chapa com cebola, pedaços de mandioca frita crocante e queijo derretido por cima.',
  },
  // ── 15. Filé de Tilápia com Fritas
  {
    slug: 'file-de-tilapia-com-fritas',
    name: 'Filé de Tilápia com Fritas',
    category: 'petiscos',
    priceCents: 1290,
    image: '/img/items/15.png',
    description: 'Iscas de filé de tilápia empanadas crocantes e douradas, servidas com batatas fritas, molho especial e limão.',
  },
  // ── 16. Esparguete
  {
    slug: 'esparguete',
    name: 'Esparguete da Casa',
    category: 'pratos',
    priceCents: 950,
    image: '/img/items/16.png',
    description: 'Esparguete saboroso servido com queijo ralado derretido e milho. Escolha o seu modo de preparo favorito.',
    optionGroups: [
      {
        name: 'Escolha o Modo do Esparguete',
        required: true,
        multiple: false,
        sort: 1,
        options: [
          { name: 'Bolonhesa (molho bolonhesa, bacon, milho e queijo) — 9,50 €', priceCents: 0, sort: 1 },
          { name: 'Branco (molho branco cremoso, frango desfiado, milho e queijo) — 9,50 €', priceCents: 0, sort: 2 },
          { name: 'Misto (molho bolonhesa, molho branco, frango, bacon, milho e queijo) — 11,00 €', priceCents: 150, sort: 3 },
        ],
      },
    ],
  },
  // ── 17. Espetinhos
  {
    slug: 'espetinhos',
    name: 'Espetinhos na Brasa',
    category: 'petiscos',
    priceCents: 490,
    image: '/img/items/17.png',
    description: 'Espetinhos grelhados na brasa com tempero artesanal, cobertos com queijo derretido tostado e acompanhamento.',
    optionGroups: [
      {
        name: 'Escolha o Sabor do Espetinho',
        required: true,
        multiple: false,
        sort: 1,
        options: [
          { name: 'Espetinho de Frango — 4,90 €', priceCents: 0, sort: 1 },
          { name: 'Espetinho de Picanha — 6,00 €', priceCents: 110, sort: 2 },
          { name: 'Medalhão (Frango e Bacon) — 6,00 €', priceCents: 110, sort: 3 },
        ],
      },
    ],
  },
  // ── 18. Prato de Picanha com Ovo
  {
    slug: 'prato-de-picanha-com-ovo',
    name: 'Prato de Picanha com Ovo',
    category: 'pratos',
    priceCents: 1190,
    image: '/img/items/18.png',
    isFeatured: true,
    description: 'Prato executivo completo: arroz branco soltinho, feijão temperado, bifes de picanha grelhada, ovo estrelado, batatas fritas e salada fresca com vinagrete.',
  },
  // ── 19. Prato de Frango com Ovo
  {
    slug: 'prato-de-frango-com-ovo',
    name: 'Prato de Frango com Ovo',
    category: 'pratos',
    priceCents: 990,
    image: '/img/items/19.png',
    description: 'Prato executivo completo: arroz branco, feijão temperado, filés de peito de frango grelhados, ovo estrelado, batatas fritas crocantes e salada.',
  },
  // ── 20. Caldos
  {
    slug: 'caldos',
    name: 'Caldos Tradicionais',
    category: 'caldos-salgados',
    priceCents: 790,
    image: '/img/items/20.png',
    description: 'Caldos quentes e reconfortantes finalizados com cheiro-verde fresco e torresmo pururuca. Acompanha fatias de pão fresco.',
    optionGroups: [
      {
        name: 'Escolha o Sabor do Caldo',
        required: true,
        multiple: false,
        sort: 1,
        options: [
          { name: 'Caldo de Mandioca — 7,90 €', priceCents: 0, sort: 1 },
          { name: 'Caldo de Feijão — 7,90 €', priceCents: 0, sort: 2 },
          { name: 'Caldo de Mocotó — 7,90 €', priceCents: 0, sort: 3 },
        ],
      },
    ],
  },
  // ── 21. Pães de Alho
  {
    slug: 'paes-de-alho',
    name: 'Pães de Alho',
    category: 'caldos-salgados',
    priceCents: 490,
    image: '/img/items/21.png',
    description: 'Pão de alho crocante grelhado na brasa com crosta de queijo derretido, disponível na versão simples ou recheado.',
    optionGroups: [
      {
        name: 'Escolha o Tipo de Pão de Alho',
        required: true,
        multiple: false,
        sort: 1,
        options: [
          { name: 'Pão de Alho Simples — 4,90 €', priceCents: 0, sort: 1 },
          { name: 'Recheado com Frango — 7,90 €', priceCents: 300, sort: 2 },
          { name: 'Recheado com Coração de Frango — 7,90 €', priceCents: 300, sort: 3 },
          { name: 'Recheado com Picanha — 9,50 €', priceCents: 460, sort: 4 },
        ],
      },
    ],
  },
  // ── 22. Açaí
  {
    slug: 'acai',
    name: 'Açaí Especial (400ml)',
    category: 'sobremesas',
    priceCents: 990,
    image: '/img/items/22.png',
    isFeatured: true,
    description: 'Copo de 400ml de puro açaí cremoso montado em camadas com banana fresca, morangos, leite em pó, leite condensado e granola crocante.',
  },
  // ── 23. Pudim Brasileiro
  {
    slug: 'pudim-brasileiro',
    name: 'Pudim Brasileiro',
    category: 'sobremesas',
    priceCents: 300,
    image: '/img/items/23.png',
    description: 'Pudim tradicional brasileiro de leite condensado com textura suave e calda caramelizada dourada.',
  },
  // ── 24. Salgados
  {
    slug: 'salgados',
    name: 'Salgados Artesanais',
    category: 'caldos-salgados',
    priceCents: 300,
    image: '/img/items/24.png',
    description: 'Salgados brasileiros tradicionais feitos na hora, massa sequinha e recheio farto.',
    optionGroups: [
      {
        name: 'Escolha o Salgado',
        required: true,
        multiple: false,
        sort: 1,
        options: [
          { name: 'Coxinha de Frango — 3,00 €', priceCents: 0, sort: 1 },
          { name: 'Enrolado de Fiambre e Queijo — 3,00 €', priceCents: 0, sort: 2 },
          { name: 'Enrolado de Salsicha — 3,00 €', priceCents: 0, sort: 3 },
          { name: 'Empada de Frango — 3,00 €', priceCents: 0, sort: 4 },
        ],
      },
    ],
  },
  // ── 25. Hot Dogs
  {
    slug: 'hot-dogs',
    name: 'Hot Dogs Tradicionais',
    category: 'hot-dogs',
    priceCents: 600,
    image: '/img/items/25.png',
    isFeatured: true,
    description: 'Cachorro-quente prensado no pão fofo com molho artesanal de tomate, milho, batata palha fininha e adicionais.',
    optionGroups: [
      {
        name: 'Escolha o Tipo de Hot Dog',
        required: true,
        multiple: false,
        sort: 1,
        options: [
          { name: 'Trem Dog Simples (pão, queijo, molho, salsicha, milho e batata palha) — 6,00 €', priceCents: 0, sort: 1 },
          { name: 'Trem Dog Especial (pão, queijo, molho, 2 salsichas, milho, bacon e batata palha) — 7,50 €', priceCents: 150, sort: 2 },
          { name: 'Trem Dog Frango (pão, queijo, molho, salsicha, milho, frango desfiado e batata palha) — 8,50 €', priceCents: 250, sort: 3 },
        ],
      },
    ],
  },
  // ── Bebidas
  {
    slug: 'coca-cola-normal-33cl',
    name: 'Coca-Cola Normal (33cl)',
    category: 'bebidas',
    priceCents: 200,
    image: '/img/items/coca-cola-normal.png',
    description: 'Refrigerante Coca-Cola em lata 33cl servida bem fresca.',
  },
  {
    slug: 'coca-cola-sem-acucar-33cl',
    name: 'Coca-Cola Sem Açúcar (33cl)',
    category: 'bebidas',
    priceCents: 200,
    image: '/img/items/coca-cola-sem-acucar.png',
    description: 'Refrigerante Coca-Cola Zero sem açúcar em lata 33cl.',
  },
  {
    slug: 'guarana-antarctica-33cl',
    name: 'Guaraná Antarctica (33cl)',
    category: 'bebidas',
    priceCents: 220,
    image: '/img/items/guarana-antarctica.png',
    description: 'Original do Brasil, refrigerante Guaraná Antarctica em lata 33cl.',
  },
  {
    slug: 'agua-mineral-50cl',
    name: 'Água Mineral (50cl)',
    category: 'bebidas',
    priceCents: 150,
    image: '/img/items/agua-mineral.png',
    description: 'Garrafa de água mineral natural 50cl.',
  },
  {
    slug: 'cerveja-super-bock-33cl',
    name: 'Cerveja Super Bock (33cl)',
    category: 'bebidas',
    priceCents: 220,
    image: '/img/items/super-bock.png',
    description: 'Cerveja lager portuguesa Super Bock fresca em garrafa 33cl.',
  },
  {
    slug: 'cerveja-sagres-33cl',
    name: 'Cerveja Sagres (33cl)',
    category: 'bebidas',
    priceCents: 220,
    image: '/img/items/sagres.png',
    description: 'Cerveja lager portuguesa Sagres fresca em garrafa 33cl.',
  },
  {
    slug: 'cerveja-heineken-33cl',
    name: 'Cerveja Heineken (33cl)',
    category: 'bebidas',
    priceCents: 280,
    image: '/img/items/heineken.png',
    description: 'Cerveja lager Heineken fresca em garrafa 33cl.',
  },
];

async function main() {
  console.log('Iniciando Seed do cardápio Trem Food…');

  for (const c of categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: c,
      create: c,
    });
  }

  const cats = await prisma.category.findMany();
  const bySlug = Object.fromEntries(cats.map((c) => [c.slug, c.id]));

  for (const [i, p] of products.entries()) {
    const { category, optionGroups, ...data } = p;
    const categoryId = bySlug[category];
    if (!categoryId) {
      console.warn(`Categoria não encontrada para: ${category}`);
      continue;
    }

    const payload = {
      ...data,
      sort: i + 1,
      categoryId,
      available: true,
    };

    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: payload,
      create: payload,
    });

    // Se existirem optionGroups no produto, configurar no banco
    if (optionGroups && optionGroups.length > 0) {
      // Limpar optionGroups existentes para atualizar de forma limpa
      await prisma.optionGroup.deleteMany({
        where: { productId: product.id },
      });

      for (const [gIdx, group] of optionGroups.entries()) {
        const createdGroup = await prisma.optionGroup.create({
          data: {
            productId: product.id,
            name: group.name,
            required: group.required,
            multiple: group.multiple,
            maxSelect: group.maxSelect,
            sort: group.sort ?? gIdx + 1,
          },
        });

        for (const [oIdx, opt] of group.options.entries()) {
          await prisma.optionItem.create({
            data: {
              groupId: createdGroup.id,
              name: opt.name,
              priceCents: opt.priceCents,
              available: true,
              sort: opt.sort ?? oIdx + 1,
            },
          });
        }
      }
    }
  }

  // Desativar artigos legados que não estão no novo cardápio
  const activeSlugs = products.map((p) => p.slug);
  await prisma.product.updateMany({
    where: { slug: { notIn: activeSlugs } },
    data: { available: false },
  });

  await prisma.counter.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, value: 0 },
  });

  const email = process.env.ADMIN_EMAIL || 'admin@tremfood.pt';
  const password = process.env.ADMIN_PASSWORD || 'TrocarAdmin2026';
  const hash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    update: { role: 'ADMIN' },
    create: {
      name: 'Administração Trem Food',
      email,
      passwordHash: hash,
      role: 'ADMIN',
      emailVerifiedAt: new Date(),
    },
  });

  console.log(`Seed concluído com sucesso! ${products.length} produtos adicionados.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
