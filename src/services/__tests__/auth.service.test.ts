import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authService } from '../auth.service';
import { auditService } from '../audit.service';

// Mock audit service
vi.mock('../audit.service', () => ({
  auditService: {
    log: vi.fn(),
  },
}));

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset auth service state
    authService.logout();
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const user = await authService.login('viewer@foi.gov.au', 'password');
      
      expect(user).toEqual({
        id: '1',
        email: 'viewer@foi.gov.au',
        name: 'Jane Viewer',
        role: 'viewer',
        department: 'Department of Prime Minister and Cabinet'
      });
      
      expect(authService.isAuthenticated()).toBe(true);
      expect(authService.getCurrentUser()).toEqual(user);
      expect(auditService.log).toHaveBeenCalledWith({
        userId: '1',
        action: 'auth.login',
        resourceType: 'auth',
        resourceId: '1',
        details: { email: 'viewer@foi.gov.au', role: 'viewer' },
      });
    });

    it('should fail login with invalid credentials', async () => {
      await expect(authService.login('invalid@email.com', 'password'))
        .rejects.toThrow('Authentication failed');
      
      expect(authService.isAuthenticated()).toBe(false);
      expect(authService.getCurrentUser()).toBeNull();
    });

    it('should login redactor user', async () => {
      const user = await authService.login('redactor@foi.gov.au', 'password');
      
      expect(user.role).toBe('redactor');
      expect(user.name).toBe('John Redactor');
    });

    it('should login approver user', async () => {
      const user = await authService.login('approver@foi.gov.au', 'password');
      
      expect(user.role).toBe('approver');
      expect(user.name).toBe('Sarah Approver');
    });
  });

  describe('logout', () => {
    it('should successfully logout', async () => {
      // First login
      await authService.login('viewer@foi.gov.au', 'password');
      expect(authService.isAuthenticated()).toBe(true);
      
      // Then logout
      await authService.logout();
      
      expect(authService.isAuthenticated()).toBe(false);
      expect(authService.getCurrentUser()).toBeNull();
      expect(authService.getAccessToken()).toBeNull();
    });

    it('should log audit event on logout', async () => {
      await authService.login('viewer@foi.gov.au', 'password');
      await authService.logout();
      
      expect(auditService.log).toHaveBeenCalledWith({
        userId: '1',
        action: 'auth.logout',
        resourceType: 'auth',
        resourceId: '1',
        details: {},
      });
    });
  });

  describe('token management', () => {
    it('should generate access token on login', async () => {
      await authService.login('viewer@foi.gov.au', 'password');
      
      const token = authService.getAccessToken();
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
    });

    it('should refresh token', async () => {
      await authService.login('viewer@foi.gov.au', 'password');
      const originalToken = authService.getAccessToken();
      
      const newTokens = await authService.refreshToken();
      
      expect(newTokens.accessToken).toBeTruthy();
      expect(newTokens.refreshToken).toBeTruthy();
      expect(newTokens.expiresAt).toBeInstanceOf(Date);
      expect(newTokens.accessToken).not.toBe(originalToken);
    });

    it('should fail to refresh token when not authenticated', async () => {
      await expect(authService.refreshToken())
        .rejects.toThrow('No valid refresh token');
    });
  });

  describe('permissions', () => {
    it('should check viewer permissions', async () => {
      await authService.login('viewer@foi.gov.au', 'password');
      
      expect(authService.hasPermission('document', 'view')).toBe(true);
      expect(authService.hasPermission('document', 'upload')).toBe(false);
      expect(authService.hasPermission('redaction', 'create')).toBe(false);
      expect(authService.hasPermission('redaction', 'approve')).toBe(false);
    });

    it('should check redactor permissions', async () => {
      await authService.login('redactor@foi.gov.au', 'password');
      
      expect(authService.hasPermission('document', 'view')).toBe(true);
      expect(authService.hasPermission('document', 'upload')).toBe(true);
      expect(authService.hasPermission('redaction', 'create')).toBe(true);
      expect(authService.hasPermission('redaction', 'edit')).toBe(true);
      expect(authService.hasPermission('redaction', 'approve')).toBe(false);
    });

    it('should check approver permissions', async () => {
      await authService.login('approver@foi.gov.au', 'password');
      
      expect(authService.hasPermission('document', 'view')).toBe(true);
      expect(authService.hasPermission('document', 'upload')).toBe(true);
      expect(authService.hasPermission('redaction', 'create')).toBe(true);
      expect(authService.hasPermission('redaction', 'edit')).toBe(true);
      expect(authService.hasPermission('redaction', 'approve')).toBe(true);
      expect(authService.hasPermission('version', 'approve')).toBe(true);
    });

    it('should return false for permissions when not authenticated', () => {
      expect(authService.hasPermission('document', 'view')).toBe(false);
    });
  });

  describe('SAML handling', () => {
    it('should handle SAML response', async () => {
      const mockSamlResponse = 'mock-saml-response';
      const user = await authService.handleSAMLResponse(mockSamlResponse);
      
      expect(user).toEqual({
        id: '2',
        email: 'redactor@foi.gov.au',
        name: 'John Redactor',
        role: 'redactor',
        department: 'Department of Home Affairs'
      });
    });
  });
});