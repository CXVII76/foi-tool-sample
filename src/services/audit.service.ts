import { AuditEvent, AuditAction } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface AuditLogRequest {
  userId: string;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  details: Record<string, any>;
}

class AuditService {
  private events: AuditEvent[] = [];
  private readonly MAX_EVENTS = 1000; // Keep last 1000 events in memory

  async log(request: AuditLogRequest): Promise<void> {
    const event: AuditEvent = {
      id: uuidv4(),
      userId: request.userId,
      action: request.action,
      resourceType: request.resourceType,
      resourceId: request.resourceId,
      details: request.details,
      timestamp: new Date(),
      ipAddress: this.getClientIP(),
      userAgent: navigator.userAgent,
    };

    // Add to in-memory store
    this.events.unshift(event);
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(0, this.MAX_EVENTS);
    }

    // Log to console for development
    console.log('[AUDIT]', {
      action: event.action,
      user: event.userId,
      resource: `${event.resourceType}:${event.resourceId}`,
      timestamp: event.timestamp.toISOString(),
      details: event.details,
    });

    // Send to mock endpoint (in production, this would be a real audit service)
    try {
      await this.sendToAuditEndpoint(event);
    } catch (error) {
      console.error('[AUDIT] Failed to send audit event:', error);
      // In production, you might want to queue failed events for retry
    }
  }

  getEvents(userId?: string, action?: AuditAction, limit = 50): AuditEvent[] {
    let filtered = this.events;

    if (userId) {
      filtered = filtered.filter(e => e.userId === userId);
    }

    if (action) {
      filtered = filtered.filter(e => e.action === action);
    }

    return filtered.slice(0, limit);
  }

  async exportAuditLog(startDate: Date, endDate: Date): Promise<string> {
    const filtered = this.events.filter(e => 
      e.timestamp >= startDate && e.timestamp <= endDate
    );

    // Convert to CSV format
    const headers = ['ID', 'User ID', 'Action', 'Resource Type', 'Resource ID', 'Timestamp', 'IP Address', 'Details'];
    const rows = filtered.map(e => [
      e.id,
      e.userId,
      e.action,
      e.resourceType,
      e.resourceId,
      e.timestamp.toISOString(),
      e.ipAddress || '',
      JSON.stringify(e.details),
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return csv;
  }

  private async sendToAuditEndpoint(_event: AuditEvent): Promise<void> {
    // Mock API call - in production this would be a real endpoint
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.95) { // 5% failure rate for testing
          reject(new Error('Mock audit endpoint failure'));
        } else {
          resolve();
        }
      }, 100);
    });
  }

  private getClientIP(): string {
    // In a real application, this would get the actual client IP
    // For now, return a mock IP
    return '192.168.1.100';
  }

  // Clear audit logs (for testing/development)
  clear(): void {
    this.events = [];
    console.log('[AUDIT] Audit log cleared');
  }
}

export const auditService = new AuditService();