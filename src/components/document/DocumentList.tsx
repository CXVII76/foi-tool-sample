// React import not needed with new JSX transform
import { useDocuments } from '@/stores/app.store';
import { formatFileSize } from '@/utils/file';
import { Document, DocumentVersionType } from '@/types';

interface DocumentListProps {
  onDocumentSelect?: (document: Document) => void;
  className?: string;
}

export function DocumentList({ onDocumentSelect, className = '' }: DocumentListProps) {
  const { documents, currentDocument, setCurrentDocument } = useDocuments();

  const handleDocumentClick = (document: Document) => {
    setCurrentDocument(document);
    onDocumentSelect?.(document);
  };

  const getVersionStatusColor = (version: DocumentVersionType) => {
    switch (version) {
      case 'original': return 'blue';
      case 'working': return 'orange';
      case 'final': return 'green';
      default: return 'gray';
    }
  };

  const getVersionStatusText = (version: DocumentVersionType) => {
    switch (version) {
      case 'original': return 'Original';
      case 'working': return 'In Progress';
      case 'final': return 'Finalized';
      default: return 'Unknown';
    }
  };

  if (documents.length === 0) {
    return (
      <div className={`document-list document-list--empty ${className}`}>
        <div className="empty-state">
          <div className="empty-state__icon" aria-hidden="true">📄</div>
          <h3>No Documents</h3>
          <p>Upload a document to get started with redaction.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`document-list ${className}`}>
      <div className="document-list__header">
        <h3>Documents ({documents.length})</h3>
      </div>
      
      <div className="document-list__items" role="list">
        {documents.map((document) => (
          <div
            key={document.id}
            className={`
              document-item
              ${currentDocument?.id === document.id ? 'document-item--active' : ''}
            `}
            role="listitem"
          >
            <button
              type="button"
              className="document-item__button"
              onClick={() => handleDocumentClick(document)}
              aria-pressed={currentDocument?.id === document.id}
              aria-describedby={`document-${document.id}-details`}
            >
              <div className="document-item__icon" aria-hidden="true">
                {getDocumentTypeIcon(document.type)}
              </div>
              
              <div className="document-item__content">
                <h4 className="document-item__name">{document.name}</h4>
                <div className="document-item__meta">
                  <span className="document-item__size">
                    {formatFileSize(document.size)}
                  </span>
                  <span className="document-item__type">
                    {document.type.toUpperCase()}
                  </span>
                  <span className="document-item__date">
                    {new Date(document.uploadedAt).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="document-item__status">
                  <span 
                    className={`status-badge status-badge--${getVersionStatusColor(document.currentVersion)}`}
                  >
                    {getVersionStatusText(document.currentVersion)}
                  </span>
                  {document.versions.length > 1 && (
                    <span className="version-count">
                      {document.versions.length} versions
                    </span>
                  )}
                </div>
              </div>
            </button>
            
            <div 
              id={`document-${document.id}-details`} 
              className="document-item__details sr-only"
            >
              Document: {document.name}, 
              Size: {formatFileSize(document.size)}, 
              Type: {document.type}, 
              Status: {getVersionStatusText(document.currentVersion)}, 
              Uploaded: {new Date(document.uploadedAt).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getDocumentTypeIcon(type: string): string {
  switch (type) {
    case 'pdf': return '📄';
    case 'doc':
    case 'docx': return '📝';
    case 'rtf': return '📋';
    case 'txt': return '📃';
    default: return '📄';
  }
}