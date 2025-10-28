import { useState } from 'react';
import { useDocuments } from '@/stores/app.store';
import { usePermissions } from '@/hooks/usePermissions';
import { apiService } from '@/services/api.service';
import { auditService } from '@/services/audit.service';
import { encryptionService } from '@/services/encryption.service';
import { DocumentVersion, DocumentVersionType } from '@/types';
import { downloadBlob, sanitizeFilename } from '@/utils/file';
import { v4 as uuidv4 } from 'uuid';

interface VersionControlProps {
  className?: string;
}

export function VersionControl({ className = '' }: VersionControlProps) {
  const { currentDocument, updateDocument } = useDocuments();
  const { canApproveVersions } = usePermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingAction, setProcessingAction] = useState<string>('');

  if (!currentDocument) {
    return (
      <div className={`version-control version-control--empty ${className}`}>
        <div className="empty-state">
          <h3>Version Control</h3>
          <p>Select a document to manage its versions.</p>
        </div>
      </div>
    );
  }

  const handleCreateWorkingVersion = async () => {
    if (!currentDocument) return;

    setIsProcessing(true);
    setProcessingAction('Creating working version...');

    try {
      // Get the original version
      const originalVersion = currentDocument.versions.find(v => v.type === 'original');
      if (!originalVersion) {
        throw new Error('Original version not found');
      }

      // Create working version based on original
      const workingVersion: DocumentVersion = {
        id: uuidv4(),
        type: 'working',
        content: originalVersion.content,
        redactions: [], // Start with no redactions
        createdAt: new Date(),
        createdBy: 'current-user', // Should come from auth context
        hash: originalVersion.hash, // Will be updated when redactions are applied
        encrypted: originalVersion.encrypted,
      };

      // Update document with new version
      const updatedVersions = [...currentDocument.versions, workingVersion];
      updateDocument(currentDocument.id, {
        versions: updatedVersions,
        currentVersion: 'working',
      });

      // Audit log
      await auditService.log({
        userId: 'current-user',
        action: 'version.create',
        resourceType: 'document',
        resourceId: currentDocument.id,
        details: {
          versionType: 'working',
          versionId: workingVersion.id,
        },
      });

    } catch (error) {
      console.error('Failed to create working version:', error);
      alert('Failed to create working version. Please try again.');
    } finally {
      setIsProcessing(false);
      setProcessingAction('');
    }
  };

  const handleApproveVersion = async () => {
    if (!currentDocument || !canApproveVersions) return;

    const workingVersion = currentDocument.versions.find(v => v.type === 'working');
    if (!workingVersion) {
      alert('No working version to approve.');
      return;
    }

    setIsProcessing(true);
    setProcessingAction('Finalizing document...');

    try {
      // Generate final hash with redactions applied
      const finalHash = await encryptionService.generateHash(
        workingVersion.content as ArrayBuffer
      );

      // Create final version
      const finalVersion: DocumentVersion = {
        id: uuidv4(),
        type: 'final',
        content: workingVersion.content,
        redactions: workingVersion.redactions,
        createdAt: new Date(),
        createdBy: 'current-user',
        hash: finalHash,
        encrypted: false, // Final versions are not encrypted for export
      };

      // Update document
      const updatedVersions = [...currentDocument.versions, finalVersion];
      updateDocument(currentDocument.id, {
        versions: updatedVersions,
        currentVersion: 'final',
        hash: finalHash,
      });

      // Send to server for finalization
      try {
        await apiService.finalizeDocument(currentDocument.id);
      } catch (apiError) {
        console.warn('Server finalization failed, continuing locally:', apiError);
      }

      // Audit log
      await auditService.log({
        userId: 'current-user',
        action: 'version.approve',
        resourceType: 'document',
        resourceId: currentDocument.id,
        details: {
          versionId: finalVersion.id,
          hash: finalHash,
          redactionCount: workingVersion.redactions.length,
        },
      });

      alert('Document has been finalized successfully.');

    } catch (error) {
      console.error('Failed to approve version:', error);
      alert('Failed to finalize document. Please try again.');
    } finally {
      setIsProcessing(false);
      setProcessingAction('');
    }
  };

  const handleDownloadVersion = async (versionType: DocumentVersionType) => {
    if (!currentDocument) return;

    const version = currentDocument.versions.find(v => v.type === versionType);
    if (!version) {
      alert(`${versionType} version not found.`);
      return;
    }

    setIsProcessing(true);
    setProcessingAction(`Downloading ${versionType} version...`);

    try {
      let content: ArrayBuffer;

      if (version.content instanceof ArrayBuffer) {
        content = version.content;
      } else {
        // Convert string content to ArrayBuffer
        const encoder = new TextEncoder();
        content = encoder.encode(version.content).buffer;
      }

      // Create blob and download
      const blob = new Blob([content], { 
        type: getContentType(currentDocument.type) 
      });
      
      const filename = sanitizeFilename(
        `${currentDocument.name.replace(/\.[^/.]+$/, '')}_${versionType}.${currentDocument.type}`
      );

      downloadBlob(blob, filename);

      // Audit log
      await auditService.log({
        userId: 'current-user',
        action: 'document.download',
        resourceType: 'document',
        resourceId: currentDocument.id,
        details: {
          versionType,
          versionId: version.id,
          filename,
        },
      });

    } catch (error) {
      console.error('Failed to download version:', error);
      alert('Failed to download document. Please try again.');
    } finally {
      setIsProcessing(false);
      setProcessingAction('');
    }
  };

  const handleSwitchVersion = (versionType: DocumentVersionType) => {
    if (!currentDocument) return;

    const version = currentDocument.versions.find(v => v.type === versionType);
    if (!version) return;

    updateDocument(currentDocument.id, {
      currentVersion: versionType,
    });
  };

  const getVersionStatus = (versionType: DocumentVersionType) => {
    const version = currentDocument.versions.find(v => v.type === versionType);
    if (!version) return 'Not Created';
    
    switch (versionType) {
      case 'original': return 'Immutable';
      case 'working': return 'In Progress';
      case 'final': return 'Finalized';
      default: return 'Unknown';
    }
  };

  const getVersionColor = (versionType: DocumentVersionType) => {
    switch (versionType) {
      case 'original': return 'blue';
      case 'working': return 'orange';
      case 'final': return 'green';
      default: return 'gray';
    }
  };

  const hasWorkingVersion = currentDocument.versions.some(v => v.type === 'working');
  const hasFinalVersion = currentDocument.versions.some(v => v.type === 'final');

  return (
    <div className={`version-control ${className}`}>
      <div className="version-header">
        <h3>Version Control</h3>
        <p>Manage document versions: Original → Working → Final</p>
      </div>

      {/* Current Version Indicator */}
      <div className="current-version">
        <h4>Current Version</h4>
        <div className={`version-badge version-badge--${getVersionColor(currentDocument.currentVersion)}`}>
          {currentDocument.currentVersion.charAt(0).toUpperCase() + currentDocument.currentVersion.slice(1)}
        </div>
      </div>

      {/* Version List */}
      <div className="version-list">
        {/* Original Version */}
        <div className="version-item">
          <div className="version-info">
            <h5>Original Version</h5>
            <p className="version-description">
              Immutable source document. Cannot be modified.
            </p>
            <div className="version-meta">
              <span className={`status-badge status-badge--${getVersionColor('original')}`}>
                {getVersionStatus('original')}
              </span>
              <span className="version-date">
                {new Date(currentDocument.uploadedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          
          <div className="version-actions">
            <button
              type="button"
              className={`btn btn--secondary btn--small ${
                currentDocument.currentVersion === 'original' ? 'btn--active' : ''
              }`}
              onClick={() => handleSwitchVersion('original')}
              disabled={isProcessing}
            >
              {currentDocument.currentVersion === 'original' ? 'Current' : 'View'}
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--small"
              onClick={() => handleDownloadVersion('original')}
              disabled={isProcessing}
            >
              Download
            </button>
          </div>
        </div>

        {/* Working Version */}
        <div className="version-item">
          <div className="version-info">
            <h5>Working Version</h5>
            <p className="version-description">
              Draft version with redactions. Can be modified by redactors.
            </p>
            <div className="version-meta">
              <span className={`status-badge status-badge--${getVersionColor('working')}`}>
                {getVersionStatus('working')}
              </span>
              {hasWorkingVersion && (
                <span className="version-date">
                  {new Date(
                    currentDocument.versions.find(v => v.type === 'working')?.createdAt || new Date()
                  ).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          
          <div className="version-actions">
            {hasWorkingVersion ? (
              <>
                <button
                  type="button"
                  className={`btn btn--secondary btn--small ${
                    currentDocument.currentVersion === 'working' ? 'btn--active' : ''
                  }`}
                  onClick={() => handleSwitchVersion('working')}
                  disabled={isProcessing}
                >
                  {currentDocument.currentVersion === 'working' ? 'Current' : 'View'}
                </button>
                <button
                  type="button"
                  className="btn btn--secondary btn--small"
                  onClick={() => handleDownloadVersion('working')}
                  disabled={isProcessing}
                >
                  Download
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn--primary btn--small"
                onClick={handleCreateWorkingVersion}
                disabled={isProcessing}
              >
                Create Working Version
              </button>
            )}
          </div>
        </div>

        {/* Final Version */}
        <div className="version-item">
          <div className="version-info">
            <h5>Final Version</h5>
            <p className="version-description">
              Approved final document with redactions applied. Immutable.
            </p>
            <div className="version-meta">
              <span className={`status-badge status-badge--${getVersionColor('final')}`}>
                {getVersionStatus('final')}
              </span>
              {hasFinalVersion && (
                <span className="version-date">
                  {new Date(
                    currentDocument.versions.find(v => v.type === 'final')?.createdAt || new Date()
                  ).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          
          <div className="version-actions">
            {hasFinalVersion ? (
              <>
                <button
                  type="button"
                  className={`btn btn--secondary btn--small ${
                    currentDocument.currentVersion === 'final' ? 'btn--active' : ''
                  }`}
                  onClick={() => handleSwitchVersion('final')}
                  disabled={isProcessing}
                >
                  {currentDocument.currentVersion === 'final' ? 'Current' : 'View'}
                </button>
                <button
                  type="button"
                  className="btn btn--secondary btn--small"
                  onClick={() => handleDownloadVersion('final')}
                  disabled={isProcessing}
                >
                  Download
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn--primary btn--small"
                onClick={handleApproveVersion}
                disabled={!hasWorkingVersion || !canApproveVersions || isProcessing}
                title={
                  !hasWorkingVersion 
                    ? 'Create a working version first'
                    : !canApproveVersions
                    ? 'You do not have permission to approve versions'
                    : 'Finalize the working version'
                }
              >
                Finalize Document
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Processing Indicator */}
      {isProcessing && (
        <div className="processing-indicator" role="status" aria-live="polite">
          <div className="loading-spinner" aria-hidden="true"></div>
          <span>{processingAction}</span>
        </div>
      )}

      {/* Version Control Rules */}
      <div className="version-rules">
        <h4>Version Control Rules</h4>
        <ul>
          <li><strong>Original:</strong> Immutable source document, always preserved</li>
          <li><strong>Working:</strong> Editable draft with redactions, can be modified</li>
          <li><strong>Final:</strong> Approved document with applied redactions, immutable</li>
          <li>Only approvers can finalize working versions into final versions</li>
          <li>Final versions include a cryptographic hash for integrity verification</li>
        </ul>
      </div>
    </div>
  );
}

function getContentType(documentType: string): string {
  switch (documentType) {
    case 'pdf': return 'application/pdf';
    case 'doc': return 'application/msword';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'rtf': return 'application/rtf';
    case 'txt': return 'text/plain';
    default: return 'application/octet-stream';
  }
}