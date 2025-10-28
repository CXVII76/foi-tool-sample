import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from '@/stores/app.store';
import { authService } from '@/services/auth.service';
import { encryptionService } from '@/services/encryption.service';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { FOIError } from '@/types';
import './App.css';

function App() {
  const { user, setUser, setLoading, setError } = useAppStore();

  // Initialize app on mount
  useEffect(() => {
    const initializeApp = async () => {
      setLoading(true);
      
      try {
        // Initialize encryption service
        await encryptionService.initializeSession();
        
        // Check if user is already authenticated
        const currentUser = authService.getCurrentUser();
        if (currentUser && authService.isAuthenticated() && !authService.isTokenExpired()) {
          setUser(currentUser);
        }
        
        // Set up keyboard shortcuts
        setupKeyboardShortcuts();
        
      } catch (error) {
        console.error('App initialization failed:', error);
        const message = error instanceof FOIError 
          ? error.message 
          : 'Failed to initialize application';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, [setUser, setLoading, setError]);

  // Set up global keyboard shortcuts
  const setupKeyboardShortcuts = () => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Alt + S: Toggle sidebar
      if (event.altKey && event.key === 's') {
        event.preventDefault();
        const { setSidebarOpen, sidebarOpen } = useAppStore.getState();
        setSidebarOpen(!sidebarOpen);
      }
      
      // Escape: Cancel current operation
      if (event.key === 'Escape') {
        const { setRedactionTool } = useAppStore.getState();
        setRedactionTool({ selectedTool: null, isDrawing: false });
      }
      
      // Tool shortcuts (only when authenticated)
      if (user) {
        const { setRedactionTool } = useAppStore.getState();
        
        switch (event.key.toLowerCase()) {
          case 'r':
            if (!event.ctrlKey && !event.altKey && !event.metaKey) {
              event.preventDefault();
              setRedactionTool({ selectedTool: 'rectangle' });
            }
            break;
          case 'h':
            if (!event.ctrlKey && !event.altKey && !event.metaKey) {
              event.preventDefault();
              setRedactionTool({ selectedTool: 'highlight' });
            }
            break;
          case 'b':
            if (!event.ctrlKey && !event.altKey && !event.metaKey) {
              event.preventDefault();
              setRedactionTool({ selectedTool: 'blackout' });
            }
            break;
          case 's':
            if (!event.altKey && !event.ctrlKey && !event.metaKey) {
              event.preventDefault();
              setRedactionTool({ selectedTool: null });
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  };

  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        
        {/* Global Error Display */}
        <ErrorBoundary />
      </div>
    </Router>
  );
}

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Application error:', error, errorInfo);
    
    // In production, you might want to send this to an error reporting service
    if (import.meta.env.PROD) {
      // Send to error reporting service
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-content">
            <h1>Something went wrong</h1>
            <p>
              An unexpected error occurred. Please refresh the page or contact support 
              if the problem persists.
            </p>
            <details className="error-details">
              <summary>Error Details</summary>
              <pre>{this.state.error?.stack}</pre>
            </details>
            <div className="error-actions">
              <button 
                type="button"
                className="btn btn--primary"
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => {
                  useAppStore.getState().panicClear();
                  window.location.href = '/login';
                }}
              >
                Clear Data & Restart
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children || null;
  }
}

export default App;