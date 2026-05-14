import Modal from './Modal';
import Button from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
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
}: ConfirmDialogProps) => (
  <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
    <div className="space-y-5">
      <p className="text-sm text-slate-600">{message}</p>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={isLoading}>
          {cancelText}
        </Button>
        <Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} isLoading={isLoading}>
          {confirmText}
        </Button>
      </div>
    </div>
  </Modal>
);

export default ConfirmDialog;
