import { EncryptionKey, SecureCache, FOIError } from '@/types';
import { v4 as uuidv4 } from 'uuid';

class EncryptionService {
  private sessionKey: EncryptionKey | null = null;
  private readonly CACHE_PREFIX = 'foi_secure_';
  private readonly SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours

  async initializeSession(): Promise<void> {
    try {
      // Generate a new AES-GCM key for this session
      const key = await crypto.subtle.generateKey(
        {
          name: 'AES-GCM',
          length: 256,
        },
        false, // not extractable
        ['encrypt', 'decrypt']
      );

      const iv = crypto.getRandomValues(new Uint8Array(12));
      const sessionId = uuidv4();

      this.sessionKey = {
        key,
        iv,
        sessionId,
      };

      console.log('[ENCRYPTION] Session initialized with key:', sessionId);
    } catch (error) {
      throw new FOIError(
        'Failed to initialize encryption session',
        'ENCRYPTION_INIT_FAILED',
        500,
        { error }
      );
    }
  }

  async encryptData(data: string | ArrayBuffer): Promise<string> {
    if (!this.sessionKey) {
      await this.initializeSession();
    }

    try {
      const encoder = new TextEncoder();
      const dataBuffer = typeof data === 'string' ? encoder.encode(data) : data;
      
      const encrypted = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: new Uint8Array(this.sessionKey!.iv),
        },
        this.sessionKey!.key,
        dataBuffer
      );

      // Convert to base64 for storage
      const encryptedArray = new Uint8Array(encrypted);
      return btoa(String.fromCharCode(...encryptedArray));
    } catch (error) {
      throw new FOIError(
        'Failed to encrypt data',
        'ENCRYPTION_FAILED',
        500,
        { error }
      );
    }
  }

  async decryptData(encryptedData: string): Promise<ArrayBuffer> {
    if (!this.sessionKey) {
      throw new FOIError(
        'No encryption session available',
        'ENCRYPTION_NO_SESSION',
        400
      );
    }

    try {
      // Convert from base64
      const encryptedArray = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      );

      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: new Uint8Array(this.sessionKey.iv),
        },
        this.sessionKey.key,
        encryptedArray
      );

      return decrypted;
    } catch (error) {
      throw new FOIError(
        'Failed to decrypt data',
        'DECRYPTION_FAILED',
        500,
        { error }
      );
    }
  }

  async cacheDocument(documentId: string, data: string | ArrayBuffer): Promise<void> {
    try {
      const encryptedData = await this.encryptData(data);
      const iv = btoa(String.fromCharCode(...this.sessionKey!.iv));
      
      const cache: SecureCache = {
        documentId,
        encryptedData,
        iv,
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + this.SESSION_DURATION),
      };

      localStorage.setItem(
        `${this.CACHE_PREFIX}${documentId}`,
        JSON.stringify(cache)
      );

      console.log('[ENCRYPTION] Document cached securely:', documentId);
    } catch (error) {
      throw new FOIError(
        'Failed to cache document',
        'CACHE_FAILED',
        500,
        { documentId, error }
      );
    }
  }

  async getCachedDocument(documentId: string): Promise<ArrayBuffer | null> {
    try {
      const cacheData = localStorage.getItem(`${this.CACHE_PREFIX}${documentId}`);
      if (!cacheData) {
        return null;
      }

      const cache: SecureCache = JSON.parse(cacheData);
      
      // Check if cache has expired
      if (new Date() > new Date(cache.expiresAt)) {
        this.removeCachedDocument(documentId);
        return null;
      }

      return await this.decryptData(cache.encryptedData);
    } catch (error) {
      console.error('[ENCRYPTION] Failed to retrieve cached document:', error);
      this.removeCachedDocument(documentId);
      return null;
    }
  }

  removeCachedDocument(documentId: string): void {
    localStorage.removeItem(`${this.CACHE_PREFIX}${documentId}`);
    console.log('[ENCRYPTION] Cached document removed:', documentId);
  }

  async panicClear(): Promise<void> {
    try {
      // Clear all cached documents
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith(this.CACHE_PREFIX)) {
          localStorage.removeItem(key);
        }
      }

      // Clear session storage
      sessionStorage.clear();

      // Reset session key
      this.sessionKey = null;

      // Clear any temporary DOM elements or canvases
      const tempElements = document.querySelectorAll('[data-temp="true"]');
      tempElements.forEach(el => el.remove());

      // Force garbage collection if available
      if ('gc' in window) {
        (window as any).gc();
      }

      console.log('[ENCRYPTION] Panic clear completed - all cached data wiped');
    } catch (error) {
      console.error('[ENCRYPTION] Panic clear failed:', error);
      throw new FOIError(
        'Failed to clear cached data',
        'PANIC_CLEAR_FAILED',
        500,
        { error }
      );
    }
  }

  getCachedDocumentIds(): string[] {
    const keys = Object.keys(localStorage);
    return keys
      .filter(key => key.startsWith(this.CACHE_PREFIX))
      .map(key => key.replace(this.CACHE_PREFIX, ''));
  }

  getSessionInfo(): { sessionId: string | null; hasKey: boolean } {
    return {
      sessionId: this.sessionKey?.sessionId || null,
      hasKey: this.sessionKey !== null,
    };
  }

  // Generate hash for document integrity
  async generateHash(data: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    return btoa(String.fromCharCode(...hashArray));
  }

  async verifyHash(data: ArrayBuffer, expectedHash: string): Promise<boolean> {
    const actualHash = await this.generateHash(data);
    return actualHash === expectedHash;
  }
}

export const encryptionService = new EncryptionService();