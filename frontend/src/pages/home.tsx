import { Box, Button, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

function HomePage() {
  const { t } = useTranslation();

  return (
    <Box sx={{ textAlign: 'center', mt: 5 }}>
      <Typography variant="h3" gutterBottom>
        {t('home.welcome')}
      </Typography>
      <Typography variant="body1" sx={{ mb: 3 }}>
        {t('app.description')}
      </Typography>
      <Button variant="contained" color="primary">
        {t('home.getStarted')}
      </Button>
    </Box>
  );
}

export default HomePage;
