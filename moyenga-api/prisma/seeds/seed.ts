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
  // 3. Catégories + sous-catégories
  // ------------------------------------------------------------------
  type SubcategorySeed = { name: string; slug: string };
  type CategorySeed = {
    name: string;
    slug: string;
    subcategories: SubcategorySeed[];
  };

  const categoryTree: CategorySeed[] = [
    {
      name: 'Alimentation',
      slug: 'alimentation',
      subcategories: [
        { name: 'Céréales & Riz', slug: 'cereales-riz' },
        { name: 'Huiles & Condiments', slug: 'huiles-condiments' },
        { name: 'Boissons', slug: 'boissons' },
        { name: 'Conserves & Épicerie', slug: 'conserves-epicerie' },
      ],
    },
    {
      name: 'Électronique',
      slug: 'electronique',
      subcategories: [
        { name: 'Téléphones & Accessoires', slug: 'telephones-accessoires' },
        { name: 'Informatique', slug: 'informatique' },
        { name: 'Audio & Vidéo', slug: 'audio-video' },
        { name: 'Gadgets & Accessoires', slug: 'gadgets-accessoires' },
      ],
    },
    {
      name: 'Mode & Vêtements',
      slug: 'mode-vetements',
      subcategories: [
        { name: 'Homme', slug: 'homme' },
        { name: 'Femme', slug: 'femme' },
        { name: 'Enfant', slug: 'enfant' },
        { name: 'Chaussures', slug: 'chaussures' },
      ],
    },
    {
      name: 'Maison & Jardin',
      slug: 'maison-jardin',
      subcategories: [
        { name: 'Cuisine', slug: 'cuisine' },
        { name: 'Décoration', slug: 'decoration' },
        { name: 'Jardin & Extérieur', slug: 'jardin-exterieur' },
        { name: 'Électroménager', slug: 'electromenager-maison' },
      ],
    },
    {
      name: 'Beauté & Bien-être',
      slug: 'beaute-bien-etre',
      subcategories: [
        { name: 'Soins visage', slug: 'soins-visage' },
        { name: 'Soins corps', slug: 'soins-corps' },
        { name: 'Parfums', slug: 'parfums' },
        { name: 'Hygiène', slug: 'hygiene' },
      ],
    },
  ];

  // slug (parent ou sous-catégorie) -> id, utilisé pour rattacher les produits
  const categoryIdBySlug: Record<string, string> = {};
  let subcategoryCount = 0;

  for (const cat of categoryTree) {
    const parent = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: { name: cat.name, slug: cat.slug },
    });
    categoryIdBySlug[cat.slug] = parent.id;

    for (const sub of cat.subcategories) {
      const child = await prisma.category.upsert({
        where: { slug: sub.slug },
        update: { parentId: parent.id },
        create: { name: sub.name, slug: sub.slug, parentId: parent.id },
      });
      categoryIdBySlug[sub.slug] = child.id;
      subcategoryCount += 1;
    }
  }
  console.log(
    `${categoryTree.length} catégories principales et ${subcategoryCount} sous-catégories vérifiées/créées.`,
  );

  // ------------------------------------------------------------------
  // 4. Produits de démonstration (rattachés aux sous-catégories)
  // ------------------------------------------------------------------
  const products = [
    // ---- Céréales & Riz ----
    { name: 'Riz parfumé 25kg', price: 22500, stock: 150, categorySlug: 'cereales-riz', seed: 'riz25kg' },
    { name: 'Riz brisé local 50kg', price: 32000, stock: 90, categorySlug: 'cereales-riz', seed: 'rizbrise50kg' },
    { name: 'Mil 25kg', price: 13500, stock: 100, categorySlug: 'cereales-riz', seed: 'mil25kg' },
    { name: 'Maïs 25kg', price: 12000, stock: 110, categorySlug: 'cereales-riz', seed: 'mais25kg' },

    // ---- Huiles & Condiments ----
    { name: 'Huile végétale 5L', price: 8500, stock: 200, categorySlug: 'huiles-condiments', seed: 'huile5l' },
    { name: "Huile d'arachide 1L", price: 2200, stock: 180, categorySlug: 'huiles-condiments', seed: 'huilearachide1l' },
    { name: 'Cubes Maggi (boîte de 50)', price: 3500, stock: 300, categorySlug: 'huiles-condiments', seed: 'maggi50' },
    { name: 'Sel de cuisine 1kg', price: 500, stock: 400, categorySlug: 'huiles-condiments', seed: 'sel1kg' },

    // ---- Boissons ----
    { name: 'Jus de bissap 1L', price: 1500, stock: 150, categorySlug: 'boissons', seed: 'bissap1l' },
    { name: 'Café soluble 200g', price: 3200, stock: 120, categorySlug: 'boissons', seed: 'cafe200g' },
    { name: 'Thé vert (paquet)', price: 1800, stock: 130, categorySlug: 'boissons', seed: 'thevert' },
    { name: "Eau minérale (pack de 12)", price: 3000, stock: 250, categorySlug: 'boissons', seed: 'eaupack12' },

    // ---- Conserves & Épicerie ----
    { name: 'Concentré de tomate (boîte)', price: 800, stock: 350, categorySlug: 'conserves-epicerie', seed: 'tomateconcentre' },
    { name: 'Sardines à l\'huile (boîte)', price: 1200, stock: 220, categorySlug: 'conserves-epicerie', seed: 'sardines' },
    { name: 'Pâtes alimentaires 1kg', price: 900, stock: 260, categorySlug: 'conserves-epicerie', seed: 'pates1kg' },
    { name: 'Farine de blé 5kg', price: 4500, stock: 140, categorySlug: 'conserves-epicerie', seed: 'farine5kg' },

    // ---- Téléphones & Accessoires ----
    { name: 'Smartphone Android 128Go', price: 89000, stock: 40, categorySlug: 'telephones-accessoires', seed: 'phone128', images: 2 },
    { name: 'Smartphone Android 64Go', price: 65000, stock: 55, categorySlug: 'telephones-accessoires', seed: 'phone64', images: 2 },
    { name: 'Chargeur rapide USB-C', price: 5500, stock: 150, categorySlug: 'telephones-accessoires', seed: 'chargeurusbc' },
    { name: 'Coque de protection universelle', price: 2500, stock: 200, categorySlug: 'telephones-accessoires', seed: 'coque' },

    // ---- Informatique ----
    { name: 'Ordinateur portable 15"', price: 275000, stock: 20, categorySlug: 'informatique', seed: 'laptop15', images: 2 },
    { name: 'Clé USB 64Go', price: 4500, stock: 180, categorySlug: 'informatique', seed: 'usb64go' },
    { name: 'Souris sans fil', price: 6500, stock: 100, categorySlug: 'informatique', seed: 'sourissansfil' },
    { name: 'Disque dur externe 1To', price: 45000, stock: 35, categorySlug: 'informatique', seed: 'hdd1to' },

    // ---- Audio & Vidéo ----
    { name: 'Écouteurs sans fil', price: 12000, stock: 80, categorySlug: 'audio-video', seed: 'earbuds' },
    { name: 'Enceinte Bluetooth portable', price: 18500, stock: 60, categorySlug: 'audio-video', seed: 'enceintebt' },
    { name: 'Casque audio filaire', price: 7000, stock: 90, categorySlug: 'audio-video', seed: 'casqueaudio' },
    { name: 'Télévision LED 32"', price: 95000, stock: 25, categorySlug: 'audio-video', seed: 'tvled32', images: 2 },

    // ---- Gadgets & Accessoires ----
    { name: 'Powerbank 20000mAh', price: 9500, stock: 120, categorySlug: 'gadgets-accessoires', seed: 'powerbank20000' },
    { name: 'Lampe torche rechargeable', price: 3500, stock: 140, categorySlug: 'gadgets-accessoires', seed: 'lampetorche' },
    { name: 'Multiprise parafoudre', price: 6000, stock: 100, categorySlug: 'gadgets-accessoires', seed: 'multiprise' },
    { name: 'Adaptateur universel', price: 3000, stock: 160, categorySlug: 'gadgets-accessoires', seed: 'adaptateur' },

    // ---- Homme ----
    { name: 'Boubou homme brodé', price: 25000, stock: 30, categorySlug: 'homme', seed: 'boubou' },
    { name: 'Chemise homme manches longues', price: 8500, stock: 70, categorySlug: 'homme', seed: 'chemisehomme' },
    { name: 'Pantalon jean homme', price: 12000, stock: 60, categorySlug: 'homme', seed: 'jeanhomme' },
    { name: 'Costume homme 2 pièces', price: 45000, stock: 20, categorySlug: 'homme', seed: 'costumehomme', images: 2 },

    // ---- Femme ----
    { name: 'Robe pagne wax', price: 18000, stock: 40, categorySlug: 'femme', seed: 'robewax' },
    { name: 'Ensemble tailleur femme', price: 27000, stock: 25, categorySlug: 'femme', seed: 'tailleurfemme' },
    { name: 'Foulard en soie', price: 6000, stock: 90, categorySlug: 'femme', seed: 'foulardsoie' },
    { name: 'Sac à main femme', price: 15000, stock: 55, categorySlug: 'femme', seed: 'sacamain' },

    // ---- Enfant ----
    { name: 'Ensemble enfant garçon', price: 7500, stock: 65, categorySlug: 'enfant', seed: 'ensemblegarcon' },
    { name: 'Robe fillette', price: 6500, stock: 60, categorySlug: 'enfant', seed: 'robefillette' },
    { name: 'Chaussures enfant', price: 5500, stock: 80, categorySlug: 'enfant', seed: 'chaussuresenfant' },
    { name: 'Pyjama enfant', price: 4000, stock: 100, categorySlug: 'enfant', seed: 'pyjamaenfant' },

    // ---- Chaussures ----
    { name: 'Sandales en cuir', price: 9000, stock: 60, categorySlug: 'chaussures', seed: 'sandales' },
    { name: 'Baskets homme', price: 16000, stock: 45, categorySlug: 'chaussures', seed: 'basketshomme' },
    { name: 'Escarpins femme', price: 14000, stock: 40, categorySlug: 'chaussures', seed: 'escarpins' },
    { name: 'Chaussures de sécurité', price: 22000, stock: 35, categorySlug: 'chaussures', seed: 'chaussuressecu' },

    // ---- Cuisine ----
    { name: 'Set de casseroles inox', price: 32000, stock: 25, categorySlug: 'cuisine', seed: 'casseroles', images: 2 },
    { name: 'Service à thé', price: 8500, stock: 40, categorySlug: 'cuisine', seed: 'servicethe' },
    { name: 'Mixeur électrique', price: 18000, stock: 30, categorySlug: 'cuisine', seed: 'mixeur' },
    { name: 'Réfrigérateur 150L', price: 165000, stock: 15, categorySlug: 'cuisine', seed: 'frigo150l', images: 2 },

    // ---- Décoration ----
    { name: 'Tapis salon 2x3m', price: 22000, stock: 30, categorySlug: 'decoration', seed: 'tapissalon' },
    { name: 'Rideaux (paire)', price: 9500, stock: 50, categorySlug: 'decoration', seed: 'rideaux' },
    { name: 'Lampe de chevet', price: 6500, stock: 60, categorySlug: 'decoration', seed: 'lampechevet' },
    { name: 'Miroir décoratif', price: 11000, stock: 40, categorySlug: 'decoration', seed: 'miroir' },

    // ---- Jardin & Extérieur ----
    { name: 'Tondeuse à gazon manuelle', price: 28000, stock: 20, categorySlug: 'jardin-exterieur', seed: 'tondeuse' },
    { name: "Kit d'arrosage", price: 7500, stock: 55, categorySlug: 'jardin-exterieur', seed: 'kitarrosage' },
    { name: 'Chaise de jardin pliable', price: 9000, stock: 70, categorySlug: 'jardin-exterieur', seed: 'chaisejardin' },
    { name: 'Parasol de jardin', price: 21000, stock: 25, categorySlug: 'jardin-exterieur', seed: 'parasol' },

    // ---- Électroménager (maison) ----
    { name: 'Ventilateur sur pied', price: 27500, stock: 45, categorySlug: 'electromenager-maison', seed: 'ventilateur' },
    { name: 'Climatiseur split 1CV', price: 285000, stock: 12, categorySlug: 'electromenager-maison', seed: 'clim1cv', images: 2 },
    { name: 'Fer à repasser', price: 9500, stock: 65, categorySlug: 'electromenager-maison', seed: 'fer' },
    { name: 'Bouilloire électrique', price: 8500, stock: 70, categorySlug: 'electromenager-maison', seed: 'bouilloire' },

    // ---- Soins visage ----
    { name: 'Crème hydratante karité', price: 4500, stock: 120, categorySlug: 'soins-visage', seed: 'karite' },
    { name: 'Nettoyant visage', price: 3800, stock: 100, categorySlug: 'soins-visage', seed: 'nettoyantvisage' },
    { name: 'Sérum anti-âge', price: 12500, stock: 40, categorySlug: 'soins-visage', seed: 'serumantiage' },
    { name: 'Masque purifiant', price: 3200, stock: 90, categorySlug: 'soins-visage', seed: 'masquepurifiant' },

    // ---- Soins corps ----
    { name: 'Savon noir traditionnel', price: 2500, stock: 200, categorySlug: 'soins-corps', seed: 'savonnoir' },
    { name: 'Lait corporel karité', price: 4000, stock: 110, categorySlug: 'soins-corps', seed: 'laitcorporel' },
    { name: 'Gommage corps', price: 5500, stock: 80, categorySlug: 'soins-corps', seed: 'gommage' },
    { name: 'Huile de coco pure', price: 3500, stock: 95, categorySlug: 'soins-corps', seed: 'huilecoco' },

    // ---- Parfums ----
    { name: 'Parfum homme 100ml', price: 15000, stock: 50, categorySlug: 'parfums', seed: 'parfumhomme' },
    { name: 'Parfum femme 100ml', price: 16500, stock: 50, categorySlug: 'parfums', seed: 'parfumfemme' },
    { name: 'Déodorant roll-on', price: 1800, stock: 180, categorySlug: 'parfums', seed: 'deodorant' },
    { name: 'Eau de toilette unisexe', price: 12000, stock: 45, categorySlug: 'parfums', seed: 'eaudetoilette' },

    // ---- Hygiène ----
    { name: 'Gel douche 500ml', price: 2500, stock: 150, categorySlug: 'hygiene', seed: 'geldouche' },
    { name: 'Dentifrice (pack de 3)', price: 2000, stock: 170, categorySlug: 'hygiene', seed: 'dentifrice' },
    { name: 'Shampoing 400ml', price: 3200, stock: 130, categorySlug: 'hygiene', seed: 'shampoing' },
    { name: 'Brosse à dents électrique', price: 9500, stock: 60, categorySlug: 'hygiene', seed: 'brosseelectrique' },
  ];

  let createdCount = 0;
  for (const p of products) {
    const categoryId = categoryIdBySlug[p.categorySlug];
    if (!categoryId) {
      console.warn(`Sous-catégorie inconnue "${p.categorySlug}" - produit "${p.name}" ignoré.`);
      continue;
    }

    const slug = slugify(p.name);
    const existingProduct = await prisma.product.findUnique({ where: { slug } });
    if (existingProduct) continue;

    const imageCount = p.images ?? 1;
    const images = Array.from({ length: imageCount }, (_, i) =>
      `https://picsum.photos/seed/${p.seed}${i > 0 ? i : ''}/600/600`,
    );

    await prisma.product.create({
      data: {
        name: p.name,
        slug,
        description: `${p.name} - produit de qualité, disponible chez Moyenga.`,
        price: p.price,
        stock: p.stock,
        categoryId,
        isActive: true,
        images: {
          create: images.map((url, index) => ({ url, position: index })),
        },
      },
    });
    createdCount += 1;
  }
  console.log(`${createdCount}/${products.length} produits de démonstration créés (les autres existaient déjà).`);

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