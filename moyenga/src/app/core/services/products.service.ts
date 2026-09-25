import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginatedResponse } from '../models/pagination.model';
import {
  AddProductImagePayload,
  ApiProduct,
  CreateProductPayload,
  Product,
  ProductFilter,
  ProductImage,
  UpdateProductPayload,
  UpdateStockPayload,
} from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/products`;

  findAllPublic(filter: ProductFilter = {}): Observable<PaginatedResponse<Product>> {
    return this.http
      .get<PaginatedResponse<ApiProduct>>(this.apiUrl, { params: this.buildParams(filter) })
      .pipe(map((response) => this.mapPaginated(response)));
  }

  findOnePublic(idOrSlug: string): Observable<Product> {
    return this.http
      .get<ApiProduct>(`${this.apiUrl}/${idOrSlug}`)
      .pipe(map((product) => this.mapProduct(product)));
  }

  findAllAdmin(filter: ProductFilter = {}): Observable<PaginatedResponse<Product>> {
    return this.http
      .get<PaginatedResponse<ApiProduct>>(`${this.apiUrl}/admin/all`, {
        params: this.buildParams(filter),
      })
      .pipe(map((response) => this.mapPaginated(response)));
  }

  findOneAdmin(idOrSlug: string): Observable<Product> {
    return this.http
      .get<ApiProduct>(`${this.apiUrl}/admin/${idOrSlug}`)
      .pipe(map((product) => this.mapProduct(product)));
  }

  create(dto: CreateProductPayload): Observable<Product> {
    return this.http.post<ApiProduct>(this.apiUrl, dto).pipe(map((p) => this.mapProduct(p)));
  }

  update(id: string, dto: UpdateProductPayload): Observable<Product> {
    return this.http
      .patch<ApiProduct>(`${this.apiUrl}/${id}`, dto)
      .pipe(map((p) => this.mapProduct(p)));
  }

  remove(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  updateStock(id: string, dto: UpdateStockPayload): Observable<Product> {
    return this.http
      .patch<ApiProduct>(`${this.apiUrl}/${id}/stock`, dto)
      .pipe(map((p) => this.mapProduct(p)));
  }

  addImage(productId: string, dto: AddProductImagePayload): Observable<ProductImage> {
    return this.http.post<ProductImage>(`${this.apiUrl}/${productId}/images`, dto);
  }

  removeImage(productId: string, imageId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${productId}/images/${imageId}`);
  }

  private buildParams(filter: ProductFilter): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filter)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return params;
  }

  private mapPaginated(response: PaginatedResponse<ApiProduct>): PaginatedResponse<Product> {
    return {
      ...response,
      data: response.data.map((product) => this.mapProduct(product)),
    };
  }

  private mapProduct(product: ApiProduct): Product {
    return { ...product, price: Number(product.price) };
  }
}
