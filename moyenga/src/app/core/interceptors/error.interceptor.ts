import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';

const REFRESH_EXEMPT_PATHS = ['/auth/login', '/auth/register', '/auth/refresh'];

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const tokenService = inject(TokenService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }

      const isApiCall = req.url.startsWith(environment.apiUrl);
      const isExempt = REFRESH_EXEMPT_PATHS.some((path) => req.url.includes(path));

      // 401 sur un appel API (hors login/register/refresh) → tente un refresh une fois
      if (error.status === 401 && isApiCall && !isExempt && tokenService.getRefreshToken()) {
        return authService.refreshTokens().pipe(
          switchMap(() => next(req)), // rejoue la requête d'origine avec le nouveau token
          catchError((refreshError) => {
            authService.logout();
            return throwError(() => refreshError);
          }),
        );
      }

      return throwError(() => error);
    }),
  );
};
