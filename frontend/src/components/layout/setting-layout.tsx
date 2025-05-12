import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import MenuIcon from '@mui/icons-material/Menu';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation, useNavigate } from 'react-router';
import useIsMobile from '../../hooks/useIsMobile';
import { useWhoAmI } from '../../hooks/useWhoAmI';
import { DRAWER_WIDTH as APP_DRAWER_WIDTH } from './app-layout';

// ===============================
// Constants
// ===============================

// Drawer width for desktop
const DRAWER_WIDTH = 240;

// Setting menu items - add more as needed
const SETTING_ITEMS = [
  {
    path: '/setting',
    label: 'menu.settingsMenu.general',
  },
  // Add more settings pages as they are created
  // { path: '/setting/profile', icon: <PersonIcon />, label: 'setting.profile' }
  // { path: '/setting/security', icon: <SecurityIcon />, label: 'setting.security' }
];

const ADMIN_SETTING_ITEMS = [
  {
    path: '/setting/email-server',
    label: 'menu.settingsMenu.emailServer',
  },
  // Add more settings pages as they are created
  // { path: '/setting/profile', icon: <PersonIcon />, label: 'setting.profile' }
  // { path: '/setting/security', icon: <SecurityIcon />, label: 'setting.security' }
];

// ===============================
// Setting Layout Component
// ===============================

/**
 * Layout component for settings pages with responsive drawer
 */
function SettingLayout() {
  const { me } = useWhoAmI();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();

  // State to control the drawer's open state on mobile
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Handle navigation to different settings pages
  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileDrawerOpen(false);
    }
  };

  // Toggle drawer on mobile
  const toggleDrawer = () => {
    setMobileDrawerOpen(!mobileDrawerOpen);
  };

  // Content of the drawer (shared between mobile and desktop)
  const drawerContent = (
    <>
      {isMobile && (
        <Box sx={{ display: 'flex', alignItems: 'center', p: 2, justifyContent: 'space-between' }}>
          <Typography variant="h6" component="div">
            {t('menu.settings')}
          </Typography>
          <IconButton onClick={toggleDrawer}>
            <ChevronLeftIcon />
          </IconButton>
        </Box>
      )}
      {!isMobile && (
        <Toolbar>
          <Typography variant="h6" component="div">
            {t('menu.settings')}
          </Typography>
        </Toolbar>
      )}
      <Divider />
      <List>
        {SETTING_ITEMS.map(item => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => handleNavigation(item.path)}
              sx={{
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                },
              }}
            >
              <ListItemText primary={t(item.label)} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {me?.isAdmin && (
        <>
          <Divider />
          <List>
            {ADMIN_SETTING_ITEMS.map(item => (
              <ListItem key={item.path} disablePadding>
                <ListItemButton
                  selected={location.pathname === item.path}
                  onClick={() => handleNavigation(item.path)}
                  sx={{
                    '&.Mui-selected': {
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      '&:hover': {
                        bgcolor: 'primary.dark',
                      },
                    },
                  }}
                >
                  <ListItemText primary={t(item.label)} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </>
      )}
    </>
  );

  return (
    <Box sx={{ display: 'flex', height: '100%' }}>
      {/* Desktop permanent drawer */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          open
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              left: APP_DRAWER_WIDTH,
              zIndex: 1100, // Higher than the app drawer
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Mobile temporary drawer */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileDrawerOpen}
          onClose={toggleDrawer}
          sx={{
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              zIndex: 1300, // Higher than both permanent drawers
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Main content area */}
      <Box
        // component="main"
        sx={{
          flexGrow: 1,
          width: { sm: `calc(100% - ${DRAWER_WIDTH + APP_DRAWER_WIDTH}px)` },
          // ml: { sm: `${DRAWER_WIDTH + APP_DRAWER_WIDTH}px` },
          // p: 3,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Mobile app bar */}
        {isMobile && (
          <Paper
            elevation={1}
            sx={{
              mb: 2,
              p: 1,
              display: 'flex',
              alignItems: 'center',
              width: '100%',
            }}
          >
            <IconButton color="inherit" edge="start" onClick={toggleDrawer} sx={{ mr: 2 }}>
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div">
              {SETTING_ITEMS.find(item => item.path === location.pathname)
                ? t(SETTING_ITEMS.find(item => item.path === location.pathname)!.label)
                : t('menu.settings')}
            </Typography>
          </Paper>
        )}

        {/* Content container with max width and centering */}
        <div className="mx-auto flex w-auto flex-col lg:w-xl">
          {/* Settings page content */}
          <Outlet />
        </div>
      </Box>
    </Box>
  );
}

export default SettingLayout;
