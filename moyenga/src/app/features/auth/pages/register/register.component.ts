import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { RouterLink } from '@angular/router';

const requireEmailOrPhone: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const email = group.get('email')?.value;
  const phone = group.get('phone')?.value;
  return email || phone ? null : { identifierRequired: true };
};
@Component({
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  selector: 'app-register',
  styleUrl: './register.component.scss',
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group(
    {
      firstName: [''],
      lastName: [''],
      email: [''],
      phone: [''],
      password: ['', [Validators.required, Validators.minLength(8)]],
    },
    { validators: requireEmailOrPhone },
  );

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const value = this.form.getRawValue();
    this.authService
      .register({
        ...value,
        email: value.email || undefined,
        phone: value.phone || undefined,
      })
      .subscribe({
        next: (user) => {
          this.loading.set(false);
          this.successMessage.set(
            user.email
              ? `Compte créé ! Vérifie ta boîte mail (${user.email}) pour activer ton compte.`
              : 'Compte créé ! Tu peux maintenant te connecter.',
          );
        },
        error: (err) => {
          this.errorMessage.set(err?.error?.message ?? 'Une erreur est survenue');
          this.loading.set(false);
        },
      });
  }
}
