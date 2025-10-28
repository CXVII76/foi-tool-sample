// React import not needed with new JSX transform
import { useRedactionTool } from '@/stores/app.store';
import { usePermissions } from '@/hooks/usePermissions';
import { RedactionType } from '@/types';

interface RedactionToolsProps {
  className?: string;
}

export function RedactionTools({ className = '' }: RedactionToolsProps) {
  const { redactionTool, reasonCodes, setRedactionTool } = useRedactionTool();
  const { canCreateRedactions, canEditRedactions } = usePermissions();

  const handleToolSelect = (tool: RedactionType | null) => {
    if (!canCreateRedactions) return;
    setRedactionTool({ selectedTool: tool, isDrawing: false });
  };

  const handleReasonCodeChange = (reasonCode: string) => {
    setRedactionTool({ selectedReasonCode: reasonCode });
  };

  if (!canCreateRedactions && !canEditRedactions) {
    return (
      <div className={`redaction-tools redaction-tools--disabled ${className}`}>
        <div className="tools-header">
          <h3>Redaction Tools</h3>
          <p className="permission-notice">
            You do not have permission to create or edit redactions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`redaction-tools ${className}`}>
      <div className="tools-header">
        <h3>Redaction Tools</h3>
        <p>Select a tool and reason code to start redacting.</p>
      </div>

      {/* Tool Selection */}
      <div className="tool-section">
        <h4>Redaction Type</h4>
        <div className="tool-buttons" role="radiogroup" aria-label="Redaction tool selection">
          <button
            type="button"
            className={`tool-button ${redactionTool.selectedTool === 'rectangle' ? 'tool-button--active' : ''}`}
            onClick={() => handleToolSelect('rectangle')}
            disabled={!canCreateRedactions}
            role="radio"
            aria-checked={redactionTool.selectedTool === 'rectangle'}
            aria-describedby="rectangle-tool-desc"
          >
            <span className="tool-icon" aria-hidden="true">▭</span>
            <span className="tool-label">Rectangle</span>
          </button>
          
          <button
            type="button"
            className={`tool-button ${redactionTool.selectedTool === 'highlight' ? 'tool-button--active' : ''}`}
            onClick={() => handleToolSelect('highlight')}
            disabled={!canCreateRedactions}
            role="radio"
            aria-checked={redactionTool.selectedTool === 'highlight'}
            aria-describedby="highlight-tool-desc"
          >
            <span className="tool-icon" aria-hidden="true">🖍️</span>
            <span className="tool-label">Highlight</span>
          </button>
          
          <button
            type="button"
            className={`tool-button ${redactionTool.selectedTool === 'blackout' ? 'tool-button--active' : ''}`}
            onClick={() => handleToolSelect('blackout')}
            disabled={!canCreateRedactions}
            role="radio"
            aria-checked={redactionTool.selectedTool === 'blackout'}
            aria-describedby="blackout-tool-desc"
          >
            <span className="tool-icon" aria-hidden="true">⬛</span>
            <span className="tool-label">Blackout</span>
          </button>
          
          <button
            type="button"
            className={`tool-button ${redactionTool.selectedTool === null ? 'tool-button--active' : ''}`}
            onClick={() => handleToolSelect(null)}
            role="radio"
            aria-checked={redactionTool.selectedTool === null}
            aria-describedby="select-tool-desc"
          >
            <span className="tool-icon" aria-hidden="true">👆</span>
            <span className="tool-label">Select</span>
          </button>
        </div>

        {/* Tool Descriptions */}
        <div className="tool-descriptions">
          <div id="rectangle-tool-desc" className="tool-desc">
            <strong>Rectangle:</strong> Draw rectangular redaction boxes
          </div>
          <div id="highlight-tool-desc" className="tool-desc">
            <strong>Highlight:</strong> Mark areas for review (semi-transparent)
          </div>
          <div id="blackout-tool-desc" className="tool-desc">
            <strong>Blackout:</strong> Complete redaction (fully opaque)
          </div>
          <div id="select-tool-desc" className="tool-desc">
            <strong>Select:</strong> Select and modify existing redactions
          </div>
        </div>
      </div>

      {/* Reason Code Selection */}
      <div className="reason-section">
        <h4>
          <label htmlFor="reason-code-select">Reason Code</label>
        </h4>
        <select
          id="reason-code-select"
          className="reason-select"
          value={redactionTool.selectedReasonCode}
          onChange={(e) => handleReasonCodeChange(e.target.value)}
          aria-describedby="reason-code-help"
        >
          {reasonCodes.map((reason) => (
            <option key={reason.code} value={reason.code}>
              {reason.code} - {reason.description}
            </option>
          ))}
        </select>
        
        <div id="reason-code-help" className="help-text">
          Select the appropriate FOI exemption for this redaction.
        </div>
      </div>

      {/* Current Selection Status */}
      <div className="status-section">
        <h4>Current Selection</h4>
        <div className="status-info">
          <div className="status-item">
            <span className="status-label">Tool:</span>
            <span className="status-value">
              {redactionTool.selectedTool 
                ? redactionTool.selectedTool.charAt(0).toUpperCase() + redactionTool.selectedTool.slice(1)
                : 'Select'
              }
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Reason:</span>
            <span className="status-value">
              {reasonCodes.find(r => r.code === redactionTool.selectedReasonCode)?.code || 'None'}
            </span>
          </div>
          {redactionTool.isDrawing && (
            <div className="status-item">
              <span className="status-indicator status-indicator--active">
                Drawing in progress...
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="instructions-section">
        <h4>Instructions</h4>
        <ol className="instructions-list">
          <li>Select a redaction tool from the options above</li>
          <li>Choose the appropriate reason code</li>
          <li>Click and drag on the document to create redactions</li>
          <li>Use the Select tool to modify existing redactions</li>
          <li>Review and approve redactions before finalizing</li>
        </ol>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="shortcuts-section">
        <h4>Keyboard Shortcuts</h4>
        <dl className="shortcuts-list">
          <dt>R</dt>
          <dd>Rectangle tool</dd>
          <dt>H</dt>
          <dd>Highlight tool</dd>
          <dt>B</dt>
          <dd>Blackout tool</dd>
          <dt>S</dt>
          <dd>Select tool</dd>
          <dt>Esc</dt>
          <dd>Cancel current operation</dd>
          <dt>Delete</dt>
          <dd>Remove selected redaction</dd>
        </dl>
      </div>
    </div>
  );
}