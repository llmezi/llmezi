import { ApolloError, gql, useMutation } from '@apollo/client';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import { useState } from 'react';
import { TFunction, useTranslation } from 'react-i18next';
import { HashLoader } from 'react-spinners';
// import { useNavigate } from 'react-router-dom';
import { useSmtpCheck } from '../hooks/useSmtpCheck';
import { validateEmail, validatePassword } from '../libs/authValidator';

// ===============================
// Types and Interfaces
// ===============================

interface AuthCodeRequestInput {
  email: string;
  purpose: 'PASSWORD_RESET';
}

interface ResetPasswordInput {
  email: string;
  code: string;
  newPassword: string;
}

interface PasswordResetFormProps {
  isSmtpReady: boolean;
  t: TFunction;
}

// ===============================
// GraphQL Queries
// ===============================

const REQUEST_RESET_CODE_MUTATION = gql`
  mutation RequestPasswordResetCode($input: AuthCodeRequestInput!) {
    auth {
      requestAuthCode(input: $input)
    }
  }
`;

const RESET_PASSWORD_MUTATION = gql`
  mutation ResetPassword($input: ResetPasswordInput!) {
    auth {
      resetPassword(input: $input)
    }
  }
`;

/**
 * Forgot Password page main component
 */
function ForgotPasswordPage(): JSX.Element {
  const { t } = useTranslation();
  const { isSmtpReady, loading: isSmtpLoading } = useSmtpCheck();

  return (
    <div className="flex grow items-center justify-center px-4 lg:px-0">
      <Card className="max-w-md">
        <CardHeader
          title={t('auth.forgotPassword')}
          subheader={t('auth.forgotPasswordSubheader')}
        />
        <Divider />
        <CardContent>
          {isSmtpLoading && <HashLoader color="#1d1d1d" className="mx-auto my-12" />}

          {!isSmtpLoading && (
            <Box sx={{ mt: 2 }}>
              <PasswordResetForm isSmtpReady={isSmtpReady} t={t} />
            </Box>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Password reset form component
 */
function PasswordResetForm({ isSmtpReady, t }: PasswordResetFormProps): JSX.Element {
  // Form state
  const [formState, setFormState] = useState<{
    email: string;
    code: string;
    newPassword: string;
    showPassword: boolean;
    emailError: string;
    passwordError: string;
    requested: boolean;
    resetSuccess: boolean;
  }>({
    email: '',
    code: '',
    newPassword: '',
    showPassword: false,
    emailError: '',
    passwordError: '',
    requested: false,
    resetSuccess: false,
  });

  // Mutations
  const [requestResetCodeMutation, { loading: isRequestingCode }] = useMutation<
    { auth: { requestAuthCode: boolean } },
    { input: AuthCodeRequestInput }
  >(REQUEST_RESET_CODE_MUTATION);

  const [resetPasswordMutation, { loading: isResetting, error: resetError }] = useMutation<
    { auth: { resetPassword: boolean } },
    { input: ResetPasswordInput }
  >(RESET_PASSWORD_MUTATION);

  // Form handlers
  const updateFormState =
    (field: keyof typeof formState) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormState({
        ...formState,
        [field]: e.target.value,
        // Clear error when typing
        ...(field === 'email' && formState.emailError ? { emailError: '' } : {}),
        ...(field === 'newPassword' && formState.passwordError ? { passwordError: '' } : {}),
      });
    };

  const handleEmailBlur = () => {
    const result = validateEmail(formState.email, t);
    setFormState({
      ...formState,
      emailError: result.errorMessage,
    });
  };

  const handlePasswordBlur = () => {
    const result = validatePassword(formState.newPassword, t);
    setFormState({
      ...formState,
      passwordError: result.errorMessage,
    });
  };

  const handleTogglePasswordVisibility = () => {
    setFormState({
      ...formState,
      showPassword: !formState.showPassword,
    });
  };

  const handleRequestResetCode = () => {
    const emailValidation = validateEmail(formState.email, t);

    if (!emailValidation.isValid) {
      setFormState({
        ...formState,
        emailError: emailValidation.errorMessage,
      });
      return;
    }

    requestResetCodeMutation({
      variables: {
        input: {
          email: formState.email,
          purpose: 'PASSWORD_RESET',
        },
      },
    }).then(() => {
      setFormState({
        ...formState,
        requested: true,
      });
    });
  };

  const handleSubmitReset = () => {
    const emailValidation = validateEmail(formState.email, t);
    const passwordValidation = validatePassword(formState.newPassword, t);

    setFormState({
      ...formState,
      emailError: emailValidation.errorMessage,
      passwordError: passwordValidation.errorMessage,
    });

    if (!formState.code) return;

    if (emailValidation.isValid && passwordValidation.isValid) {
      resetPasswordMutation({
        variables: {
          input: {
            email: formState.email,
            code: formState.code,
            newPassword: formState.newPassword,
          },
        },
      })
        .then(({ data }) => {
          if (data?.auth.resetPassword) {
            setFormState({
              ...formState,
              resetSuccess: true,
            });
            // Redirect to login page after 3 seconds
            // setTimeout(() => navigate('/login'), 3000);
          }
        })
        .catch((error: ApolloError) => {
          console.error('Password reset error:', error);
        });
    }
  };

  // Render alerts
  const renderAlerts = () => {
    if (!isSmtpReady) {
      return (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t('common.smtpNotReady')}
        </Alert>
      );
    }

    if (resetError) {
      return (
        <Alert severity="error" sx={{ mb: 2 }}>
          {t('auth.resetPasswordError')}
        </Alert>
      );
    }

    if (formState.resetSuccess) {
      return (
        <Alert severity="success" sx={{ mb: 2 }}>
          {t('auth.resetPasswordSuccess')}
        </Alert>
      );
    }

    if (formState.requested && !resetError) {
      return (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('auth.resetCodeSent')}
        </Alert>
      );
    }

    return null;
  };

  return (
    <>
      {renderAlerts()}

      <Box>
        <TextField
          margin="normal"
          required
          fullWidth
          id="email"
          label={t('auth.email')}
          name="email"
          autoComplete="email"
          value={formState.email}
          size="small"
          onChange={updateFormState('email')}
          onBlur={handleEmailBlur}
          error={!!formState.emailError}
          disabled={!isSmtpReady || formState.requested}
          helperText={formState.emailError}
        />

        {formState.requested && (
          <>
            <TextField
              margin="normal"
              required
              fullWidth
              id="code"
              label={t('auth.resetCode')}
              name="code"
              value={formState.code}
              size="small"
              onChange={updateFormState('code')}
              disabled={formState.resetSuccess}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              name="newPassword"
              label={t('auth.newPassword')}
              type={formState.showPassword ? 'text' : 'password'}
              id="newPassword"
              autoComplete="new-password"
              value={formState.newPassword}
              size="small"
              onChange={updateFormState('newPassword')}
              onBlur={handlePasswordBlur}
              error={!!formState.passwordError}
              helperText={formState.passwordError}
              disabled={formState.resetSuccess}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleTogglePasswordVisibility}
                      edge="end"
                      size="small"
                    >
                      {formState.showPassword ? (
                        <VisibilityIcon fontSize="small" />
                      ) : (
                        <VisibilityOffIcon fontSize="small" />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </>
        )}

        {!formState.requested ? (
          <Button
            fullWidth
            variant="contained"
            disabled={!isSmtpReady || isRequestingCode || formState.resetSuccess}
            onClick={handleRequestResetCode}
            loading={isRequestingCode}
            loadingPosition="start"
            sx={{ mt: 3, mb: 2 }}
          >
            {t('auth.requestResetCode')}
          </Button>
        ) : (
          <Button
            fullWidth
            variant="contained"
            onClick={handleSubmitReset}
            disabled={isResetting || formState.resetSuccess}
            loading={isResetting}
            loadingPosition="start"
            sx={{ mt: 3, mb: 2 }}
          >
            {t('auth.resetPassword')}
          </Button>
        )}

        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Link href="/login" variant="body2">
            {t('auth.backToLogin')}
          </Link>
        </Box>
      </Box>
    </>
  );
}

export default ForgotPasswordPage;
