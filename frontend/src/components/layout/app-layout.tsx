import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import FolderCopyIcon from '@mui/icons-material/FolderCopy';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import SettingsIcon from '@mui/icons-material/Settings';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import Paper from '@mui/material/Paper';
import Tooltip from '@mui/material/Tooltip';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation, useNavigate } from 'react-router';
import useIsMobile from '../../hooks/useIsMobile';

// ===============================
// Types and Interfaces
// ===============================

interface MenuItemType {
  path: string;
  icon: JSX.Element;
  label: string;
}

interface SideMenuProps {
  items: MenuItemType[];
  currentPath: string;
  onNavigate: (path: string) => void;
  t: (key: string) => string;
}

interface BottomNavigationProps {
  items: MenuItemType[];
  currentPath: string;
  onNavigate: (path: string) => void;
}

// ===============================
// Constants
// ===============================

/**
 * Navigation menu items
 */
const MENU_ITEMS: MenuItemType[] = [
  { path: '/', icon: <QuestionAnswerIcon />, label: 'home' },
  { path: '/documents', icon: <FolderCopyIcon />, label: 'documents' },
  { path: '/images', icon: <PhotoLibraryIcon />, label: 'images' },
  { path: '/tools', icon: <AutoFixHighIcon />, label: 'tools' },
  { path: '/settings', icon: <SettingsIcon />, label: 'settings' },
];

/**
 * Drawer width for desktop
 */
const DRAWER_WIDTH = 72;

// ===============================
// Helper Components
// ===============================

/**
 * Desktop side menu component
 */
function SideMenu({ items, currentPath, onNavigate, t }: SideMenuProps): JSX.Element {
  // Find settings item (last item)
  const settingsItem = items[items.length - 1];
  // Get all other menu items
  const mainMenuItems = items.slice(0, items.length - 1);

  return (
    <Drawer
      variant="permanent"
      elevation={5}
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          alignItems: 'center',
          paddingTop: 1,
          paddingBottom: 1,
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Main menu items at the top */}
      <List sx={{ flexGrow: 0 }}>
        {mainMenuItems.map(item => (
          <ListItem key={item.path} disablePadding sx={{ display: 'block', my: 1 }}>
            <Tooltip title={t(`menu.${item.label}`)} placement="right">
              <ListItemButton
                selected={currentPath === item.path}
                onClick={() => onNavigate(item.path)}
                sx={{
                  justifyContent: 'center',
                  borderRadius: 1,
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    justifyContent: 'center',
                    color: currentPath === item.path ? 'inherit' : 'text.primary',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
              </ListItemButton>
            </Tooltip>
          </ListItem>
        ))}
      </List>

      {/* Settings item at the bottom */}
      <Box sx={{ flexGrow: 1 }}></Box>
      <List>
        <ListItem disablePadding sx={{ display: 'block', my: 1 }}>
          <Tooltip title={t(`menu.${settingsItem.label}`)} placement="right">
            <ListItemButton
              selected={currentPath === settingsItem.path}
              onClick={() => onNavigate(settingsItem.path)}
              sx={{
                justifyContent: 'center',
                borderRadius: 1,
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  justifyContent: 'center',
                  color: currentPath === settingsItem.path ? 'inherit' : 'text.primary',
                }}
              >
                {settingsItem.icon}
              </ListItemIcon>
            </ListItemButton>
          </Tooltip>
        </ListItem>
      </List>
    </Drawer>
  );
}

/**
 * Mobile bottom navigation component
 */
function BottomNavigation({ items, currentPath, onNavigate }: BottomNavigationProps): JSX.Element {
  return (
    <Paper
      elevation={3}
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
      }}
    >
      <Box className="flex justify-around">
        {items.map(item => (
          <IconButton
            key={item.path}
            color={currentPath === item.path ? 'primary' : 'default'}
            onClick={() => onNavigate(item.path)}
            className="py-1"
          >
            {item.icon}
          </IconButton>
        ))}
      </Box>
    </Paper>
  );
}

/**
 * Main application layout component
 */
function AppLayout(): JSX.Element {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();

  // Handle navigation menu item click
  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <Box className="flex h-screen flex-col">
      {/* Desktop vertical side menu */}
      {!isMobile && (
        <SideMenu
          items={MENU_ITEMS}
          currentPath={location.pathname}
          onNavigate={handleNavigation}
          t={t}
        />
      )}

      {/* Main content */}
      <Box
        component="main"
        className="flex-grow overflow-auto p-3"
        sx={{
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { sm: `${DRAWER_WIDTH}px` },
          mb: { xs: '56px', sm: 0 },
        }}
      >
        <Outlet />
      </Box>

      {/* Mobile bottom navigation */}
      {isMobile && (
        <BottomNavigation
          items={MENU_ITEMS}
          currentPath={location.pathname}
          onNavigate={handleNavigation}
        />
      )}
    </Box>
  );
}

export default AppLayout;
