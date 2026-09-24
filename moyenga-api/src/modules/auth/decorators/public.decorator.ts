import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marque une route comme publique (aucun token requis).
 * Utilisé par le JwtAuthGuard global pour laisser passer
 * les routes comme /auth/login, /auth/register, etc.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
