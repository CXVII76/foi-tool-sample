import { useState } from 'react';
import { useAuth, useAppStore } from '@/stores/app.store';
import { authService } from '@/services/auth.service';
import { getRoleDisplayName, getRoleDescription } from '@/utils/permissions';

export function UserProfile() {
  const { user } = useAuth();
  const { panicClear } = useAppStore();
  const [showPanicConfirm, setShowPanicConfirm] = useState(false);
  const [isPanicClearing, setIsPanicClearing] = useState(false);

  if (!user) return null;

  const handleLogout = async () => {
    try {
      await authService.logout();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handlePanicClear = async () => {
    if (!showPanicConfirm) {
      setShowPanicConfirm(true);
      return;
    }

    setIsPanicClearing(true);
    try {
      await panicClear();
      alert('All cached data has been cleared. You will be redirected to login.');
      window.location.href = '/login';
    } catch (error) {
      //console.error('Panic clear failed:', error);
      alert('Failed to clear all data. Please try again or contact support.');
    } finally {
      setIsPanicClearing(false);
      setShowPanicConfirm(false);
    }
  };

  return (
    <div className="user-profile">
      <div className="user-info">
        <div className="user-avatar">
          {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
        </div>
        <div className="user-details">
          <h3>{user.name}</h3>
          <p className="user-email">{user.email}</p>
          <p className="user-role">
            <span className={`role-badge role-badge--${user.role}`}>
              {getRoleDisplayName(user.role)}
            </span>
          </p>
          {user.department && (
            <p className="user-department">{user.department}</p>
          )}
        </div>
      </div>

      <div className="user-role-info">
        <h4>Role Permissions</h4>
        <p>{getRoleDescription(user.role)}</p>
      </div>

      <div className="user-actions">
        <button
          type="button"
          className="btn btn--secondary"
          onClick={handleLogout}
        >
          Sign Out
        </button>

        <div className="panic-clear-section">
          <h4>Emergency Data Clear</h4>
          <p>
            Use this to immediately clear all cached documents and session data.
            This action cannot be undone.
          </p>
          
          {!showPanicConfirm ? (
            <button
              type="button"
              className="btn btn--danger"
              onClick={handlePanicClear}
              aria-describedby="panic-clear-help"
            >
              Panic Clear
            </button>
          ) : (
            <div className="panic-confirm">
              <p><strong>Are you sure?</strong> This will:</p>
              <ul>
                <li>Clear all cached documents</li>
                <li>Remove all session data</li>
                <li>Sign you out immediately</li>
              </ul>
              <div className="panic-actions">
                <button
                  type="button"
                  className="btn btn--danger"
                  onClick={handlePanicClear}
                  disabled={isPanicClearing}
                >
                  {isPanicClearing ? 'Clearing...' : 'Yes, Clear All Data'}
                </button>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => setShowPanicConfirm(false)}
                  disabled={isPanicClearing}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          
          <div id="panic-clear-help" className="help-text">
            This feature is required for security compliance and should be used
            when you suspect unauthorized access or when leaving a shared computer.
          </div>
        </div>
      </div>
    </div>
  );
}