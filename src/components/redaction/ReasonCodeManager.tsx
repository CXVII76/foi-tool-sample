import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRedactionTool } from '@/stores/app.store';
import { ReasonCode } from '@/types';
// import { v4 as uuidv4 } from 'uuid';

const reasonCodeSchema = z.object({
  code: z.string().min(1, 'Code is required').max(20, 'Code must be 20 characters or less'),
  description: z.string().min(1, 'Description is required').max(200, 'Description must be 200 characters or less'),
  category: z.string().min(1, 'Category is required').max(50, 'Category must be 50 characters or less'),
});

type ReasonCodeFormData = z.infer<typeof reasonCodeSchema>;

interface ReasonCodeManagerProps {
  className?: string;
}

export function ReasonCodeManager({ className = '' }: ReasonCodeManagerProps) {
  const { reasonCodes, addReasonCode, updateReasonCode, removeReasonCode } = useRedactionTool();
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReasonCodeFormData>({
    resolver: zodResolver(reasonCodeSchema),
  });

  const handleAddNew = () => {
    setIsAddingNew(true);
    setEditingCode(null);
    reset({ code: '', description: '', category: '' });
  };

  const handleEdit = (reasonCode: ReasonCode) => {
    setEditingCode(reasonCode.code);
    setIsAddingNew(false);
    reset({
      code: reasonCode.code,
      description: reasonCode.description,
      category: reasonCode.category,
    });
  };

  const handleCancel = () => {
    setIsAddingNew(false);
    setEditingCode(null);
    reset();
  };

  const onSubmit = async (data: ReasonCodeFormData) => {
    try {
      if (isAddingNew) {
        // Check if code already exists
        if (reasonCodes.some(rc => rc.code === data.code)) {
          alert('A reason code with this code already exists.');
          return;
        }

        const newReasonCode: ReasonCode = {
          ...data,
          editable: true,
        };

        addReasonCode(newReasonCode);
      } else if (editingCode) {
        updateReasonCode(editingCode, data);
      }

      handleCancel();
    } catch (error) {
      console.error('Failed to save reason code:', error);
      alert('Failed to save reason code. Please try again.');
    }
  };

  const handleDelete = (code: string) => {
    const reasonCode = reasonCodes.find(rc => rc.code === code);
    if (!reasonCode) return;

    if (!reasonCode.editable) {
      alert('Default reason codes cannot be deleted.');
      return;
    }

    if (confirm(`Are you sure you want to delete the reason code "${code}"?`)) {
      removeReasonCode(code);
    }
  };

  const editableReasonCodes = reasonCodes.filter(rc => rc.editable);
  const defaultReasonCodes = reasonCodes.filter(rc => !rc.editable);

  return (
    <div className={`reason-code-manager ${className}`}>
      <div className="manager-header">
        <h3>Reason Code Management</h3>
        <p>Manage FOI exemption reason codes for redactions.</p>
      </div>

      {/* Add/Edit Form */}
      {(isAddingNew || editingCode) && (
        <div className="reason-form-section">
          <h4>{isAddingNew ? 'Add New Reason Code' : 'Edit Reason Code'}</h4>
          
          <form onSubmit={handleSubmit(onSubmit)} className="reason-form">
            <div className="form-group">
              <label htmlFor="reason-code" className="form-label">
                Code *
              </label>
              <input
                id="reason-code"
                type="text"
                className={`form-input ${errors.code ? 'form-input--error' : ''}`}
                {...register('code')}
                placeholder="e.g., FOI s 22"
                aria-describedby={errors.code ? 'code-error' : 'code-help'}
                disabled={!isAddingNew} // Don't allow editing the code itself
              />
              {errors.code && (
                <div id="code-error" className="form-error" role="alert">
                  {errors.code.message}
                </div>
              )}
              <div id="code-help" className="help-text">
                Short identifier for the FOI exemption (e.g., "FOI s 22")
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reason-description" className="form-label">
                Description *
              </label>
              <input
                id="reason-description"
                type="text"
                className={`form-input ${errors.description ? 'form-input--error' : ''}`}
                {...register('description')}
                placeholder="e.g., Personal information"
                aria-describedby={errors.description ? 'description-error' : 'description-help'}
              />
              {errors.description && (
                <div id="description-error" className="form-error" role="alert">
                  {errors.description.message}
                </div>
              )}
              <div id="description-help" className="help-text">
                Brief description of what this exemption covers
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reason-category" className="form-label">
                Category *
              </label>
              <input
                id="reason-category"
                type="text"
                className={`form-input ${errors.category ? 'form-input--error' : ''}`}
                {...register('category')}
                placeholder="e.g., Privacy"
                aria-describedby={errors.category ? 'category-error' : 'category-help'}
              />
              {errors.category && (
                <div id="category-error" className="form-error" role="alert">
                  {errors.category.message}
                </div>
              )}
              <div id="category-help" className="help-text">
                Category for grouping related exemptions
              </div>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn btn--primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : (isAddingNew ? 'Add Reason Code' : 'Update Reason Code')}
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add New Button */}
      {!isAddingNew && !editingCode && (
        <div className="add-section">
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleAddNew}
          >
            Add New Reason Code
          </button>
        </div>
      )}

      {/* Custom Reason Codes */}
      {editableReasonCodes.length > 0 && (
        <div className="reason-codes-section">
          <h4>Custom Reason Codes ({editableReasonCodes.length})</h4>
          <div className="reason-codes-list">
            {editableReasonCodes.map((reasonCode) => (
              <div key={reasonCode.code} className="reason-code-item">
                <div className="reason-code-content">
                  <div className="reason-code-header">
                    <h5 className="reason-code-title">{reasonCode.code}</h5>
                    <span className="reason-code-category">{reasonCode.category}</span>
                  </div>
                  <p className="reason-code-description">{reasonCode.description}</p>
                </div>
                
                <div className="reason-code-actions">
                  <button
                    type="button"
                    className="btn btn--secondary btn--small"
                    onClick={() => handleEdit(reasonCode)}
                    aria-label={`Edit reason code ${reasonCode.code}`}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn--danger btn--small"
                    onClick={() => handleDelete(reasonCode.code)}
                    aria-label={`Delete reason code ${reasonCode.code}`}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Default Reason Codes */}
      <div className="reason-codes-section">
        <h4>Default FOI Reason Codes ({defaultReasonCodes.length})</h4>
        <p className="section-description">
          These are the standard Australian FOI exemption codes. They cannot be modified.
        </p>
        <div className="reason-codes-list">
          {defaultReasonCodes.map((reasonCode) => (
            <div key={reasonCode.code} className="reason-code-item reason-code-item--readonly">
              <div className="reason-code-content">
                <div className="reason-code-header">
                  <h5 className="reason-code-title">{reasonCode.code}</h5>
                  <span className="reason-code-category">{reasonCode.category}</span>
                </div>
                <p className="reason-code-description">{reasonCode.description}</p>
              </div>
              
              <div className="reason-code-badge">
                Default
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Usage Guidelines */}
      <div className="guidelines-section">
        <h4>Usage Guidelines</h4>
        <ul>
          <li>Use specific FOI section references in the code (e.g., "FOI s 22")</li>
          <li>Keep descriptions concise but clear</li>
          <li>Group related exemptions using consistent categories</li>
          <li>Default reason codes are based on the Freedom of Information Act 1982</li>
          <li>Custom codes should follow the same format as default codes</li>
        </ul>
      </div>
    </div>
  );
}