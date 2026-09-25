import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginatedResponse } from '../models/pagination.model';
import { Category } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/categories`;

  findAll(limit = 20): Observable<PaginatedResponse<Category>> {
    const params = new HttpParams().set('limit', limit);
    return this.http.get<PaginatedResponse<Category>>(this.apiUrl, { params });
  }
}
