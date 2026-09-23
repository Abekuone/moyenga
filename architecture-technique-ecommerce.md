# Document d'Architecture Technique — Plateforme E-commerce

**Stack** : Angular (Frontend) · NestJS (Backend) · PostgreSQL · Prisma (ORM)

---

## 1. Vue d'ensemble

```
┌─────────────────┐        HTTPS/REST (ou GraphQL)        ┌─────────────────┐
│  Angular SPA     │ ─────────────────────────────────────▶│  NestJS API     │
│  (Frontend)      │◀───────────────────────────────────── │  (Backend)      │
└─────────────────┘                                         └────────┬────────┘
                                                                      │ Prisma Client
                                                                      ▼
                                                             ┌─────────────────┐
                                                             │  PostgreSQL     │
                                                             └─────────────────┘
```

Architecture modulaire des deux côtés (feature-based), avec séparation claire entre code **transverse/réutilisable** (`core`, `shared`, `common`) et code **métier** (`features`/`modules`).

---

## 2. Frontend — Angular

### 2.1 Arborescence proposée

```
src/app/
├── core/
│   ├── guards/              # AuthGuard, RoleGuard, CartGuard...
│   ├── interceptors/        # auth.interceptor, error.interceptor, loading.interceptor
│   ├── services/            # AuthService, TokenService, StorageService
│   ├── models/               # interfaces/types globaux (User, ApiResponse...)
│   └── core.module.ts        # importé UNE SEULE FOIS dans AppModule
│
├── shared/
│   ├── components/           # ButtonComponent, ModalComponent, RatingStarsComponent...
│   ├── directives/
│   ├── pipes/                # currency-fcfa.pipe, truncate.pipe...
│   ├── validators/
│   └── shared.module.ts       # réutilisable partout, sans état
│
├── layouts/
│   ├── main-layout/           # header, footer, navbar → pages publiques/boutique
│   ├── auth-layout/            # layout épuré pour login/register
│   └── admin-layout/            # sidebar + topbar → back-office
│
├── features/
│   ├── catalog/                 # liste produits, détail produit, recherche, filtres
│   │   ├── pages/
│   │   ├── components/
│   │   ├── services/
│   │   └── catalog-routing.module.ts
│   ├── cart/                     # panier
│   ├── checkout/                  # tunnel de commande, paiement
│   ├── orders/                     # historique et suivi de commandes
│   ├── account/                     # profil, adresses, mot de passe
│   ├── auth/                         # login, register, forgot-password
│   ├── wishlist/
│   ├── reviews/
│   └── admin/                         # back-office (produits, stocks, commandes, users)
│       ├── products/
│       ├── orders/
│       ├── customers/
│       └── dashboard/
│
├── store/ (optionnel — NgRx / Signals Store)
│   ├── cart/
│   ├── auth/
│   └── catalog/
│
├── app-routing.module.ts        # routes principales + lazy loading des features
└── app.module.ts
```

### 2.2 Principes clés

- **`core`** : chargé une fois, contient tout ce qui est *singleton* (auth, intercepteurs HTTP, guards). Ne doit jamais être ré-importé dans un module enfant.
- **`shared`** : composants/pipes/directives **sans état métier**, réutilisables dans plusieurs features (ex. `StarRatingComponent` utilisé dans `catalog` et `reviews`).
- **`features`** : un module par domaine métier, chargé en **lazy loading** via `loadChildren` pour limiter le bundle initial.
- **`layouts`** : permet de servir un rendu différent selon le contexte (boutique publique vs back-office) sans dupliquer header/footer.
- État global : `Signals` (Angular 17+) pour un état léger, ou **NgRx** si la complexité (panier synchronisé, filtres persistés, back-office) le justifie.
- Communication API centralisée via des **services par feature** (`ProductService`, `OrderService`...) qui encapsulent les appels HTTP — jamais d'appel HTTP direct dans un composant.

---

## 3. Backend — NestJS

### 3.1 Arborescence proposée

```
src/
├── main.ts
├── app.module.ts
│
├── common/
│   ├── decorators/            # @CurrentUser(), @Roles()...
│   ├── filters/                 # HttpExceptionFilter, PrismaExceptionFilter
│   ├── guards/                    # JwtAuthGuard, RolesGuard
│   ├── interceptors/                # LoggingInterceptor, TransformInterceptor
│   ├── pipes/                         # ValidationPipe custom
│   └── dto/                             # PaginationDto, base response DTOs
│
├── config/
│   ├── configuration.ts           # variables d'env typées
│   ├── database.config.ts
│   └── validation.schema.ts        # Joi/Zod pour valider le .env
│
├── prisma/
│   ├── prisma.module.ts
│   ├── prisma.service.ts             # extends PrismaClient, hooks onModuleInit/Destroy
│   └── schema.prisma
│
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── strategies/            # jwt.strategy.ts, local.strategy.ts
│   │   └── dto/
│   │
│   ├── users/
│   ├── products/
│   │   ├── products.module.ts
│   │   ├── products.controller.ts
│   │   ├── products.service.ts
│   │   ├── dto/
│   │   └── entities/ (ou juste les types Prisma)
│   ├── categories/
│   ├── cart/
│   ├── orders/
│   ├── payments/                  # intégration passerelle (Orange Money, Stripe...)
│   ├── inventory/                  # gestion des stocks
│   ├── reviews/
│   ├── promotions/                  # coupons, réductions
│   ├── notifications/                # emails/SMS transactionnels
│   └── admin/                          # endpoints réservés au back-office
│
└── shared/
    ├── utils/
    ├── constants/
    └── interfaces/
```

### 3.2 Principes clés

- **Architecture modulaire par domaine** (Nest `Module`) : chaque module encapsule `controller` + `service` + `dto` + accès Prisma via injection du `PrismaService`.
- **`PrismaService`** centralisé dans un `PrismaModule` global (`@Global()`), injecté partout — un seul point d'accès à la base.
- **DTO + `class-validator`** systématiques pour valider les entrées (création produit, commande, etc.).
- **Guards + Strategies** (`Passport JWT`) pour l'authentification, avec un `RolesGuard` pour distinguer `CLIENT` / `ADMIN` / `VENDEUR` selon les besoins.
- **Filtres d'exception globaux** pour uniformiser le format des erreurs API.
- **Interceptors** pour logguer les requêtes et formatter les réponses (`{ data, meta }`).
- Séparation **lecture/écriture** possible plus tard (CQRS léger) si le catalogue devient volumineux.

---

## 4. Modèle de données (Prisma) — vue simplifiée

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  role      Role     @default(CLIENT)
  orders    Order[]
  reviews   Review[]
  createdAt DateTime @default(now())
}

model Category {
  id       String    @id @default(uuid())
  name     String
  products Product[]
}

model Product {
  id          String      @id @default(uuid())
  name        String
  slug        String      @unique
  price       Decimal
  stock       Int
  categoryId  String
  category    Category    @relation(fields: [categoryId], references: [id])
  images      ProductImage[]
  reviews     Review[]
  orderItems  OrderItem[]
}

model Order {
  id         String      @id @default(uuid())
  userId     String
  user       User        @relation(fields: [userId], references: [id])
  status     OrderStatus @default(PENDING)
  total      Decimal
  items      OrderItem[]
  payment    Payment?
  createdAt  DateTime    @default(now())
}

model OrderItem {
  id        String  @id @default(uuid())
  orderId   String
  productId String
  quantity  Int
  price     Decimal
  order     Order   @relation(fields: [orderId], references: [id])
  product   Product @relation(fields: [productId], references: [id])
}

model Payment {
  id        String        @id @default(uuid())
  orderId   String        @unique
  order     Order         @relation(fields: [orderId], references: [id])
  provider  String
  status    PaymentStatus @default(PENDING)
  amount    Decimal
}

enum Role {
  CLIENT
  ADMIN
  VENDEUR
}

enum OrderStatus {
  PENDING
  CONFIRMED
  SHIPPED
  DELIVERED
  CANCELLED
}

enum PaymentStatus {
  PENDING
  SUCCESS
  FAILED
}
```

> Ce schéma est un point de départ — à enrichir avec `Address`, `Wishlist`, `Coupon`, `ProductVariant` (tailles/couleurs) selon les besoins réels du catalogue.

---

## 5. Flux principaux

### 5.1 Parcours d'achat
1. `catalog` (Angular) liste les produits → appel `GET /products` (module `products`, Nest).
2. Ajout au panier → géré côté front (state local/store), synchronisé en base via `cart` si utilisateur connecté.
3. `checkout` → création de commande `POST /orders`, création du paiement `POST /payments`.
4. Le module `payments` appelle la passerelle externe, met à jour `Order.status` et `Payment.status`.
5. `notifications` envoie la confirmation (email/SMS).

### 5.2 Authentification
1. `auth/login` → `AuthService` (Nest) vérifie via `LocalStrategy`, émet un JWT.
2. Angular stocke le token (via `TokenService`, idéalement en cookie httpOnly si le back le permet).
3. `AuthInterceptor` (Angular) attache le token à chaque requête.
4. `JwtAuthGuard` + `RolesGuard` (Nest) protègent les routes sensibles (commandes, admin).

---

## 6. Points transverses à prévoir

| Sujet | Recommandation |
|---|---|
| Pagination | DTO commun `PaginationDto` (`page`, `limit`) côté Nest, réutilisé par tous les modules listant des ressources |
| Upload d'images produits | Module dédié (`uploads`) avec stockage S3-compatible ou local + CDN |
| Recherche produits | PostgreSQL full-text search au départ, migration possible vers Meilisearch/Elasticsearch si le catalogue grossit |
| Cache | Redis pour le cache produits/catégories très consultés |
| Tests | Jest (unitaires + e2e) côté Nest, Jasmine/Karma ou Jest côté Angular |
| CI/CD | Pipeline par app (frontend/backend), migrations Prisma automatisées en déploiement |
| Sécurité | Rate limiting (`@nestjs/throttler`), Helmet, validation stricte des DTO, CORS restreint |

---

## 7. Évolutivité

- Le découpage par **modules métier** (front et back) permet d'extraire facilement un module en microservice plus tard (ex. `payments`, `inventory`) si la charge l'exige.
- Le `shared`/`common` doit rester strictement sans dépendance vers les `features`/`modules` métier, pour éviter les couplages circulaires.
