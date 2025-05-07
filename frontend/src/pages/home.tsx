import { Box, Button, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';

function HomePage() {
  const { t } = useTranslation();
  const { logout } = useAuth();

  return (
    <Box sx={{ textAlign: 'center', mt: 5 }}>
      <Typography variant="h3" gutterBottom>
        {t('home.welcome')}
      </Typography>
      <Typography variant="body1" sx={{ mb: 3 }}>
        {t('app.description')}
      </Typography>
      <Button variant="contained" color="primary" onClick={logout}>
        {t('home.getStarted')}
      </Button>
    </Box>
  );
}

export default HomePage;
