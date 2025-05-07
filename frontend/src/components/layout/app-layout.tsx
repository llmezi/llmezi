import { useTranslation } from 'react-i18next';
import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../../hooks/useAuth';

function AppLayout() {
  const { isLoggedIn } = useAuth();
  const { t } = useTranslation();

  if (!isLoggedIn) {
    return <Navigate to="/login" />;
  }

  return (
    <>
      <Outlet />
    </>
  );
}

export default AppLayout;
