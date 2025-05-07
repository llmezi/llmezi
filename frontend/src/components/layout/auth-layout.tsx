import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import AppBar from '@mui/material/AppBar';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import ThemeSwitcher from '../common/theme-switcher';

function AuthLayout() {
  const { t } = useTranslation();
  const { isLoggedIn } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  if (!!isLoggedIn) {
    return <Navigate to="/" />;
  }

  return (
    <div className="flex h-screen flex-col">
      <div>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h5" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
              {t('app.title')}
            </Typography>
            <IconButton
              edge="end"
              color="inherit"
              size="small"
              aria-label="settings"
              onClick={toggleDrawer}
            >
              <SettingsIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
        <Drawer anchor="right" open={drawerOpen} onClose={toggleDrawer}>
          <Stack
            direction="row"
            sx={{ paddingLeft: 2, paddingRight: 2, paddingTop: 3, paddingBottom: 2 }}
          >
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
              {t('common.setting')}
            </Typography>
            <IconButton size="small" onClick={toggleDrawer}>
              <CloseIcon />
            </IconButton>
          </Stack>
          <Divider />
          <ThemeSwitcher />
        </Drawer>
      </div>
      <Outlet />
    </div>
  );
}

export default AuthLayout;
