import { Component, computed, HostListener, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../../core/services/cart.service';
import { CategoriesService } from '../../../core/services/categories.service';
import { Category } from '../../../core/models/product.model';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
  selector: 'app-main-layout',
  styleUrl: './main-layout.component.scss',
  templateUrl: './main-layout.component.html',
})
export class MainLayoutComponent {
  readonly authService = inject(AuthService);
  private readonly cartService = inject(CartService);
  private readonly categoriesService = inject(CategoriesService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly currentYear = new Date().getFullYear();
  readonly cartCount = this.cartService.itemCount;

  searchTerm = '';

  private lastScrollY = 0;
  readonly isHeaderHidden = signal(false);
  private readonly mobileBreakpoint = 860;
  private readonly scrollThreshold = 80;

  private readonly categoriesResponse = toSignal(
    this.categoriesService.findAll().pipe(
      catchError((error) => {
        console.error('Erreur lors du chargement des catégories', error);
        return of({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });
      }),
    ),
    { initialValue: undefined },
  );

  readonly categories = computed<Category[]>(() => this.categoriesResponse()?.data ?? []);
  private readonly queryParams = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('categoryId'))),
    { initialValue: null },
  );
  readonly activeCategoryId = computed(() => this.queryParams());

  onSearchSubmit(): void {
    const search = this.searchTerm.trim();
    this.router.navigate(['/'], { queryParams: { search: search || null } });
  }

  recentSearches = signal<string[]>(['Chaussures homme', 'Téléphone Samsung']);

  selectRecentSearch(term: string) {
    this.searchTerm = term;
    this.onSearchSubmit();
  }

  removeRecentSearch(term: string) {
    this.recentSearches.update(list => list.filter(t => t !== term));
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (window.innerWidth > this.mobileBreakpoint) {
      this.isHeaderHidden.set(false);
      return;
    }

    const currentScrollY = window.scrollY;
    const scrollingDown = currentScrollY > this.lastScrollY;
    const pastThreshold = currentScrollY > this.scrollThreshold;

    this.isHeaderHidden.set(scrollingDown && pastThreshold);
    this.lastScrollY = currentScrollY;
  }
}
