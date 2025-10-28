import { useMemo } from 'react';
import { useAuth } from '@/stores/app.store';
import { 
  hasPermission, 
  canUploadDocuments, 
  canCreateRedactions, 
  canEditRedactions, 
  canApproveRedactions, 
  canApproveVersions 
} from '@/utils/permissions';

export function usePermissions() {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user) {
      return {
        hasPermission: () => false,
        canUpload: false,
        canCreateRedactions: false,
        canEditRedactions: false,
        canApproveRedactions: false,
        canApproveVersions: false,
      };
    }

    return {
      hasPermission: (resource: string, action: string) => 
        hasPermission(user.role, resource, action),
      canUpload: canUploadDocuments(user.role),
      canCreateRedactions: canCreateRedactions(user.role),
      canEditRedactions: canEditRedactions(user.role),
      canApproveRedactions: canApproveRedactions(user.role),
      canApproveVersions: canApproveVersions(user.role),
    };
  }, [user]);
}