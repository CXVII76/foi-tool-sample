import { useRef, useEffect, useState, useCallback } from 'react';
import { Document as PDFDocument, Page, pdfjs } from 'react-pdf';
import { fabric } from 'fabric';
import { useDocuments, useRedactionTool } from '@/stores/app.store';
import { usePermissions } from '@/hooks/usePermissions';
import { encryptionService } from '@/services/encryption.service';
import { RedactionType } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface DocumentViewerProps {
  className?: string;
}

export function DocumentViewer({ className = '' }: DocumentViewerProps) {
  const { currentDocument } = useDocuments();
  const { redactionTool, setRedactionTool } = useRedactionTool();
  const { canCreateRedactions, canEditRedactions } = usePermissions();
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [documentContent, setDocumentContent] = useState<ArrayBuffer | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load document content
  useEffect(() => {
    if (!currentDocument) {
      setDocumentContent(null);
      return;
    }

    const loadDocument = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Try to get from cache first
        const cached = await encryptionService.getCachedDocument(currentDocument.id);
        if (cached) {
          setDocumentContent(cached);
        } else {
          // Fallback to document versions
          const currentVersion = currentDocument.versions.find(
            v => v.type === currentDocument.currentVersion
          );
          if (currentVersion && currentVersion.content instanceof ArrayBuffer) {
            setDocumentContent(currentVersion.content);
          } else {
            throw new Error('Document content not available');
          }
        }
      } catch (err) {
        setError('Failed to load document content');
        //console.error('Document loading error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDocument();
  }, [currentDocument]);

  // Initialize Fabric.js canvas for redaction overlay
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      isDrawingMode: false,
      selection: canEditRedactions,
      preserveObjectStacking: true,
    });

    fabricCanvasRef.current = canvas;

    // Set up event handlers
    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);
    canvas.on('object:selected', handleObjectSelected);
    canvas.on('object:modified', handleObjectModified);

    return () => {
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, [canEditRedactions]);

  // Handle redaction tool changes
  useEffect(() => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    canvas.isDrawingMode = redactionTool.selectedTool !== null && redactionTool.isDrawing;
    
    if (redactionTool.selectedTool) {
      canvas.setCursor('crosshair');
    } else {
      canvas.setCursor('default');
    }
  }, [redactionTool.selectedTool, redactionTool.isDrawing]);

  const handleMouseDown = useCallback((event: fabric.IEvent) => {
    if (!canCreateRedactions || !redactionTool.selectedTool || !fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    const pointer = canvas.getPointer(event.e);
    
    setRedactionTool({ isDrawing: true });
    
    // Start creating a new redaction
    const redactionRect = new fabric.Rect({
      left: pointer.x,
      top: pointer.y,
      width: 0,
      height: 0,
      fill: getRedactionColor(redactionTool.selectedTool),
      stroke: getRedactionBorderColor(redactionTool.selectedTool),
      strokeWidth: 2,
      opacity: 0.7,
      selectable: canEditRedactions,
      data: {
        type: redactionTool.selectedTool,
        reasonCode: redactionTool.selectedReasonCode,
        page: currentPage,
      },
    });

    canvas.add(redactionRect);
    canvas.setActiveObject(redactionRect);
  }, [canCreateRedactions, redactionTool, currentPage, canEditRedactions]);

  const handleMouseMove = useCallback((event: fabric.IEvent) => {
    if (!redactionTool.isDrawing || !fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    const pointer = canvas.getPointer(event.e);
    const activeObject = canvas.getActiveObject();

    if (activeObject && activeObject.type === 'rect') {
      const rect = activeObject as fabric.Rect;
      const startX = rect.data?.startX || rect.left;
      const startY = rect.data?.startY || rect.top;

      rect.set({
        width: Math.abs(pointer.x - startX),
        height: Math.abs(pointer.y - startY),
        left: Math.min(pointer.x, startX),
        top: Math.min(pointer.y, startY),
      });

      canvas.renderAll();
    }
  }, [redactionTool.isDrawing]);

  const handleMouseUp = useCallback(() => {
    if (!redactionTool.isDrawing) return;

    setRedactionTool({ isDrawing: false });
    
    // Finalize the redaction
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      const activeObject = canvas.getActiveObject();
      if (activeObject && activeObject.type === 'rect') {
        const rect = activeObject as fabric.Rect;
        
        // Only keep redactions with meaningful size
        if ((rect.width || 0) < 5 || (rect.height || 0) < 5) {
          canvas.remove(rect);
        } else {
          // Add redaction ID for tracking
          rect.set('data', {
            ...rect.data,
            id: uuidv4(),
          });
        }
      }
    }
  }, [redactionTool.isDrawing]);

  const handleObjectSelected = useCallback((event: fabric.IEvent) => {
    const selectedObject = event.target;
    if (selectedObject && selectedObject.data) {
      // Show redaction details or allow editing
      //console.log('Redaction selected:', selectedObject.data);
    }
  }, []);

  const handleObjectModified = useCallback((event: fabric.IEvent) => {
    const modifiedObject = event.target;
    if (modifiedObject && modifiedObject.data) {
      // Update redaction coordinates
      //console.log('Redaction modified:', modifiedObject.data);
    }
  }, []);

  const handleDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Clear canvas when changing pages
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.clear();
    }
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3.0));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleZoomReset = () => {
    setScale(1.0);
  };

  if (!currentDocument) {
    return (
      <div className={`document-viewer document-viewer--empty ${className}`}>
        <div className="empty-state">
          <div className="empty-state__icon" aria-hidden="true">📄</div>
          <h3>No Document Selected</h3>
          <p>Select a document from the list to view and redact it.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`document-viewer document-viewer--loading ${className}`}>
        <div className="loading-state">
          <div className="loading-spinner" aria-hidden="true"></div>
          <p>Loading document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`document-viewer document-viewer--error ${className}`}>
        <div className="error-state" role="alert">
          <h3>Error Loading Document</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`document-viewer ${className}`}>
      {/* Toolbar */}
      <div className="document-viewer__toolbar">
        <div className="toolbar-group">
          <button
            type="button"
            className="btn btn--secondary btn--small"
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
            aria-label="Zoom out"
          >
            −
          </button>
          <span className="zoom-level">{Math.round(scale * 100)}%</span>
          <button
            type="button"
            className="btn btn--secondary btn--small"
            onClick={handleZoomIn}
            disabled={scale >= 3.0}
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            className="btn btn--secondary btn--small"
            onClick={handleZoomReset}
            aria-label="Reset zoom"
          >
            Reset
          </button>
        </div>

        <div className="toolbar-group">
          <button
            type="button"
            className="btn btn--secondary btn--small"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            aria-label="Previous page"
          >
            ‹
          </button>
          <span className="page-info">
            Page {currentPage} of {numPages}
          </span>
          <button
            type="button"
            className="btn btn--secondary btn--small"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= numPages}
            aria-label="Next page"
          >
            ›
          </button>
        </div>
      </div>

      {/* Document Content */}
      <div className="document-viewer__content">
        <div className="document-container" style={{ transform: `scale(${scale})` }}>
          {currentDocument.type === 'pdf' && documentContent ? (
            <PDFDocument
              file={documentContent}
              onLoadSuccess={handleDocumentLoadSuccess}
              onLoadError={(error) => setError(`Failed to load PDF: ${error.message}`)}
            >
              <Page
                pageNumber={currentPage}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </PDFDocument>
          ) : (
            <div className="document-placeholder">
              <p>Document preview not available for {currentDocument.type.toUpperCase()} files.</p>
              <p>Redaction tools are still available.</p>
            </div>
          )}
          
          {/* Redaction Overlay Canvas */}
          <canvas
            ref={canvasRef}
            className="redaction-overlay"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              pointerEvents: redactionTool.selectedTool ? 'auto' : 'none',
            }}
          />
        </div>
      </div>
    </div>
  );
}

function getRedactionColor(type: RedactionType): string {
  switch (type) {
    case 'rectangle': return 'rgba(0, 0, 0, 0.8)';
    case 'highlight': return 'rgba(255, 255, 0, 0.5)';
    case 'blackout': return 'rgba(0, 0, 0, 1.0)';
    default: return 'rgba(0, 0, 0, 0.8)';
  }
}

function getRedactionBorderColor(type: RedactionType): string {
  switch (type) {
    case 'rectangle': return '#000000';
    case 'highlight': return '#ffff00';
    case 'blackout': return '#000000';
    default: return '#000000';
  }
}