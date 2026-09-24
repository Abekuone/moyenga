import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Récupère l'utilisateur attaché à la requête par le JwtAuthGuard.
 * Usage: @CurrentUser() user  → objet complet
 *        @CurrentUser('id') userId  → un seul champ
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
