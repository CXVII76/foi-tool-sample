import axios, { AxiosInstance } from 'axios';
import { ApiResponse, UploadResponse, Document, FOIError } from '@/types';
import { authService } from './auth.service';
import { auditService } from './audit.service';

interface ApiConfig {
  baseURL: string;
  timeout: number;
  retries: number;
}

class ApiService {
  private client: AxiosInstance;
  private config: ApiConfig;

  constructor(config?: Partial<ApiConfig>) {
    this.config = {
      baseURL: import.meta.env.VITE_API_BASE_URL || 'https://api.foi-redaction.gov.au',
      timeout: 30000,
      retries: 3,
      ...config,
    };

    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor for auth
    this.client.interceptors.request.use(
      async (config) => {
        const token = authService.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add CSRF token if available
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        if (csrfToken) {
          config.headers['X-CSRF-Token'] = csrfToken;
        }

        // Add request ID for tracing
        config.headers['X-Request-ID'] = this.generateRequestId();

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling and token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Handle 401 errors with token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            if (authService.isTokenExpired()) {
              await authService.refreshToken();
              const newToken = authService.getAccessToken();
              if (newToken) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return this.client(originalRequest);
              }
            }
          } catch (refreshError) {
            // Refresh failed, redirect to login
            await authService.logout();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        // Transform axios errors to FOI errors
        const foiError = this.transformError(error);
        return Promise.reject(foiError);
      }
    );
  }

  private transformError(error: any): FOIError {
    if (error.response) {
      // Server responded with error status
      return new FOIError(
        error.response.data?.message || 'Server error',
        error.response.data?.code || 'SERVER_ERROR',
        error.response.status,
        {
          url: error.config?.url,
          method: error.config?.method,
          data: error.response.data,
        }
      );
    } else if (error.request) {
      // Request made but no response
      return new FOIError(
        'Network error - no response from server',
        'NETWORK_ERROR',
        0,
        { url: error.config?.url }
      );
    } else {
      // Something else happened
      return new FOIError(
        error.message || 'Unknown error',
        'UNKNOWN_ERROR',
        0,
        { originalError: error }
      );
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Document operations
  async uploadDocument(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', file.type);
    formData.append('size', file.size.toString());

    const response = await this.client.post<ApiResponse<UploadResponse>>(
      '/documents/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          );
          console.log(`Upload progress: ${percentCompleted}%`);
        },
      }
    );

    if (!response.data.success) {
      throw new FOIError(
        response.data.message || 'Upload failed',
        'UPLOAD_FAILED',
        400,
        { errors: response.data.errors }
      );
    }

    // Audit log
    const user = authService.getCurrentUser();
    if (user) {
      await auditService.log({
        userId: user.id,
        action: 'document.upload',
        resourceType: 'document',
        resourceId: response.data.data.documentId,
        details: {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
        },
      });
    }

    return response.data.data;
  }

  async getDocument(documentId: string): Promise<Document> {
    const response = await this.client.get<ApiResponse<Document>>(
      `/documents/${documentId}`
    );

    if (!response.data.success) {
      throw new FOIError(
        response.data.message || 'Failed to fetch document',
        'DOCUMENT_FETCH_FAILED',
        400
      );
    }

    return response.data.data;
  }

  async downloadDocument(documentId: string, version: 'original' | 'working' | 'final'): Promise<Blob> {
    const response = await this.client.get(
      `/documents/${documentId}/download/${version}`,
      {
        responseType: 'blob',
      }
    );

    // Audit log
    const user = authService.getCurrentUser();
    if (user) {
      await auditService.log({
        userId: user.id,
        action: 'document.download',
        resourceType: 'document',
        resourceId: documentId,
        details: { version },
      });
    }

    return response.data;
  }

  async getPresignedUploadUrl(fileName: string, fileType: string): Promise<string> {
    const response = await this.client.post<ApiResponse<{ uploadUrl: string }>>(
      '/documents/presigned-upload',
      { fileName, fileType }
    );

    if (!response.data.success) {
      throw new FOIError(
        response.data.message || 'Failed to get upload URL',
        'PRESIGNED_URL_FAILED',
        400
      );
    }

    return response.data.data.uploadUrl;
  }

  async getPresignedDownloadUrl(documentId: string, version: string): Promise<string> {
    const response = await this.client.get<ApiResponse<{ downloadUrl: string }>>(
      `/documents/${documentId}/presigned-download/${version}`
    );

    if (!response.data.success) {
      throw new FOIError(
        response.data.message || 'Failed to get download URL',
        'PRESIGNED_URL_FAILED',
        400
      );
    }

    return response.data.data.downloadUrl;
  }

  // Redaction operations
  async saveRedactions(documentId: string, redactions: any[]): Promise<void> {
    const response = await this.client.put<ApiResponse<void>>(
      `/documents/${documentId}/redactions`,
      { redactions }
    );

    if (!response.data.success) {
      throw new FOIError(
        response.data.message || 'Failed to save redactions',
        'REDACTION_SAVE_FAILED',
        400
      );
    }
  }

  async approveRedactions(documentId: string, redactionIds: string[]): Promise<void> {
    const response = await this.client.post<ApiResponse<void>>(
      `/documents/${documentId}/redactions/approve`,
      { redactionIds }
    );

    if (!response.data.success) {
      throw new FOIError(
        response.data.message || 'Failed to approve redactions',
        'REDACTION_APPROVAL_FAILED',
        400
      );
    }
  }

  async finalizeDocument(documentId: string): Promise<{ hash: string }> {
    const response = await this.client.post<ApiResponse<{ hash: string }>>(
      `/documents/${documentId}/finalize`
    );

    if (!response.data.success) {
      throw new FOIError(
        response.data.message || 'Failed to finalize document',
        'DOCUMENT_FINALIZE_FAILED',
        400
      );
    }

    return response.data.data;
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await this.client.get<{ status: string; timestamp: string }>('/health');
    return response.data;
  }

  // Update configuration
  updateConfig(newConfig: Partial<ApiConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.client.defaults.baseURL = this.config.baseURL;
    this.client.defaults.timeout = this.config.timeout;
  }

  // Get current configuration
  getConfig(): ApiConfig {
    return { ...this.config };
  }
}

// Create singleton instance
export const apiService = new ApiService();

// Export class for testing
export { ApiService };