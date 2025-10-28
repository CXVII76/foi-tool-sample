import { useState, useCallback } from 'react';
import { useAppStore } from '@/stores/app.store';
import { apiService } from '@/services/api.service';
import { encryptionService } from '@/services/encryption.service';
import { auditService } from '@/services/audit.service';
import { 
  isValidFileType, 
  isValidFileSize, 
  validateFileName, 
  getDocumentType,
  readFileAsArrayBuffer 
} from '@/utils/file';
import { Document, FOIError } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
}

interface UseFileUploadReturn {
  uploadState: UploadState;
  uploadFile: (file: File) => Promise<Document | null>;
  resetUpload: () => void;
}

export function useFileUpload(): UseFileUploadReturn {
  const { user, addDocument, setError } = useAppStore();
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
  });

  const resetUpload = useCallback(() => {
    setUploadState({
      isUploading: false,
      progress: 0,
      error: null,
    });
  }, []);

  const uploadFile = useCallback(async (file: File): Promise<Document | null> => {
    if (!user) {
      const error = 'User not authenticated';
      setUploadState(prev => ({ ...prev, error }));
      return null;
    }

    try {
      setUploadState({
        isUploading: true,
        progress: 0,
        error: null,
      });

      // Validate file
      const fileNameValidation = validateFileName(file.name);
      if (!fileNameValidation.valid) {
        throw new FOIError(
          fileNameValidation.error!,
          'INVALID_FILENAME',
          400
        );
      }

      if (!isValidFileType(file)) {
        throw new FOIError(
          'File type not supported. Please upload PDF, DOC, DOCX, RTF, or TXT files.',
          'INVALID_FILE_TYPE',
          400
        );
      }

      if (!isValidFileSize(file)) {
        throw new FOIError(
          'File size exceeds 50MB limit.',
          'FILE_TOO_LARGE',
          400
        );
      }

      setUploadState(prev => ({ ...prev, progress: 10 }));

      // Read file content for caching
      const fileBuffer = await readFileAsArrayBuffer(file);
      setUploadState(prev => ({ ...prev, progress: 20 }));

      // Generate document hash for integrity
      const hash = await encryptionService.generateHash(fileBuffer);
      setUploadState(prev => ({ ...prev, progress: 30 }));

      // Create document object
      const documentType = getDocumentType(file);
      if (!documentType) {
        throw new FOIError(
          'Unable to determine document type',
          'UNKNOWN_DOCUMENT_TYPE',
          400
        );
      }

      const document: Document = {
        id: uuidv4(),
        name: file.name,
        type: documentType,
        size: file.size,
        uploadedAt: new Date(),
        uploadedBy: user.id,
        currentVersion: 'original',
        hash,
        versions: [
          {
            id: uuidv4(),
            type: 'original',
            content: fileBuffer,
            redactions: [],
            createdAt: new Date(),
            createdBy: user.id,
            hash,
            encrypted: false,
          }
        ],
      };

      setUploadState(prev => ({ ...prev, progress: 50 }));

      // Cache document locally (encrypted)
      await encryptionService.cacheDocument(document.id, fileBuffer);
      setUploadState(prev => ({ ...prev, progress: 70 }));

      // In a real implementation, this would upload to the server
      // For now, we'll simulate the API call
      try {
        const uploadResponse = await apiService.uploadDocument(file);
        console.log('[UPLOAD] Mock server response:', uploadResponse);
      } catch (apiError) {
        // Continue with local-only mode if API fails
        console.warn('[UPLOAD] API upload failed, continuing in local mode:', apiError);
      }

      setUploadState(prev => ({ ...prev, progress: 90 }));

      // Add to store
      addDocument(document);

      // Audit log
      await auditService.log({
        userId: user.id,
        action: 'document.upload',
        resourceType: 'document',
        resourceId: document.id,
        details: {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          hash,
        },
      });

      setUploadState({
        isUploading: false,
        progress: 100,
        error: null,
      });

      return document;

    } catch (error) {
      const errorMessage = error instanceof FOIError 
        ? error.message 
        : 'Upload failed. Please try again.';

      setUploadState({
        isUploading: false,
        progress: 0,
        error: errorMessage,
      });

      setError(errorMessage);

      // Audit log for failed upload
      if (user) {
        await auditService.log({
          userId: user.id,
          action: 'document.upload',
          resourceType: 'document',
          resourceId: 'failed',
          details: {
            fileName: file.name,
            error: errorMessage,
          },
        });
      }

      return null;
    }
  }, [user, addDocument, setError]);

  return {
    uploadState,
    uploadFile,
    resetUpload,
  };
}