import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppStore } from '@/stores/app.store';
import { authService } from '@/services/auth.service';
import { FOIError } from '@/types';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const { setUser, setLoading, setError } = useAppStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    setError(null);
    setLoading(true);

    try {
      const user = await authService.login(data.email, data.password);
      setUser(user);
      onSuccess?.();
    } catch (error) {
      const message = error instanceof FOIError 
        ? error.message 
        : 'Login failed. Please try again.';
      setError(message);
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  return (
    <div className="login-form">
      <div className="login-header">
        <h1>FOI Redaction Tool</h1>
        <p>Australian Commonwealth FOI Officer Portal</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="form-group">
          <label htmlFor="email" className="form-label">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            className={`form-input ${errors.email ? 'form-input--error' : ''}`}
            {...register('email')}
            aria-describedby={errors.email ? 'email-error' : undefined}
            autoComplete="email"
            autoFocus
          />
          {errors.email && (
            <div id="email-error" className="form-error" role="alert">
              {errors.email.message}
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="password" className="form-label">
            Password
          </label>
          <input
            id="password"
            type="password"
            className={`form-input ${errors.password ? 'form-input--error' : ''}`}
            {...register('password')}
            aria-describedby={errors.password ? 'password-error' : undefined}
            autoComplete="current-password"
          />
          {errors.password && (
            <div id="password-error" className="form-error" role="alert">
              {errors.password.message}
            </div>
          )}
        </div>

        <button
          type="submit"
          className="btn btn--primary btn--full-width"
          disabled={isSubmitting}
          aria-describedby="login-help"
        >
          {isSubmitting ? 'Signing In...' : 'Sign In with SSO'}
        </button>

        <div id="login-help" className="login-help">
          <p>This system uses OIDC/SAML 2.0 SSO with multi-factor authentication.</p>
          <p>Demo accounts:</p>
          <ul>
            <li><strong>Viewer:</strong> viewer@foi.gov.au</li>
            <li><strong>Redactor:</strong> redactor@foi.gov.au</li>
            <li><strong>Approver:</strong> approver@foi.gov.au</li>
          </ul>
          <p><em>Use any password for demo purposes.</em></p>
        </div>
      </form>
    </div>
  );
}