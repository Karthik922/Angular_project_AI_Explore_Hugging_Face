import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { UserPayload } from '../user.model';
import { UserService, apiErrorMessage } from '../user.service';

@Component({
  selector: 'app-user-form',
  imports: [ReactiveFormsModule, RouterLink, ButtonModule, InputText, Message],
  templateUrl: './user-form.html',
})
export class UserForm implements OnInit {
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  /** Bound from the `:id` route param; undefined on the "new" route. */
  readonly id = input<string>();

  protected readonly isEdit = computed(() => this.id() !== undefined);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    age: this.fb.control<number | null>(null, [Validators.min(0)]),
  });

  ngOnInit(): void {
    const id = this.id();
    if (id === undefined) return;
    this.loading.set(true);
    this.userService.get(Number(id)).subscribe({
      next: (user) => {
        this.form.patchValue({ name: user.name, email: user.email, age: user.age });
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err));
        this.loading.set(false);
      },
    });
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { name, email, age } = this.form.getRawValue();
    const payload: UserPayload = { name: name.trim(), email: email.trim() };
    // An empty number input gives null: send null on edit to clear the age, omit it on create.
    if (age !== null) payload.age = age;
    else if (this.isEdit()) payload.age = null;

    const id = this.id();
    const request =
      id === undefined ? this.userService.create(payload) : this.userService.update(Number(id), payload);

    this.saving.set(true);
    this.error.set(null);
    request.subscribe({
      next: () => this.router.navigate(['/users']),
      error: (err) => {
        this.error.set(apiErrorMessage(err));
        this.saving.set(false);
      },
    });
  }

  protected showError(field: 'name' | 'email' | 'age'): boolean {
    const control = this.form.controls[field];
    return control.invalid && control.touched;
  }
}
