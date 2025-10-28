// React import not needed with new JSX transform
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/stores/app.store';
import { LoginForm } from '@/components/auth/LoginForm';

export function LoginPage() {
  const { isAuthenticated } = useAuth();

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <LoginForm onSuccess={() => window.location.href = '/'} />
        </div>
      </div>
      
      {/* Background */}
      <div className="login-background">
        <div className="background-pattern" aria-hidden="true"></div>
      </div>

      {/* Footer */}
      <footer className="login-footer">
        <div className="footer-content">
          <p>
            Australian Government | Department of Prime Minister and Cabinet
          </p>
          <p>
            This system is for authorized FOI officers only. 
            All activities are logged and monitored.
          </p>
        </div>
      </footer>
    </div>
  );
}