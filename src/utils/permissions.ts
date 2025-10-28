import { UserRole, ROLE_PERMISSIONS } from '@/types';

export function hasPermission(
  userRole: UserRole,
  resource: string,
  action: string
): boolean {
  const permissions = ROLE_PERMISSIONS[userRole];
  return permissions.some(p => 
    p.resource === resource && 
    p.action === action && 
    p.granted
  );
}

export function canUploadDocuments(userRole: UserRole): boolean {
  return hasPermission(userRole, 'document', 'upload');
}

export function canCreateRedactions(userRole: UserRole): boolean {
  return hasPermission(userRole, 'redaction', 'create');
}

export function canEditRedactions(userRole: UserRole): boolean {
  return hasPermission(userRole, 'redaction', 'edit');
}

export function canApproveRedactions(userRole: UserRole): boolean {
  return hasPermission(userRole, 'redaction', 'approve');
}

export function canApproveVersions(userRole: UserRole): boolean {
  return hasPermission(userRole, 'version', 'approve');
}

export function getRoleDisplayName(role: UserRole): string {
  const roleNames = {
    viewer: 'Viewer',
    redactor: 'Redactor',
    approver: 'Approver'
  };
  return roleNames[role];
}

export function getRoleDescription(role: UserRole): string {
  const descriptions = {
    viewer: 'Can view documents and redactions but cannot make changes',
    redactor: 'Can upload documents and create/edit redactions',
    approver: 'Can perform all actions including approving redactions and finalizing documents'
  };
  return descriptions[role];
}

export function getAvailableActions(userRole: UserRole): string[] {
  const permissions = ROLE_PERMISSIONS[userRole];
  return permissions
    .filter(p => p.granted)
    .map(p => `${p.resource}.${p.action}`);
}