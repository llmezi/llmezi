import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import ThemeSwitcher from '../../components/common/theme-switcher';

function GeneralSettingPage() {
  const { t } = useTranslation();
  return (
    <>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1">
          {t('menu.settingsMenu.general')}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <ThemeSwitcher />
      </Box>
    </>
  );
}

export default GeneralSettingPage;
