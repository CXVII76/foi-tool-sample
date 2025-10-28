import { User, AuthTokens, FOIError, ROLE_PERMISSIONS } from '@/types';
import { auditService } from './audit.service';

// Mock OIDC/SAML 2.0 SSO implementation
class AuthService {
  private readonly MOCK_USERS: User[] = [
    {
      id: '1',
      email: 'viewer@foi.gov.au',
      name: 'Jane Viewer',
      role: 'viewer',
      department: 'Department of Prime Minister and Cabinet'
    },
    {
      id: '2',
      email: 'redactor@foi.gov.au',
      name: 'John Redactor',
      role: 'redactor',
      department: 'Department of Home Affairs'
    },
    {
      id: '3',
      email: 'approver@foi.gov.au',
      name: 'Sarah Approver',
      role: 'approver',
      department: 'Attorney-General\'s Department'
    }
  ];

  private currentUser: User | null = null;
  private tokens: AuthTokens | null = null;

  async login(email: string, _password: string): Promise<User> {
    try {
      // Simulate OIDC/SAML flow
      await this.simulateOIDCFlow(email);
      
      const user = this.MOCK_USERS.find(u => u.email === email);
      if (!user) {
        throw new FOIError('Invalid credentials', 'AUTH_INVALID_CREDENTIALS', 401);
      }

      // Simulate MFA (assumed to be handled by OIDC provider)
      await this.simulateMFA();

      // Generate mock tokens
      this.tokens = {
        accessToken: this.generateMockJWT(user),
        refreshToken: this.generateMockRefreshToken(),
        expiresAt: new Date(Date.now() + 3600000) // 1 hour
      };

      this.currentUser = user;

      // Audit log
      await auditService.log({
        userId: user.id,
        action: 'auth.login',
        resourceType: 'auth',
        resourceId: user.id,
        details: { email, role: user.role },
      });

      return user;
    } catch (error) {
      throw new FOIError(
        'Authentication failed',
        'AUTH_FAILED',
        401,
        { originalError: error }
      );
    }
  }

  async logout(): Promise<void> {
    if (this.currentUser) {
      await auditService.log({
        userId: this.currentUser.id,
        action: 'auth.logout',
        resourceType: 'auth',
        resourceId: this.currentUser.id,
        details: {},
      });
    }

    this.currentUser = null;
    this.tokens = null;
    
    // Clear any cached data
    localStorage.removeItem('foi_session');
    sessionStorage.clear();
  }

  async refreshToken(): Promise<AuthTokens> {
    if (!this.tokens?.refreshToken || !this.currentUser) {
      throw new FOIError('No valid refresh token', 'AUTH_NO_REFRESH_TOKEN', 401);
    }

    // Simulate token refresh
    this.tokens = {
      accessToken: this.generateMockJWT(this.currentUser),
      refreshToken: this.generateMockRefreshToken(),
      expiresAt: new Date(Date.now() + 3600000)
    };

    return this.tokens;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  getAccessToken(): string | null {
    return this.tokens?.accessToken || null;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null && this.tokens !== null;
  }

  isTokenExpired(): boolean {
    if (!this.tokens) return true;
    return new Date() >= this.tokens.expiresAt;
  }

  hasPermission(resource: string, action: string): boolean {
    if (!this.currentUser) return false;
    
    const permissions = ROLE_PERMISSIONS[this.currentUser.role];
    
    return permissions.some(p => 
      p.resource === resource && 
      p.action === action && 
      p.granted
    );
  }

  private async simulateOIDCFlow(email: string): Promise<void> {
    // Simulate OIDC discovery and authorization flow
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`[MOCK OIDC] Redirecting to identity provider for ${email}`);
        console.log('[MOCK OIDC] User authenticated with MFA');
        resolve();
      }, 500);
    });
  }

  private async simulateMFA(): Promise<void> {
    // Simulate MFA challenge (assumed handled by OIDC provider)
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('[MOCK MFA] Multi-factor authentication successful');
        resolve();
      }, 200);
    });
  }

  private generateMockJWT(user: User): string {
    const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      iss: 'foi-redaction-tool',
      aud: 'foi-redaction-tool'
    }));
    const signature = 'mock-signature-' + Math.random().toString(36).substr(2, 9);
    
    return `${header}.${payload}.${signature}`;
  }

  private generateMockRefreshToken(): string {
    return 'refresh-' + Math.random().toString(36).substr(2, 32);
  }

  // Mock SAML response handler
  async handleSAMLResponse(_samlResponse: string): Promise<User> {
    // In a real implementation, this would validate the SAML response
    console.log('[MOCK SAML] Processing SAML response');
    
    // Extract user info from SAML response (mocked)
    const mockEmail = 'redactor@foi.gov.au'; // Would be extracted from SAML
    return this.login(mockEmail, 'mock-password');
  }
}

export const authService = new AuthService();