// React import not needed with new JSX transform
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { DocumentViewer } from '@/components/document/DocumentViewer';
import { useUI } from '@/stores/app.store';

export function DashboardPage() {
  const { sidebarOpen } = useUI();

  return (
    <div className="dashboard-page">
      <Header />
      
      <div className="dashboard-content">
        <Sidebar />
        
        <main 
          id="main-content"
          className={`main-content ${sidebarOpen ? 'main-content--sidebar-open' : 'main-content--sidebar-closed'}`}
          role="main"
          aria-label="Document viewer and redaction workspace"
        >
          <div className="main-content-inner">
            <DocumentViewer />
          </div>
        </main>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="keyboard-shortcuts sr-only" tabIndex={-1}>
        <h2>Keyboard Shortcuts</h2>
        <dl>
          <dt>Alt + S</dt>
          <dd>Toggle sidebar</dd>
          <dt>R</dt>
          <dd>Select rectangle redaction tool</dd>
          <dt>H</dt>
          <dd>Select highlight tool</dd>
          <dt>B</dt>
          <dd>Select blackout tool</dd>
          <dt>Escape</dt>
          <dd>Cancel current operation</dd>
          <dt>Delete</dt>
          <dd>Remove selected redaction</dd>
        </dl>
      </div>
    </div>
  );
}