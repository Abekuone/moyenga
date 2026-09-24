import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '../../src/generated/prisma/client.js';
import * as bcrypt from 'bcryptjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

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
    console.log(`Le superadmin ${superadminEmail} existe déjà — étape ignorée.`);
  } else {
    const hashedPassword = await bcrypt.hash(superadminPassword, 10);
    await prisma.user.create({
      data: {
        email: superadminEmail,
        password: hashedPassword,
        firstName: 'Super',
        lastName: 'Admin',
        role: Role.SUPERADMIN,
        isEmailVerified: true, // pas de vérification pour le compte de départ
      },
    });
    console.log(`Superadmin créé : ${superadminEmail} / ${superadminPassword}`);
    console.log('⚠️  Change ce mot de passe dès la première connexion.');
  }

  // ------------------------------------------------------------------
  // 2. Catégories de base
  // ------------------------------------------------------------------
  const categories = [
    { name: 'Alimentation', slug: 'alimentation' },
    { name: 'Électronique', slug: 'electronique' },
    { name: 'Mode & Vêtements', slug: 'mode-vetements' },
    { name: 'Maison & Jardin', slug: 'maison-jardin' },
    { name: 'Beauté & Bien-être', slug: 'beaute-bien-etre' },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
  }
  console.log(`${categories.length} catégories de base vérifiées/créées.`);

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
