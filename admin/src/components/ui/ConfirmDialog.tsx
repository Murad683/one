import { useState } from 'react';
import Modal from './Modal';
import Button from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  // May return a promise: the dialog then shows a spinner and ignores further
  // clicks (and close attempts) until it settles, so a slow request can't be
  // confirmed twice.
  onConfirm: () => unknown;
  title: string;
  message: string;
  isLoading?: boolean;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'danger';
}

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  isLoading = false,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
}: ConfirmDialogProps) => {
  const [isPending, setIsPending] = useState(false);
  const busy = isLoading || isPending;

  const handleConfirm = () => {
    if (busy) return;
    const result = onConfirm();
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      setIsPending(true);
      (result as Promise<unknown>).then(
        () => setIsPending(false),
        () => setIsPending(false),
      );
    }
  };

  const handleClose = () => {
    if (!busy) onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="sm">
      <div className="space-y-5">
        <p className="text-sm text-muted">{message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={handleClose} disabled={busy}>
            {cancelText}
          </Button>
          <Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={handleConfirm} isLoading={busy}>
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
