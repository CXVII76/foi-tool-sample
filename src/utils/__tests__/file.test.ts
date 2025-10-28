import { describe, it, expect } from 'vitest';
import {
  isValidFileType,
  isValidFileSize,
  getDocumentType,
  formatFileSize,
  validateFileName,
  sanitizeFilename,
  MAX_FILE_SIZE,
} from '../file';

describe('File Utils', () => {
  describe('isValidFileType', () => {
    it('should accept valid PDF files', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      expect(isValidFileType(file)).toBe(true);
    });

    it('should accept valid DOC files', () => {
      const file = new File(['content'], 'test.doc', { type: 'application/msword' });
      expect(isValidFileType(file)).toBe(true);
    });

    it('should accept valid DOCX files', () => {
      const file = new File(['content'], 'test.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      expect(isValidFileType(file)).toBe(true);
    });

    it('should accept valid RTF files', () => {
      const file1 = new File(['content'], 'test.rtf', { type: 'application/rtf' });
      const file2 = new File(['content'], 'test.rtf', { type: 'text/rtf' });
      expect(isValidFileType(file1)).toBe(true);
      expect(isValidFileType(file2)).toBe(true);
    });

    it('should accept valid TXT files', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      expect(isValidFileType(file)).toBe(true);
    });

    it('should reject invalid file types', () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      expect(isValidFileType(file)).toBe(false);
    });
  });

  describe('isValidFileSize', () => {
    it('should accept files under the size limit', () => {
      const file = new File(['a'.repeat(1000)], 'test.txt', { type: 'text/plain' });
      expect(isValidFileSize(file)).toBe(true);
    });

    it('should reject files over the size limit', () => {
      // Create a File object and mock its size property to avoid creating huge strings in memory
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      Object.defineProperty(file, 'size', { value: MAX_FILE_SIZE + 1 });
      expect(isValidFileSize(file)).toBe(false);
    });

    it('should accept files exactly at the size limit', () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      Object.defineProperty(file, 'size', { value: MAX_FILE_SIZE });
      expect(isValidFileSize(file)).toBe(true);
    });
  });

  describe('getDocumentType', () => {
    it('should return correct document type for PDF', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      expect(getDocumentType(file)).toBe('pdf');
    });

    it('should return correct document type for DOC', () => {
      const file = new File(['content'], 'test.doc', { type: 'application/msword' });
      expect(getDocumentType(file)).toBe('doc');
    });

    it('should return null for unsupported types', () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      expect(getDocumentType(file)).toBeNull();
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(500)).toBe('500 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });
  });

  describe('validateFileName', () => {
    it('should accept valid filenames', () => {
      expect(validateFileName('document.pdf')).toEqual({ valid: true });
      expect(validateFileName('my-file_v2.docx')).toEqual({ valid: true });
      expect(validateFileName('report 2023.txt')).toEqual({ valid: true });
    });

    it('should reject empty filenames', () => {
      expect(validateFileName('')).toEqual({ 
        valid: false, 
        error: 'Filename cannot be empty' 
      });
      expect(validateFileName('   ')).toEqual({ 
        valid: false, 
        error: 'Filename cannot be empty' 
      });
    });

    it('should reject filenames that are too long', () => {
      const longName = 'a'.repeat(256) + '.pdf';
      expect(validateFileName(longName)).toEqual({ 
        valid: false, 
        error: 'Filename too long (max 255 characters)' 
      });
    });

    it('should reject filenames with invalid characters', () => {
      expect(validateFileName('file<name>.pdf')).toEqual({ 
        valid: false, 
        error: 'Filename contains invalid characters' 
      });
      expect(validateFileName('file|name.pdf')).toEqual({ 
        valid: false, 
        error: 'Filename contains invalid characters' 
      });
    });

    it('should reject unsupported file extensions', () => {
      expect(validateFileName('image.jpg')).toEqual({ 
        valid: false, 
        error: 'File type not supported. Allowed types: .pdf, .doc, .docx, .rtf, .txt' 
      });
    });
  });

  describe('sanitizeFilename', () => {
    it('should sanitize invalid characters', () => {
      expect(sanitizeFilename('file<name>.pdf')).toBe('file_name_.pdf');
      expect(sanitizeFilename('file|name.pdf')).toBe('file_name.pdf');
      expect(sanitizeFilename('file  name.pdf')).toBe('file_name.pdf');
    });

    it('should handle multiple consecutive spaces and underscores', () => {
      expect(sanitizeFilename('file   name___test.pdf')).toBe('file_name_test.pdf');
    });

    it('should remove leading and trailing underscores', () => {
      expect(sanitizeFilename('_filename_.pdf')).toBe('filename_.pdf');
    });

    it('should handle already clean filenames', () => {
      expect(sanitizeFilename('clean-filename.pdf')).toBe('clean-filename.pdf');
    });
  });
});