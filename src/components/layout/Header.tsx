import { useState } from 'react';
import { useAuth, useUI } from '@/stores/app.store';
import { UserProfile } from '@/components/auth/UserProfile';
import { getRoleDisplayName } from '@/utils/permissions';

export function Header() {
  const { user } = useAuth();
  const { sidebarOpen, setSidebarOpen } = useUI();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const toggleUserMenu = () => {
    setShowUserMenu(!showUserMenu);
  };

  if (!user) return null;

  return (
    <header className="app-header" role="banner">
      <div className="header-content">
        {/* Left Section */}
        <div className="header-left">
          <button
            type="button"
            className="sidebar-toggle"
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            aria-expanded={sidebarOpen}
            aria-controls="app-sidebar"
          >
            <span className="hamburger-icon" aria-hidden="true">
              {sidebarOpen ? '✕' : '☰'}
            </span>
          </button>
          
          <div className="app-title">
            <h1>FOI Redaction Tool</h1>
            <span className="app-subtitle">Australian Commonwealth</span>
          </div>
        </div>

        {/* Center Section */}
        <div className="header-center">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <ol className="breadcrumb-list">
              <li className="breadcrumb-item">
                <a href="/" className="breadcrumb-link">Dashboard</a>
              </li>
              <li className="breadcrumb-item breadcrumb-item--current" aria-current="page">
                Document Redaction
              </li>
            </ol>
          </nav>
        </div>

        {/* Right Section */}
        <div className="header-right">
          {/* User Menu */}
          <div className="user-menu">
            <button
              type="button"
              className="user-menu-trigger"
              onClick={toggleUserMenu}
              aria-label="User menu"
              aria-expanded={showUserMenu}
              aria-haspopup="true"
            >
              <div className="user-avatar">
                {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </div>
              <div className="user-info">
                <span className="user-name">{user.name}</span>
                <span className="user-role">{getRoleDisplayName(user.role)}</span>
              </div>
              <span className="dropdown-arrow" aria-hidden="true">▼</span>
            </button>

            {showUserMenu && (
              <div className="user-menu-dropdown" role="menu">
                <div className="dropdown-content">
                  <UserProfile />
                </div>
                <button 
                  className="dropdown-overlay" 
                  onClick={() => setShowUserMenu(false)}
                  onKeyDown={(e) => e.key === 'Escape' && setShowUserMenu(false)}
                  aria-label="Close menu"
                  type="button"
                />
              </div>
            )}
          </div>

          {/* System Status */}
          <div className="system-status">
            <div className="status-indicator status-indicator--online" title="System Online">
              <span className="sr-only">System Status: Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Skip Links */}
      <div className="skip-links">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <a href="#sidebar-nav" className="skip-link">
          Skip to navigation
        </a>
      </div>
    </header>
  );
}