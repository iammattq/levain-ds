'use client';

import { useState, useEffect } from 'react';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import TextInput from '../components/TextInput';

export interface ConfirmationModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Called when modal is closed (cancel or backdrop click) */
  onClose: () => void;
  /** Called when user confirms the action - can be async */
  onConfirm: () => void | Promise<void>;
  /** Modal title */
  title: string;
  /** Message explaining what will happen */
  message: string | React.ReactNode;
  /** Visual variant indicating severity */
  variant?: 'danger' | 'warning' | 'info';
  /** Text for confirm button */
  confirmButtonText?: string;
  /** Text for cancel button */
  cancelButtonText?: string;
  /** If set, user must type this exact text to enable confirm button */
  requireConfirmText?: string;
  /** External loading state (merged with internal async loading) */
  loading?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  variant = 'danger',
  confirmButtonText = 'Confirm',
  cancelButtonText = 'Cancel',
  requireConfirmText,
  loading: externalLoading = false,
}: ConfirmationModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [internalLoading, setInternalLoading] = useState(false);

  // Reset confirm text when modal closes
  useEffect(() => {
    if (!isOpen) {
      setConfirmText('');
    }
  }, [isOpen]);

  const isLoading = externalLoading || internalLoading;
  const isConfirmEnabled = requireConfirmText
    ? confirmText === requireConfirmText
    : true;

  const buttonVariant = variant === 'danger' ? 'danger' : 'primary';

  const handleConfirm = async () => {
    setInternalLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      // Error handling delegated to caller via toast
      // Modal stays open on error so user can retry or cancel
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      {(handleClose) => (
        <div className="space-y-4">
          <div className="type-body-sm text-[var(--color-text-muted)]">
            {message}
          </div>

          {requireConfirmText && (
            <TextInput
              id="confirmation-text"
              label={`Type "${requireConfirmText}" to confirm`}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={requireConfirmText}
              disabled={isLoading}
              autoComplete="off"
            />
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={handleClose} disabled={isLoading}>
              {cancelButtonText}
            </Button>
            <Button
              variant={buttonVariant}
              onClick={handleConfirm}
              disabled={!isConfirmEnabled || isLoading}
              loading={isLoading}
            >
              {confirmButtonText}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
