import { useContext } from 'react';
import { ConfirmDialog } from '@/components/ui';
import { AuthContext } from '@/contexts/AuthContext';

export default function SignOutDialog({ isOpen, onClose }) {
  const { logout } = useContext(AuthContext);

  const handleSignOut = () => {
    logout();
    onClose();
  };

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleSignOut}
      title="Sign Out"
      message="Are you sure you want to sign out? You will need to log in again to access the system."
      confirmText="Sign Out"
      variant="danger"
    />
  );
}
