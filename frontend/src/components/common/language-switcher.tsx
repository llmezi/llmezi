import { MenuItem, Select, SelectChangeEvent } from '@mui/material';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (event: SelectChangeEvent) => {
    const language = event.target.value;
    i18n.changeLanguage(language);
    localStorage.setItem('language', language);
  };

  return (
    <Select value={i18n.language} onChange={changeLanguage} size="small" sx={{ minWidth: 100 }}>
      <MenuItem value="en">English</MenuItem>
      <MenuItem value="vi">Tiếng Việt</MenuItem>
    </Select>
  );
};

export default LanguageSwitcher;
