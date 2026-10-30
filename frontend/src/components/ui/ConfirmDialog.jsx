import React from 'react';
import Modal from './Modal';
import Button from './Button';

const variantMap = {
  danger: 'danger',
  warning: 'accent',
  info: 'primary',
};

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-gray-600 text-sm leading-relaxed">{message}</p>
      <div className="flex items-center justify-end gap-3 mt-6">
        <Button variant="secondary" size="sm" onClick={onClose}>
          {cancelText}
        </Button>
        <Button
          variant={variantMap[variant] || 'danger'}
          size="sm"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
}
