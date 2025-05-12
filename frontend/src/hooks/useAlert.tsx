/* eslint-disable react-refresh/only-export-components */
import { Alert, AlertColor, Snackbar } from '@mui/material';
import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

// ===============================
// Types and Interfaces
// ===============================

interface AlertContextType {
  showAlert: (message: string, severity?: AlertColor) => void;
  hideAlert: () => void;
}

interface AlertProviderProps {
  children: ReactNode;
}

interface AlertState {
  open: boolean;
  message: string;
  severity: AlertColor;
}

// ===============================
// Alert Context Implementation
// ===============================

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider = ({ children }: AlertProviderProps) => {
  const [alertState, setAlertState] = useState<AlertState>({
    open: false,
    message: '',
    severity: 'info',
  });

  /**
   * Shows an alert with the specified message and severity
   */
  const showAlert = (message: string, severity: AlertColor = 'info'): void => {
    setAlertState({
      open: true,
      message,
      severity,
    });
  };

  /**
   * Hides the currently displayed alert
   */
  const hideAlert = (): void => {
    setAlertState(prev => ({
      ...prev,
      open: false,
    }));
  };

  const value = useMemo<AlertContextType>(
    () => ({
      showAlert,
      hideAlert,
    }),
    []
  );

  return (
    <AlertContext.Provider value={value}>
      {children}
      <Snackbar
        open={alertState.open}
        autoHideDuration={3000}
        onClose={hideAlert}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={hideAlert} severity={alertState.severity} sx={{ width: '100%' }}>
          {alertState.message}
        </Alert>
      </Snackbar>
    </AlertContext.Provider>
  );
};

/**
 * Custom hook to access the alert context
 * @returns Alert context with showAlert and hideAlert functions
 */
export const useAlert = (): AlertContextType => {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlert must be used within an AlertProvider');
  }

  return context;
};
