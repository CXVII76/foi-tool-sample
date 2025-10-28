import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { User, Document, RedactionToolState, ReasonCode, DEFAULT_REASON_CODES } from '@/types';
// import { authService } from '@/services/auth.service';
import { encryptionService } from '@/services/encryption.service';

interface AppState {
  // Auth state
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Document state
  currentDocument: Document | null;
  documents: Document[];
  
  // Redaction tool state
  redactionTool: RedactionToolState;
  reasonCodes: ReasonCode[];
  
  // UI state
  error: string | null;
  sidebarOpen: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCurrentDocument: (document: Document | null) => void;
  addDocument: (document: Document) => void;
  updateDocument: (documentId: string, updates: Partial<Document>) => void;
  removeDocument: (documentId: string) => void;
  setRedactionTool: (tool: Partial<RedactionToolState>) => void;
  addReasonCode: (reasonCode: ReasonCode) => void;
  updateReasonCode: (code: string, updates: Partial<ReasonCode>) => void;
  removeReasonCode: (code: string) => void;
  setSidebarOpen: (open: boolean) => void;
  reset: () => void;
  panicClear: () => Promise<void>;
}

const initialRedactionToolState: RedactionToolState = {
  selectedTool: null,
  selectedReasonCode: DEFAULT_REASON_CODES[0].code,
  isDrawing: false,
  activeRedaction: null,
};

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        isAuthenticated: false,
        isLoading: false,
        currentDocument: null,
        documents: [],
        redactionTool: initialRedactionToolState,
        reasonCodes: [...DEFAULT_REASON_CODES],
        error: null,
        sidebarOpen: true,

        // Actions
        setUser: (user) => {
          set({ 
            user, 
            isAuthenticated: user !== null 
          }, false, 'setUser');
        },

        setLoading: (isLoading) => {
          set({ isLoading }, false, 'setLoading');
        },

        setError: (error) => {
          set({ error }, false, 'setError');
        },

        setCurrentDocument: (currentDocument) => {
          set({ currentDocument }, false, 'setCurrentDocument');
        },

        addDocument: (document) => {
          set((state) => ({
            documents: [...state.documents, document]
          }), false, 'addDocument');
        },

        updateDocument: (documentId, updates) => {
          set((state) => ({
            documents: state.documents.map(doc =>
              doc.id === documentId ? { ...doc, ...updates } : doc
            ),
            currentDocument: state.currentDocument?.id === documentId
              ? { ...state.currentDocument, ...updates }
              : state.currentDocument
          }), false, 'updateDocument');
        },

        removeDocument: (documentId) => {
          set((state) => ({
            documents: state.documents.filter(doc => doc.id !== documentId),
            currentDocument: state.currentDocument?.id === documentId
              ? null
              : state.currentDocument
          }), false, 'removeDocument');
        },

        setRedactionTool: (toolUpdates) => {
          set((state) => ({
            redactionTool: { ...state.redactionTool, ...toolUpdates }
          }), false, 'setRedactionTool');
        },

        addReasonCode: (reasonCode) => {
          set((state) => ({
            reasonCodes: [...state.reasonCodes, reasonCode]
          }), false, 'addReasonCode');
        },

        updateReasonCode: (code, updates) => {
          set((state) => ({
            reasonCodes: state.reasonCodes.map(rc =>
              rc.code === code ? { ...rc, ...updates } : rc
            )
          }), false, 'updateReasonCode');
        },

        removeReasonCode: (code) => {
          set((state) => ({
            reasonCodes: state.reasonCodes.filter(rc => rc.code !== code)
          }), false, 'removeReasonCode');
        },

        setSidebarOpen: (sidebarOpen) => {
          set({ sidebarOpen }, false, 'setSidebarOpen');
        },

        reset: () => {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            currentDocument: null,
            documents: [],
            redactionTool: initialRedactionToolState,
            reasonCodes: [...DEFAULT_REASON_CODES],
            error: null,
            sidebarOpen: true,
          }, false, 'reset');
        },

        panicClear: async () => {
          try {
            // Clear encryption service cache
            await encryptionService.panicClear();
            
            // Reset store state
            get().reset();
            
            // Clear any persisted state
            localStorage.removeItem('foi-app-storage');
            sessionStorage.clear();
            
            console.log('[STORE] Panic clear completed');
          } catch (error) {
            console.error('[STORE] Panic clear failed:', error);
            throw error;
          }
        },
      }),
      {
        name: 'foi-app-storage',
        partialize: (state) => ({
          // Only persist non-sensitive data
          reasonCodes: state.reasonCodes,
          sidebarOpen: state.sidebarOpen,
          // Don't persist user, documents, or current document for security
        }),
      }
    ),
    {
      name: 'foi-app-store',
    }
  )
);

// Selectors for better performance
export const useAuth = () => useAppStore((state) => ({
  user: state.user,
  isAuthenticated: state.isAuthenticated,
  setUser: state.setUser,
}));

export const useDocuments = () => useAppStore((state) => ({
  currentDocument: state.currentDocument,
  documents: state.documents,
  setCurrentDocument: state.setCurrentDocument,
  addDocument: state.addDocument,
  updateDocument: state.updateDocument,
  removeDocument: state.removeDocument,
}));

export const useRedactionTool = () => useAppStore((state) => ({
  redactionTool: state.redactionTool,
  reasonCodes: state.reasonCodes,
  setRedactionTool: state.setRedactionTool,
  addReasonCode: state.addReasonCode,
  updateReasonCode: state.updateReasonCode,
  removeReasonCode: state.removeReasonCode,
}));

export const useUI = () => useAppStore((state) => ({
  isLoading: state.isLoading,
  error: state.error,
  sidebarOpen: state.sidebarOpen,
  setLoading: state.setLoading,
  setError: state.setError,
  setSidebarOpen: state.setSidebarOpen,
}));