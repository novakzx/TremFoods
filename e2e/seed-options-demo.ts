// Grupos de adicionais de demonstração para testes/screenshots locais (BD local apenas).
// Idempotente: substitui os grupos do produto alvo.
import { prisma } from '../src/infra/db';

(async () => {
  const product = await prisma.product.findUnique({ where: { slug: 'double-smash-classico' } });
  if (!product) {
    console.error('Produto double-smash-classico não encontrado');
    process.exit(1);
  }

  await prisma.optionItem.deleteMany({ where: { group: { productId: product.id } } });
  await prisma.optionGroup.deleteMany({ where: { productId: product.id } });

  const taste = await prisma.optionGroup.create({
    data: {
      productId: product.id,
      name: 'Ponto da carne',
      required: true,
      multiple: false,
      maxSelect: null,
      sort: 0,
      options: {
        create: [
          { name: 'Malpassado', priceCents: 0, available: true, sort: 0 },
          { name: 'Médio', priceCents: 0, available: true, sort: 1 },
          { name: 'Bem passado', priceCents: 0, available: true, sort: 2 },
        ],
      },
    },
  });

  const extras = await prisma.optionGroup.create({
    data: {
      productId: product.id,
      name: 'Extras',
      required: false,
      multiple: true,
      maxSelect: 3,
      sort: 1,
      options: {
        create: [
          { name: 'Ovo', priceCents: 80, available: true, sort: 0 },
          { name: 'Bacon', priceCents: 100, available: true, sort: 1 },
          { name: 'Cheddar', priceCents: 90, available: true, sort: 2 },
          { name: 'Molho barbecue', priceCents: 50, available: false, sort: 3 },
        ],
      },
    },
  });

  console.log(`Grupos criados no '${product.name}': ${taste.name} (obrigatório) + ${extras.name} (múltipla, máx. 3)`);
  await prisma.$disconnect();
})();
