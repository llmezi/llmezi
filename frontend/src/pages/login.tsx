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
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Link from '@mui/material/Link';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import TextField from '@mui/material/TextField';
import { useState } from 'react';
import { TFunction, useTranslation } from 'react-i18next';
import { HashLoader } from 'react-spinners';
import { useAuth } from '../hooks/useAuth';
import { useFirstAdminCheck } from '../hooks/useFirstAdminCheck';
import { useSmtpCheck } from '../hooks/useSmtpCheck';
import { validateEmail, validatePassword } from '../libs/authValidator';

// ===============================
// Types and Interfaces
// ===============================

type LoginFormType = 'password' | 'otp';

interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name?: string;
    email?: string;
    isAdmin?: boolean;
  };
}

interface PasswordLoginInput {
  email: string;
  password: string;
}

interface OtpLoginInput {
  email: string;
  code: string;
}

interface AuthCodeRequestInput {
  email: string;
  purpose: 'LOGIN';
}

interface PasswordLoginFormProps {
  t: TFunction;
}

interface OtpLoginFormProps {
  isSmtpReady: boolean;
  t: TFunction;
}

// ===============================
// GraphQL Queries
// ===============================

const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    auth {
      login(input: $input) {
        accessToken
        refreshToken
        user {
          id
          name
          email
          isAdmin
        }
      }
    }
  }
`;

const REQUEST_OTP_MUTATION = gql`
  mutation RequestOTP($input: AuthCodeRequestInput!) {
    auth {
      requestAuthCode(input: $input)
    }
  }
`;

const LOGIN_WITH_OTP_MUTATION = gql`
  mutation LoginWithOTP($input: AuthCodeLoginInput!) {
    auth {
      loginWithAuthCode(input: $input) {
        accessToken
        refreshToken
        user {
          id
        }
      }
    }
  }
`;

// ===============================
// Helper Components
// ===============================

/**
 * Alert component for displaying login errors
 */
const LoginError: React.FC<{ t: TFunction }> = ({ t }) => (
  <Alert severity="error" sx={{ mb: 2 }}>
    {t('auth.loginError')}
  </Alert>
);

/**
 * Login page main component
 */
function LoginPage(): JSX.Element {
  const { t } = useTranslation();
  const { isFirstAdminCreated, loading: isFirstAdminCheckLoading } = useFirstAdminCheck();
  const { isSmtpReady, loading: isSmtpLoading } = useSmtpCheck();

  const [loginFormType, setLoginFormType] = useState<LoginFormType>('password');

  const handleSwitchForm = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLoginFormType(event.target.value as LoginFormType);
  };

  const isLoading = isFirstAdminCheckLoading || isSmtpLoading;

  return (
    <div className="flex grow items-center justify-center px-4 lg:px-0">
      <Card className="max-w-md">
        <CardHeader title={t('auth.login')} subheader={t('auth.loginSubheader')} />
        <Divider />
        <CardContent>
          {isLoading && <HashLoader color="#1d1d1d" className="mx-auto my-12" />}

          {!isLoading && !isFirstAdminCreated && (
            <Alert severity="warning">
              <p className="mb-2">{t('auth.needAdminWarning')}</p>
              <Link href="/register" variant="body2">
                {'👉'} {t('auth.needAdminWarningLink')}
              </Link>
            </Alert>
          )}

          {!isLoading && isFirstAdminCreated && (
            <>
              <FormControl fullWidth>
                <RadioGroup
                  aria-labelledby="login-form-type-radio-group"
                  name="login-form-type"
                  value={loginFormType}
                  onChange={handleSwitchForm}
                  row
                >
                  <FormControlLabel
                    value="password"
                    control={<Radio size="small" />}
                    label={t('auth.passwordLogin')}
                  />
                  <FormControlLabel
                    value="otp"
                    control={<Radio size="small" />}
                    label={t('auth.otpLogin')}
                  />
                </RadioGroup>
              </FormControl>

              <Box sx={{ mt: 2 }}>
                {loginFormType === 'password' ? (
                  <LoginWithPassword t={t} />
                ) : (
                  <LoginWithOTP isSmtpReady={isSmtpReady} t={t} />
                )}
              </Box>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Password-based login form component
 */
function LoginWithPassword({ t }: PasswordLoginFormProps): JSX.Element {
  const { login } = useAuth();

  // Form state
  const [formState, setFormState] = useState<{
    email: string;
    password: string;
    showPassword: boolean;
    emailError: string;
    passwordError: string;
  }>({
    email: '',
    password: '',
    showPassword: false,
    emailError: '',
    passwordError: '',
  });

  // Mutation hook
  const [loginMutation, { loading: isLoggingIn, error: loginError }] = useMutation<
    { auth: { login: LoginResult } },
    { input: PasswordLoginInput }
  >(LOGIN_MUTATION);

  // Form handlers
  const updateFormState =
    (field: keyof typeof formState) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormState({
        ...formState,
        [field]: e.target.value,
        // Clear error when typing
        ...(field === 'email' && formState.emailError ? { emailError: '' } : {}),
        ...(field === 'password' && formState.passwordError ? { passwordError: '' } : {}),
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
    const result = validatePassword(formState.password, t);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const emailValidation = validateEmail(formState.email, t);
    const passwordValidation = validatePassword(formState.password, t);

    setFormState({
      ...formState,
      emailError: emailValidation.errorMessage,
      passwordError: passwordValidation.errorMessage,
    });

    if (emailValidation.isValid && passwordValidation.isValid) {
      loginMutation({
        variables: {
          input: {
            email: formState.email,
            password: formState.password,
          },
        },
      })
        .then(({ data }) => {
          if (data?.auth.login) {
            const authData = data.auth.login;
            login({
              accessToken: authData.accessToken,
              refreshToken: authData.refreshToken,
              userId: authData.user.id,
            });
          }
        })
        .catch((error: ApolloError) => {
          console.error('Login error:', error);
        });
    }
  };

  return (
    <>
      {!!loginError && <LoginError t={t} />}

      <Box component="form" onSubmit={handleSubmit}>
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
          helperText={formState.emailError}
        />

        <TextField
          margin="normal"
          required
          fullWidth
          name="password"
          label={t('auth.password')}
          type={formState.showPassword ? 'text' : 'password'}
          id="password"
          autoComplete="current-password"
          value={formState.password}
          size="small"
          onChange={updateFormState('password')}
          onBlur={handlePasswordBlur}
          error={!!formState.passwordError}
          helperText={formState.passwordError}
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

        <Button
          type="submit"
          fullWidth
          variant="contained"
          disabled={isLoggingIn}
          loading={isLoggingIn}
          loadingPosition="start"
          sx={{ mt: 3, mb: 2 }}
        >
          {t('common.submit')}
        </Button>

        <Link href="#" variant="body2">
          {t('auth.forgotPassword')}
        </Link>
      </Box>
    </>
  );
}

/**
 * OTP-based login form component
 */
function LoginWithOTP({ isSmtpReady, t }: OtpLoginFormProps): JSX.Element {
  const { login } = useAuth();

  // Form state
  const [formState, setFormState] = useState<{
    email: string;
    otp: string;
    emailError: string;
    requested: boolean;
  }>({
    email: '',
    otp: '',
    emailError: '',
    requested: false,
  });

  // Mutations
  const [requestOtpMutation, { loading: isRequestingOtp }] = useMutation<
    { auth: { requestAuthCode: boolean } },
    { input: AuthCodeRequestInput }
  >(REQUEST_OTP_MUTATION);

  const [loginWithAuthCodeMutation, { loading: isLoggingIn, error: loginError }] = useMutation<
    { auth: { loginWithAuthCode: LoginResult } },
    { input: OtpLoginInput }
  >(LOGIN_WITH_OTP_MUTATION);

  // Form handlers
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormState({
      ...formState,
      email: e.target.value,
      emailError: '',
    });
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormState({
      ...formState,
      otp: e.target.value,
    });
  };

  const handleEmailBlur = () => {
    const result = validateEmail(formState.email, t);
    setFormState({
      ...formState,
      emailError: result.errorMessage,
    });
  };

  const handleRequestOTP = () => {
    const emailValidation = validateEmail(formState.email, t);

    if (!emailValidation.isValid) return;

    requestOtpMutation({
      variables: {
        input: {
          email: formState.email,
          purpose: 'LOGIN',
        },
      },
    }).then(() => {
      setFormState({
        ...formState,
        requested: true,
      });
    });
  };

  const handleSubmit = () => {
    if (!formState.otp) return;

    loginWithAuthCodeMutation({
      variables: {
        input: {
          email: formState.email,
          code: formState.otp,
        },
      },
    })
      .then(({ data }) => {
        if (data?.auth.loginWithAuthCode) {
          const authData = data.auth.loginWithAuthCode;
          login({
            accessToken: authData.accessToken,
            refreshToken: authData.refreshToken,
            userId: authData.user.id,
          });
        }
      })
      .catch((error: ApolloError) => {
        console.error('Login error:', error);
      });
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

    if (formState.requested && !loginError) {
      return (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('auth.requestedOTP')}
        </Alert>
      );
    }

    if (loginError) {
      return <LoginError t={t} />;
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
          onChange={handleEmailChange}
          onBlur={handleEmailBlur}
          error={!!formState.emailError}
          disabled={!isSmtpReady || formState.requested}
          helperText={formState.emailError}
        />

        {formState.requested && (
          <TextField
            type="number"
            label="OTP"
            fullWidth
            size="small"
            value={formState.otp}
            onChange={handleOtpChange}
            disabled={!formState.requested}
          />
        )}

        {!formState.requested ? (
          <Button
            fullWidth
            variant="contained"
            disabled={!isSmtpReady || isRequestingOtp}
            onClick={handleRequestOTP}
            loading={isRequestingOtp}
            loadingPosition="start"
            sx={{ mt: 3, mb: 2 }}
          >
            {t('auth.requestOTP')}
          </Button>
        ) : (
          <Button
            fullWidth
            variant="contained"
            onClick={handleSubmit}
            disabled={isLoggingIn}
            loading={isLoggingIn}
            loadingPosition="start"
            sx={{ mt: 3, mb: 2 }}
          >
            {t('common.submit')}
          </Button>
        )}
      </Box>
    </>
  );
}

export default LoginPage;
