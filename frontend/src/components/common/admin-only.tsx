import { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useWhoAmI } from '../../hooks/useWhoAmI';

interface AdminOnlyProps {
  children: ReactNode;
}

/**
 * Component that restricts content to admin users only
 * Redirects to home page if user is not an admin
 */
function AdminOnlyComponent({ children }: AdminOnlyProps): JSX.Element {
  const { me } = useWhoAmI();

  if (!me || !me.isAdmin) {
    return <Navigate to="/" />;
  }

  return <div>{children}</div>;
}

export default AdminOnlyComponent;
