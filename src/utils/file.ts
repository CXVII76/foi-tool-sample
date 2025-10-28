import { DocumentType } from '@/types';

export const SUPPORTED_FILE_TYPES = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/rtf': 'rtf',
  'text/rtf': 'rtf',
  'text/plain': 'txt',
} as const;

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.rtf', '.txt'];

export function isValidFileType(file: File): boolean {
  return file.type in SUPPORTED_FILE_TYPES;
}

export function isValidFileSize(file: File): boolean {
  return file.size <= MAX_FILE_SIZE;
}

export function getDocumentType(file: File): DocumentType | null {
  const mimeType = file.type as keyof typeof SUPPORTED_FILE_TYPES;
  return SUPPORTED_FILE_TYPES[mimeType] || null;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getFileExtension(filename: string): string {
  return filename.slice(filename.lastIndexOf('.'));
}

export function validateFileName(filename: string): { valid: boolean; error?: string } {
  if (!filename || filename.trim() === '') {
    return { valid: false, error: 'Filename cannot be empty' };
  }

  if (filename.length > 255) {
    return { valid: false, error: 'Filename too long (max 255 characters)' };
  }

  // Check for invalid characters (control characters from 0x00 to 0x1f)
  // eslint-disable-next-line no-control-regex
  const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (invalidChars.test(filename)) {
    return { valid: false, error: 'Filename contains invalid characters' };
  }

  const extension = getFileExtension(filename);
  if (!ALLOWED_EXTENSIONS.includes(extension.toLowerCase())) {
    return { 
      valid: false, 
      error: `File type not supported. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}` 
    };
  }

  return { valid: true };
}

export async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL object
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

export function createFileFromArrayBuffer(
  buffer: ArrayBuffer, 
  filename: string, 
  mimeType: string
): File {
  return new File([buffer], filename, { type: mimeType });
}

// Sanitize filename for download
export function sanitizeFilename(filename: string): string {
  return filename
    // eslint-disable-next-line no-control-regex
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}