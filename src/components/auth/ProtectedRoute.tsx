import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/stores/app.store';
import { usePermissions } from '@/hooks/usePermissions';
import { UserRole } from '@/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requiredPermission?: {
    resource: string;
    action: string;
  };
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ 
  children, 
  requiredRole, 
  requiredPermission,
  fallback 
}: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuth();
  const { hasPermission } = usePermissions();
  const location = useLocation();

  // Not authenticated - redirect to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role requirement
  if (requiredRole && user.role !== requiredRole) {
    return fallback || (
      <div className="access-denied">
        <h2>Access Denied</h2>
        <p>You have no the required role ({requiredRole}) to access this page.</p>
        <p>Your current role: {user.role}</p>
      </div>
    );
  }

  // Check permission requirement
  if (requiredPermission && !hasPermission(requiredPermission.resource, requiredPermission.action)) {
    return fallback || (
      <div className="access-denied">
        <h2>Access Denied</h2>
        <p>You have no permission to {requiredPermission.action} {requiredPermission.resource}.</p>
      </div>
    );
  }

  return <>{children}</>;
}

// Higher-order component version
// eslint-disable-next-line react-refresh/only-export-components
export function withProtection<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<ProtectedRouteProps, 'children'>
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}