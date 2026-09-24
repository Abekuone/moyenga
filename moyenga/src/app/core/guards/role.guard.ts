import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { Role } from '../models/user.model';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const allowedRoles = route.data['roles'] as Role[] | undefined;

  const checkRole = (): boolean => {
    const user = authService.currentUser();
    if (!user) {
      router.navigate(['/auth/login']);
      return false;
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      router.navigate(['/']);
      return false;
    }
    return true;
  };

  // Utilisateur déjà chargé en mémoire (navigation classique dans l'app)
  if (authService.currentUser()) {
    return checkRole();
  }

  // Rechargement de page : on a un token mais pas encore le profil → on le récupère
  return authService.fetchCurrentUser().pipe(
    map(() => checkRole()),
    catchError(() => {
      router.navigate(['/auth/login']);
      return of(false);
    }),
  );
};
