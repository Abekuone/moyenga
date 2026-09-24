import { SetMetadata } from '@nestjs/common';
import { Role } from '../../prisma/prisma-client.js';

export const ROLES_KEY = 'roles';

/**
 * Restreint une route à un ou plusieurs rôles.
 * Ex: @Roles(Role.SUPERADMIN, Role.ADMIN)
 * Si aucun rôle n'est précisé sur une route, le RolesGuard laisse passer
 * tout utilisateur authentifié.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
