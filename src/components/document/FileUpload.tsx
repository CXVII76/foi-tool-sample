import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useFileUpload } from '@/hooks/useFileUpload';
import { usePermissions } from '@/hooks/usePermissions';
import { formatFileSize, ALLOWED_EXTENSIONS, MAX_FILE_SIZE } from '@/utils/file';

interface FileUploadProps {
  onUploadComplete?: (documentId: string) => void;
  className?: string;
}

export function FileUpload({ onUploadComplete, className = '' }: FileUploadProps) {
  const { canUpload } = usePermissions();
  const { uploadState, uploadFile, resetUpload } = useFileUpload();
  // const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!canUpload) {
      alert('You do not have permission to upload documents.');
      return;
    }

    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0]; // Only handle one file at a time
    const document = await uploadFile(file);
    
    if (document) {
      onUploadComplete?.(document.id);
    }
  }, [canUpload, uploadFile, onUploadComplete]);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragReject,
    fileRejections,
  } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/rtf': ['.rtf'],
      'text/rtf': ['.rtf'],
      'text/plain': ['.txt'],
    },
    maxSize: MAX_FILE_SIZE,
    maxFiles: 1,
    disabled: !canUpload || uploadState.isUploading,
    // onDragEnter: () => setDragActive(true),
    // onDragLeave: () => setDragActive(false),
    // onDropAccepted: () => setDragActive(false),
    // onDropRejected: () => setDragActive(false),
  });

  if (!canUpload) {
    return (
      <div className={`file-upload file-upload--disabled ${className}`}>
        <div className="file-upload__content">
          <div className="file-upload__icon" aria-hidden="true">📄</div>
          <p>You do not have permission to upload documents.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`file-upload ${className}`}>
      <div
        {...getRootProps()}
        className={`
          file-upload__dropzone
          ${isDragActive ? 'file-upload__dropzone--active' : ''}
          ${isDragReject ? 'file-upload__dropzone--reject' : ''}
          ${uploadState.isUploading ? 'file-upload__dropzone--uploading' : ''}
        `}
        role="button"
        tabIndex={0}
        aria-label="Upload document"
        aria-describedby="upload-instructions"
      >
        <input {...getInputProps()} />
        
        <div className="file-upload__content">
          {uploadState.isUploading ? (
            <>
              <div className="file-upload__icon" aria-hidden="true">⏳</div>
              <p>Uploading...</p>
              <div className="progress-bar">
                <div 
                  className="progress-bar__fill"
                  style={{ width: `${uploadState.progress}%` }}
                  role="progressbar"
                  aria-valuenow={uploadState.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Upload progress: ${uploadState.progress}%`}
                />
              </div>
              <p className="progress-text">{uploadState.progress}%</p>
            </>
          ) : isDragActive ? (
            <>
              <div className="file-upload__icon" aria-hidden="true">📁</div>
              <p>Drop the file here...</p>
            </>
          ) : (
            <>
              <div className="file-upload__icon" aria-hidden="true">📄</div>
              <p>
                <strong>Click to upload</strong> or drag and drop
              </p>
              <p className="file-upload__subtitle">
                Supported formats: {ALLOWED_EXTENSIONS.join(', ')}
              </p>
              <p className="file-upload__subtitle">
                Maximum size: {formatFileSize(MAX_FILE_SIZE)}
              </p>
            </>
          )}
        </div>
      </div>

      <div id="upload-instructions" className="file-upload__instructions">
        <h4>Upload Instructions</h4>
        <ul>
          <li>Only text-based documents are supported</li>
          <li>Files are encrypted and cached locally during processing</li>
          <li>Original files are not stored permanently on the server</li>
          <li>Use the 'Panic Clear' feature to immediately remove all cached data</li>
        </ul>
      </div>

      {uploadState.error && (
        <div className="file-upload__error" role="alert">
          <h4>Upload Error</h4>
          <p>{uploadState.error}</p>
          <button
            type="button"
            className="btn btn--secondary btn--small"
            onClick={resetUpload}
          >
            Try Again
          </button>
        </div>
      )}

      {fileRejections.length > 0 && (
        <div className="file-upload__rejections" role="alert">
          <h4>File Rejected</h4>
          {fileRejections.map(({ file, errors }) => (
            <div key={file.name} className="file-rejection">
              <p><strong>{file.name}</strong></p>
              <ul>
                {errors.map((error) => (
                  <li key={error.code}>
                    {error.code === 'file-too-large' 
                      ? `File is too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`
                      : error.code === 'file-invalid-type'
                      ? `File type not supported. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`
                      : error.message
                    }
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}