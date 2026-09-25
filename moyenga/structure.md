src/app/
├── core/               guards, intercepteurs, services, modèles - chargés une fois
├── layouts/            main (boutique), auth (login/register), admin (backoffice)
├── features/
│   ├── auth/           login + register fonctionnels, branchés sur ton API
│   ├── catalog/        stub - prochaine étape logique
│   ├── cart/           stub
│   ├── account/        stub
│   └── admin/          dashboard stub, protégé par roleGuard
├── app.routes.ts        assemble tout, lazy loading partout
├── app.config.ts         HttpClient + intercepteurs
└── app.component.ts