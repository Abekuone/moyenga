import { Component, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { RouterModule, RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterOutlet, RouterModule],
  selector: 'app-admin-layout',
  styleUrl: './admin-layout.component.scss',
  templateUrl: './admin-layout.component.html',
})
export class AdminLayoutComponent {
  readonly authService = inject(AuthService);
}
