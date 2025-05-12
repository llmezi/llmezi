import { gql, useMutation, useQuery } from '@apollo/client';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HashLoader } from 'react-spinners';
import AdminOnlyComponent from '../../components/common/admin-only';
import { useAlert } from '../../hooks/useAlert';
import { useWhoAmI } from '../../hooks/useWhoAmI';

// ===============================
// Types and Interfaces
// ===============================

interface SMTPSettings {
  host: string;
  port: number;
  username: string;
  useTls: boolean;
  useSsl: boolean;
  fromEmail: string;
  fromName: string | null;
  isConfigured: boolean;
}

// ===============================
// GraphQL Queries and Mutations
// ===============================

const GET_SMTP_SETTINGS = gql`
  query GetSmtpSettings {
    getSmtpSettings {
      host
      port
      username
      useTls
      useSsl
      fromEmail
      fromName
      isConfigured
    }
  }
`;

const UPDATE_SMTP_SETTINGS = gql`
  mutation UpdateSmtpSettings($settings: SMTPSettingsInput!) {
    smtp {
      updateSmtpSettings(settings: $settings)
    }
  }
`;

const TEST_SMTP_CONNECTION = gql`
  mutation TestSmtpConnection {
    smtp {
      testSmtpConnection
    }
  }
`;

const SEND_TEST_EMAIL = gql`
  mutation SendTestEmail($input: SendTestEmailInput!) {
    smtp {
      sendTestEmail(input: $input)
    }
  }
`;

// ===============================
// Main Component
// ===============================

function EmailServerSettingPage() {
  const { me } = useWhoAmI();
  const { t } = useTranslation();
  const { showAlert } = useAlert();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isTestEmailDialogOpen, setIsTestEmailDialogOpen] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState(me?.email || '');
  const [testEmailError, setTestEmailError] = useState('');
  const [testEmailSent, setTestEmailSent] = useState(false);
  const [formDisabled, setFormDisabled] = useState(false);

  // Query current SMTP settings
  const {
    data: settingsData,
    loading: settingsLoading,
    error: settingsError,
    refetch: refetchSettings,
  } = useQuery<{ getSmtpSettings: SMTPSettings }>(GET_SMTP_SETTINGS, {
    fetchPolicy: 'network-only',
  });

  // Form state for SMTP settings
  const [formState, setFormState] = useState<{
    host: string;
    port: string;
    username: string;
    password: string;
    useTls: boolean;
    useSsl: boolean;
    fromEmail: string;
    fromName: string;
    errors: {
      [key: string]: string;
    };
  }>({
    host: '',
    port: '587', // Default SMTP port
    username: '',
    password: '',
    useTls: true,
    useSsl: false,
    fromEmail: '',
    fromName: '',
    errors: {},
  });

  // Mutations
  const [updateSmtpSettings, { loading: isUpdating }] = useMutation(UPDATE_SMTP_SETTINGS);
  const [testSmtpConnection, { loading: isTesting }] = useMutation(TEST_SMTP_CONNECTION);
  const [sendTestEmail, { loading: isSendingTest }] = useMutation(SEND_TEST_EMAIL);

  // Update local form state when settings are loaded
  useEffect(() => {
    if (settingsData?.getSmtpSettings) {
      const settings = settingsData.getSmtpSettings;
      setFormState({
        ...formState,
        host: settings.host || '',
        port: settings.port?.toString() || '587',
        username: settings.username || '',
        useTls: settings.useTls || true,
        useSsl: settings.useSsl || false,
        fromEmail: settings.fromEmail || '',
        fromName: settings.fromName || '',
      });

      // Disable form if SMTP is already configured
      setFormDisabled(settings.isConfigured);
    }
  }, [settingsData]); // Removed formState from dependencies

  // Form handlers
  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormState({
      ...formState,
      [field]: e.target.value,
      errors: {
        ...formState.errors,
        [field]: '', // Clear error when typing
      },
    });
  };

  const handleCheckboxChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (field === 'useTls' && e.target.checked) {
      setFormState({
        ...formState,
        useTls: true,
        useSsl: false,
      });
    } else if (field === 'useSsl' && e.target.checked) {
      setFormState({
        ...formState,
        useTls: false,
        useSsl: true,
      });
    } else {
      setFormState({
        ...formState,
        [field]: e.target.checked,
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!formState.host) {
      errors.host = t('smtp.hostRequired');
    }

    if (!formState.port) {
      errors.port = t('smtp.portRequired');
    } else if (!/^\d+$/.test(formState.port) || parseInt(formState.port) <= 0) {
      errors.port = t('smtp.invalidPort');
    }

    if (!formState.username) {
      errors.username = t('smtp.usernameRequired');
    }

    if (!formState.password) {
      errors.password = t('smtp.passwordRequired');
    }

    if (!formState.fromEmail) {
      errors.fromEmail = t('smtp.fromEmailRequired');
    } else if (!/^\S+@\S+\.\S+$/.test(formState.fromEmail)) {
      errors.fromEmail = t('smtp.invalidEmail');
    }

    setFormState({
      ...formState,
      errors,
    });

    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      // Update SMTP settings
      await updateSmtpSettings({
        variables: {
          settings: {
            host: formState.host,
            port: parseInt(formState.port),
            username: formState.username,
            password: formState.password,
            useTls: formState.useTls,
            useSsl: formState.useSsl,
            fromEmail: formState.fromEmail,
            fromName: formState.fromName || undefined,
          },
        },
      });

      // Test the connection
      const { data } = await testSmtpConnection();

      // Refresh settings after update
      await refetchSettings();

      // Disable the form after successful configuration
      setFormDisabled(true);

      // If connection successful, ask user to send test email
      if (data?.smtp?.testSmtpConnection) {
        setIsTestEmailDialogOpen(true);
      }

      showAlert(t('smtp.configurationSaved'), 'success');
    } catch (error) {
      console.error('Failed to update SMTP settings:', error);
      showAlert(t('smtp.configurationError'), 'error');
    }
  };

  const handleDeleteSettings = async () => {
    try {
      // Reset settings by sending empty values
      await updateSmtpSettings({
        variables: {
          settings: {
            host: '',
            port: 587,
            username: '',
            password: '',
            useTls: true,
            useSsl: false,
            fromEmail: '',
            fromName: '',
          },
        },
      });

      // Reset form state
      setFormState({
        host: '',
        port: '587',
        username: '',
        password: '',
        useTls: true,
        useSsl: false,
        fromEmail: '',
        fromName: '',
        errors: {},
      });

      // Enable the form again
      setFormDisabled(false);
      setTestEmailSent(false);

      // Refresh settings
      await refetchSettings();

      // Close dialog
      setIsDeleteDialogOpen(false);

      showAlert(t('smtp.configurationRemoved'), 'success');
    } catch (error) {
      console.error('Failed to delete SMTP settings:', error);
      showAlert(t('smtp.deleteError'), 'error');
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailAddress || !/^\S+@\S+\.\S+$/.test(testEmailAddress)) {
      setTestEmailError(t('smtp.invalidEmail'));
      return;
    }

    try {
      const result = await sendTestEmail({
        variables: {
          input: {
            toEmail: testEmailAddress,
            subject: t('smtp.testEmailSubject'),
          },
        },
      });

      setIsTestEmailDialogOpen(false);
      setTestEmailAddress('');
      setTestEmailError('');

      // Mark test email as sent
      if (result.data?.smtp?.sendTestEmail) {
        setTestEmailSent(true);
        showAlert(t('smtp.testEmailSent'), 'success');
      }
    } catch (error) {
      console.error('Failed to send test email:', error);
      showAlert(t('smtp.testEmailError'), 'error');
    }
  };

  // If loading settings
  if (settingsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <HashLoader color="#1d1d1d" />
      </Box>
    );
  }

  // If error loading settings
  if (settingsError) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {t('common.errorLoading')}
      </Alert>
    );
  }

  const isSmtpConfigured = settingsData?.getSmtpSettings?.isConfigured || false;

  return (
    <AdminOnlyComponent>
      <Box sx={{ mb: 4, mt: 1 }}>
        <Typography variant="h4" component="h1">
          {t('smtp.settingsTitle')}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {isSmtpConfigured && (
          <div>
            <Alert className="w-full" severity="success">
              <Typography variant="h6" color="success.main">
                {t('smtp.configuredStatus')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formState.host} ({formState.username})
              </Typography>
            </Alert>
            <div className="mt-3 flex justify-end">
              <Button
                // variant="contained"
                color="error"
                size="small"
                startIcon={<DeleteIcon />}
                onClick={() => setIsDeleteDialogOpen(true)}
                disabled={isUpdating}
              >
                {t('common.remove')}
              </Button>
            </div>
          </div>
        )}

        <Card>
          <CardHeader
            title={t('smtp.configureSmtp')}
            subheader={t('smtp.configureSmtpDescription')}
          />
          <Divider />
          <CardContent>
            <Box component="form" onSubmit={handleSubmit}>
              <Box
                sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}
              >
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="host"
                  label={t('smtp.host')}
                  name="host"
                  value={formState.host}
                  onChange={handleInputChange('host')}
                  error={!!formState.errors.host}
                  helperText={formState.errors.host}
                  disabled={formDisabled || isUpdating}
                />

                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="port"
                  label={t('smtp.port')}
                  name="port"
                  type="number"
                  value={formState.port}
                  onChange={handleInputChange('port')}
                  error={!!formState.errors.port}
                  helperText={formState.errors.port}
                  disabled={formDisabled || isUpdating}
                />
              </Box>

              <TextField
                margin="normal"
                required
                fullWidth
                id="username"
                label={t('smtp.username')}
                name="username"
                value={formState.username}
                onChange={handleInputChange('username')}
                error={!!formState.errors.username}
                helperText={formState.errors.username}
                disabled={formDisabled || isUpdating}
              />

              <TextField
                margin="normal"
                required
                fullWidth
                id="password"
                label={t('smtp.password')}
                name="password"
                type="password"
                value={formState.password}
                onChange={handleInputChange('password')}
                error={!!formState.errors.password}
                helperText={formState.errors.password}
                disabled={formDisabled || isUpdating}
              />

              <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formState.useTls}
                      onChange={handleCheckboxChange('useTls')}
                      name="useTls"
                      disabled={formDisabled || isUpdating}
                    />
                  }
                  label={t('smtp.useTls')}
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formState.useSsl}
                      onChange={handleCheckboxChange('useSsl')}
                      name="useSsl"
                      disabled={formDisabled || isUpdating}
                    />
                  }
                  label={t('smtp.useSsl')}
                />
              </Box>

              <Box
                sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}
              >
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="fromEmail"
                  label={t('smtp.fromEmail')}
                  name="fromEmail"
                  value={formState.fromEmail}
                  onChange={handleInputChange('fromEmail')}
                  error={!!formState.errors.fromEmail}
                  helperText={formState.errors.fromEmail}
                  disabled={formDisabled || isUpdating}
                />

                <TextField
                  margin="normal"
                  fullWidth
                  id="fromName"
                  label={t('smtp.fromName')}
                  name="fromName"
                  value={formState.fromName}
                  onChange={handleInputChange('fromName')}
                  disabled={formDisabled || isUpdating}
                />
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3, gap: 2 }}>
                {formDisabled && !testEmailSent && (
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => setIsTestEmailDialogOpen(true)}
                  >
                    {t('smtp.sendTestEmail')}
                  </Button>
                )}

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth={!formDisabled}
                  sx={{ ml: 'auto' }}
                  disabled={formDisabled || isUpdating || isTesting}
                  startIcon={isUpdating || isTesting ? <CircularProgress size={20} /> : null}
                >
                  {isUpdating || isTesting ? t('common.processing') : t('common.save')}
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)}>
        <DialogTitle>{t('smtp.deleteConfirmTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('smtp.deleteConfirmMessage')}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDeleteDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button
            onClick={handleDeleteSettings}
            color="error"
            disabled={isUpdating}
            startIcon={isUpdating ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {t('common.remove')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Test Email Dialog */}
      <Dialog open={isTestEmailDialogOpen} onClose={() => setIsTestEmailDialogOpen(false)}>
        <DialogTitle>{t('smtp.testEmailTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>{t('smtp.testEmailDescription')}</DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="testEmail"
            label={t('smtp.recipientEmail')}
            type="email"
            fullWidth
            variant="outlined"
            value={testEmailAddress}
            onChange={e => {
              setTestEmailAddress(e.target.value);
              if (testEmailError) setTestEmailError('');
            }}
            error={!!testEmailError}
            helperText={testEmailError}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsTestEmailDialogOpen(false)}>{t('common.skip')}</Button>
          <Button
            onClick={handleSendTestEmail}
            variant="contained"
            disabled={isSendingTest}
            startIcon={isSendingTest ? <CircularProgress size={20} /> : <SendIcon />}
          >
            {t('smtp.sendTest')}
          </Button>
        </DialogActions>
      </Dialog>
    </AdminOnlyComponent>
  );
}

export default EmailServerSettingPage;
