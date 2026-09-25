import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '../../src/generated/prisma/client.js';
import * as bcrypt from 'bcryptjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Slugify minimal, sans dépendance externe (aligné sur le style du service)
function slugify(value: string): string {
  return value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

async function main() {
  console.log('Démarrage du seed...');

  // ------------------------------------------------------------------
  // 1. Premier SUPERADMIN (impossible à créer via l'API, poule et œuf)
  // ------------------------------------------------------------------
  const superadminEmail =
    process.env.SEED_SUPERADMIN_EMAIL || 'superadmin@moyenga.com';
  const superadminPassword =
    process.env.SEED_SUPERADMIN_PASSWORD || 'ChangeMe123!';

  const existingSuperadmin = await prisma.user.findUnique({
    where: { email: superadminEmail },
  });

  if (existingSuperadmin) {
    console.log(`Le superadmin ${superadminEmail} existe déjà - étape ignorée.`);
  } else {
    const hashedPassword = await bcrypt.hash(superadminPassword, 10);
    await prisma.user.create({
      data: {
        email: superadminEmail,
        password: hashedPassword,
        firstName: 'Super',
        lastName: 'Admin',
        role: Role.SUPERADMIN,
        isEmailVerified: true,
      },
    });
    console.log(`Superadmin créé : ${superadminEmail} / ${superadminPassword}`);
    console.log('⚠️  Change ce mot de passe dès la première connexion.');
  }

  // ------------------------------------------------------------------
  // 2. Utilisateurs de test (admin, gestionnaire, clients)
  // ------------------------------------------------------------------
  const testUsers = [
    {
      email: 'admin@moyenga.com',
      password: 'Admin123!',
      firstName: 'Aminata',
      lastName: 'Ouedraogo',
      role: Role.ADMIN,
    },
    {
      email: 'gestionnaire@moyenga.com',
      password: 'Gestion123!',
      firstName: 'Boureima',
      lastName: 'Sawadogo',
      role: Role.GESTIONNAIRE,
    },
    {
      email: 'client1@moyenga.com',
      password: 'Client123!',
      firstName: 'Fatimata',
      lastName: 'Kabore',
      role: Role.CLIENT,
      phone: '+22670000001',
    },
    {
      email: 'client2@moyenga.com',
      password: 'Client123!',
      firstName: 'Issouf',
      lastName: 'Zongo',
      role: Role.CLIENT,
      phone: '+22670000002',
    },
  ];

  for (const u of testUsers) {
    const exists = await prisma.user.findUnique({ where: { email: u.email } });
    if (exists) continue;

    const hashedPassword = await bcrypt.hash(u.password, 10);
    await prisma.user.create({
      data: {
        email: u.email,
        phone: u.phone,
        password: hashedPassword,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        isEmailVerified: true,
      },
    });
  }
  console.log(`${testUsers.length} utilisateurs de test vérifiés/créés.`);

  // ------------------------------------------------------------------
  // 3. Catégories de base
  // ------------------------------------------------------------------
  const categories = [
    { name: 'Alimentation', slug: 'alimentation' },
    { name: 'Électronique', slug: 'electronique' },
    { name: 'Mode & Vêtements', slug: 'mode-vetements' },
    { name: 'Maison & Jardin', slug: 'maison-jardin' },
    { name: 'Beauté & Bien-être', slug: 'beaute-bien-etre' },
  ];

  const categoryMap: Record<string, string> = {};
  for (const category of categories) {
    const created = await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
    categoryMap[category.slug] = created.id;
  }
  console.log(`${categories.length} catégories de base vérifiées/créées.`);

  // ------------------------------------------------------------------
  // 4. Produits de démonstration
  // ------------------------------------------------------------------
  const products = [
    {
      name: 'Riz parfumé 25kg',
      slug: 'riz-parfume-25kg',
      description: 'Sac de riz parfumé de qualité supérieure, 25kg.',
      price: 22500,
      stock: 150,
      categorySlug: 'alimentation',
      images: ['https://picsum.photos/seed/riz25kg/600/600'],
    },
    {
      name: 'Huile végétale 5L',
      slug: 'huile-vegetale-5l',
      description: "Bidon d'huile végétale raffinée, 5 litres.",
      price: 8500,
      stock: 200,
      categorySlug: 'alimentation',
      images: ['https://picsum.photos/seed/huile5l/600/600'],
    },
    {
      name: 'Smartphone Android 128Go',
      slug: 'smartphone-android-128go',
      description: 'Smartphone double SIM, 128Go de stockage, écran 6.5".',
      price: 89000,
      stock: 40,
      categorySlug: 'electronique',
      images: [
        'https://picsum.photos/seed/phone1/600/600',
        'https://picsum.photos/seed/phone2/600/600',
      ],
    },
    {
      name: 'Écouteurs sans fil',
      slug: 'ecouteurs-sans-fil',
      description: 'Écouteurs Bluetooth avec étui de charge.',
      price: 12000,
      stock: 80,
      categorySlug: 'electronique',
      images: ['https://picsum.photos/seed/earbuds/600/600'],
    },
    {
      name: 'Boubou homme brodé',
      slug: 'boubou-homme-brode',
      description: 'Boubou traditionnel brodé, coupe moderne.',
      price: 25000,
      stock: 30,
      categorySlug: 'mode-vetements',
      images: ['https://picsum.photos/seed/boubou/600/600'],
    },
    {
      name: 'Sandales en cuir',
      slug: 'sandales-en-cuir',
      description: 'Sandales artisanales en cuir véritable.',
      price: 9000,
      stock: 60,
      categorySlug: 'mode-vetements',
      images: ['https://picsum.photos/seed/sandales/600/600'],
    },
    {
      name: 'Set de casseroles inox',
      slug: 'set-casseroles-inox',
      description: 'Set de 5 casseroles en inox avec couvercles.',
      price: 32000,
      stock: 25,
      categorySlug: 'maison-jardin',
      images: ['https://picsum.photos/seed/casseroles/600/600'],
    },
    {
      name: 'Ventilateur sur pied',
      slug: 'ventilateur-sur-pied',
      description: 'Ventilateur sur pied, 3 vitesses, oscillant.',
      price: 27500,
      stock: 45,
      categorySlug: 'maison-jardin',
      images: ['https://picsum.photos/seed/ventilateur/600/600'],
    },
    {
      name: 'Crème hydratante karité',
      slug: 'creme-hydratante-karite',
      description: 'Crème hydratante au beurre de karité pur, 250ml.',
      price: 4500,
      stock: 120,
      categorySlug: 'beaute-bien-etre',
      images: ['https://picsum.photos/seed/karite/600/600'],
    },
    {
      name: 'Savon noir traditionnel',
      slug: 'savon-noir-traditionnel',
      description: 'Savon noir africain artisanal, 500g.',
      price: 2500,
      stock: 200,
      categorySlug: 'beaute-bien-etre',
      images: ['https://picsum.photos/seed/savonnoir/600/600'],
    },
  ];

  for (const p of products) {
    const categoryId = categoryMap[p.categorySlug];
    if (!categoryId) continue;

    const slug = slugify(p.slug);
    const existingProduct = await prisma.product.findUnique({ where: { slug } });
    if (existingProduct) continue;

    await prisma.product.create({
      data: {
        name: p.name,
        slug,
        description: p.description,
        price: p.price,
        stock: p.stock,
        categoryId,
        isActive: true,
        images: {
          create: p.images.map((url, index) => ({ url, position: index })),
        },
      },
    });
  }
  console.log(`${products.length} produits de démonstration vérifiés/créés.`);

  console.log('Seed terminé.');
}

main()
  .catch((e) => {
    console.error('Erreur pendant le seed :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });