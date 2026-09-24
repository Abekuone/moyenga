import { Component, inject } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  imports: [],
  selector: 'app-admin-dashboard',
  styleUrl: './admin-dashboard.component.scss',
  templateUrl: './admin-dashboard.component.html',
})
export class AdminDashboardComponent {
  readonly authService = inject(AuthService);
}
