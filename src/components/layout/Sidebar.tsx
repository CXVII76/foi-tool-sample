// React import not needed with new JSX transform
import { useUI } from '@/stores/app.store';
import { usePermissions } from '@/hooks/usePermissions';
import { DocumentList } from '@/components/document/DocumentList';
import { FileUpload } from '@/components/document/FileUpload';
import { RedactionTools } from '@/components/redaction/RedactionTools';
import { VersionControl } from '@/components/document/VersionControl';

export function Sidebar() {
  const { sidebarOpen } = useUI();
  const { canUpload } = usePermissions();

  return (
    <aside 
      id="app-sidebar"
      className={`app-sidebar ${sidebarOpen ? 'app-sidebar--open' : 'app-sidebar--closed'}`}
      aria-label="Document management and tools"
    >
      <div className="sidebar-content">
        {/* File Upload Section */}
        {canUpload && (
          <section className="sidebar-section">
            <h2 className="sidebar-section-title">Upload Document</h2>
            <FileUpload />
          </section>
        )}

        {/* Document List Section */}
        <section className="sidebar-section">
          <h2 className="sidebar-section-title">Documents</h2>
          <DocumentList />
        </section>

        {/* Redaction Tools Section */}
        <section className="sidebar-section">
          <h2 className="sidebar-section-title">Redaction Tools</h2>
          <RedactionTools />
        </section>

        {/* Version Control Section */}
        <section className="sidebar-section">
          <h2 className="sidebar-section-title">Version Control</h2>
          <VersionControl />
        </section>
      </div>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-info">
          <p className="info-text">
            <strong>Security Notice:</strong> All documents are encrypted locally. 
            Use 'Panic Clear' to immediately remove all cached data.
          </p>
        </div>
      </div>
    </aside>
  );
}