// Core domain types
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
}

export type UserRole = 'viewer' | 'redactor' | 'approver';

export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  size: number;
  uploadedAt: Date;
  uploadedBy: string;
  versions: DocumentVersion[];
  currentVersion: DocumentVersionType;
  hash?: string;
}

export type DocumentType = 'pdf' | 'doc' | 'docx' | 'rtf' | 'txt';
export type DocumentVersionType = 'original' | 'working' | 'final';

export interface DocumentVersion {
  id: string;
  type: DocumentVersionType;
  content: string | ArrayBuffer;
  redactions: Redaction[];
  createdAt: Date;
  createdBy: string;
  hash: string;
  encrypted?: boolean;
}

export interface Redaction {
  id: string;
  type: RedactionType;
  coordinates: RedactionCoordinates;
  reasonCode: string;
  customReason?: string;
  createdAt: Date;
  createdBy: string;
  approvedAt?: Date;
  approvedBy?: string;
  status: RedactionStatus;
}

export type RedactionType = 'rectangle' | 'highlight' | 'blackout';
export type RedactionStatus = 'suggested' | 'pending' | 'approved' | 'rejected';

export interface RedactionCoordinates {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ReasonCode {
  code: string;
  description: string;
  category: string;
  editable: boolean;
}

// Default reason codes for Australian FOI
export const DEFAULT_REASON_CODES: ReasonCode[] = [
  { code: 'FOI s 22', description: 'Personal information', category: 'Privacy', editable: true },
  { code: 'FOI s 33', description: 'Documents affecting national security', category: 'Security', editable: true },
  { code: 'FOI s 37', description: 'Documents affecting enforcement of law', category: 'Law Enforcement', editable: true },
  { code: 'FOI s 42', description: 'Legal professional privilege', category: 'Legal', editable: true },
  { code: 'FOI s 47F', description: 'Personal privacy', category: 'Privacy', editable: true },
];

// API types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
}

export interface UploadResponse {
  documentId: string;
  presignedUrl: string;
  expiresAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

// Audit logging
export interface AuditEvent {
  id: string;
  userId: string;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  details: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export type AuditAction = 
  | 'document.upload'
  | 'document.view'
  | 'document.download'
  | 'redaction.create'
  | 'redaction.edit'
  | 'redaction.approve'
  | 'redaction.reject'
  | 'version.create'
  | 'version.approve'
  | 'auth.login'
  | 'auth.logout'
  | 'cache.clear'
  | 'panic.clear';

// UI State types
export interface AppState {
  user: User | null;
  currentDocument: Document | null;
  isLoading: boolean;
  error: string | null;
}

export interface RedactionToolState {
  selectedTool: RedactionType | null;
  selectedReasonCode: string;
  isDrawing: boolean;
  activeRedaction: Redaction | null;
}

// Security types
export interface EncryptionKey {
  key: CryptoKey;
  iv: Uint8Array;
  sessionId: string;
}

export interface SecureCache {
  documentId: string;
  encryptedData: string;
  iv: string;
  timestamp: Date;
  expiresAt: Date;
}

// Error types
export class FOIError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'FOIError';
  }
}

// Permissions
export interface Permission {
  resource: string;
  action: string;
  granted: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  viewer: [
    { resource: 'document', action: 'view', granted: true },
    { resource: 'document', action: 'upload', granted: false },
    { resource: 'redaction', action: 'create', granted: false },
    { resource: 'redaction', action: 'edit', granted: false },
    { resource: 'redaction', action: 'approve', granted: false },
    { resource: 'version', action: 'approve', granted: false },
  ],
  redactor: [
    { resource: 'document', action: 'view', granted: true },
    { resource: 'document', action: 'upload', granted: true },
    { resource: 'redaction', action: 'create', granted: true },
    { resource: 'redaction', action: 'edit', granted: true },
    { resource: 'redaction', action: 'approve', granted: false },
    { resource: 'version', action: 'approve', granted: false },
  ],
  approver: [
    { resource: 'document', action: 'view', granted: true },
    { resource: 'document', action: 'upload', granted: true },
    { resource: 'redaction', action: 'create', granted: true },
    { resource: 'redaction', action: 'edit', granted: true },
    { resource: 'redaction', action: 'approve', granted: true },
    { resource: 'version', action: 'approve', granted: true },
  ],
};