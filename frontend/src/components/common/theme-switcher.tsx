import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import { useColorScheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';

function ThemeSwitcher() {
  const { t } = useTranslation();
  const { mode, setMode } = useColorScheme();

  if (!mode) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        width: '100%',
        alignItems: 'center',
        // justifyContent: 'center',
        p: 3,
      }}
    >
      <FormControl>
        <FormLabel id="demo-theme-toggle">{t('theme.label')}</FormLabel>
        <RadioGroup
          aria-labelledby="demo-theme-toggle"
          name="theme-toggle"
          row
          value={mode}
          onChange={event => setMode(event.target.value as 'system' | 'light' | 'dark')}
        >
          <FormControlLabel value="system" control={<Radio />} label={t('theme.systemTheme')} />
          <FormControlLabel value="light" control={<Radio />} label={t('theme.lightTheme')} />
          <FormControlLabel value="dark" control={<Radio />} label={t('theme.darkTheme')} />
        </RadioGroup>
      </FormControl>
    </Box>
  );
}

export default ThemeSwitcher;
