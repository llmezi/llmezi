import { useMediaQuery, useTheme } from '@mui/material';

/**
 * Custom hook that returns whether the current viewport is mobile size
 * @returns {boolean} True if the viewport is mobile size (below 'sm' breakpoint)
 */
export const useIsMobile = (): boolean => {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down('sm'));
};

export default useIsMobile;
