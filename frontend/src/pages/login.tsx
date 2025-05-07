import { gql, useMutation } from '@apollo/client';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { Box, Button, IconButton, InputAdornment, Link, TextField } from '@mui/material';
import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useFirstAdminCheck } from '../hooks/useFirstAdminCheck';
import { validateEmail, validatePassword } from '../libs/authValidator';

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

function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const { isFirstAdminCreated, loading: isFirstAdminCheckLoading, error } = useFirstAdminCheck();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Add login mutation hook
  const [loginMutation, { loading: isLoggingIn, error: loginError }] = useMutation(LOGIN_MUTATION);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    // Clear error when user starts typing again
    if (emailError) setEmailError('');
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    // Clear error when user starts typing again
    if (passwordError) setPasswordError('');
  };

  const handleEmailBlur = () => {
    const result = validateEmail(email, t);
    setEmailError(result.errorMessage);
  };

  const handlePasswordBlur = () => {
    const result = validatePassword(password, t);
    setPasswordError(result.errorMessage);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const emailValidation = validateEmail(email, t);
    const passwordValidation = validatePassword(password, t);

    setEmailError(emailValidation.errorMessage);
    setPasswordError(passwordValidation.errorMessage);

    if (emailValidation.isValid && passwordValidation.isValid) {
      // Execute login mutation
      loginMutation({
        variables: {
          input: {
            email,
            password,
          },
        },
      })
        .then(({ data }) => {
          // On successful login, store tokens and user info
          const authData = data.auth.login;
          login({
            accessToken: authData.accessToken,
            refreshToken: authData.refreshToken,
            userId: authData.user.id,
          });
        })
        .catch(error => {
          // Handle specific error cases if needed
          console.error('Login error:', error);
        });
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="flex grow items-center justify-center px-4 lg:px-0">
      <Card className="max-w-md">
        <CardHeader title={t('auth.login')} subheader={t('auth.loginSubheader')} />
        <CardContent>
          {!isFirstAdminCheckLoading && !isFirstAdminCreated && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <span className="mr-1">{t('auth.needAdminWarning')}</span>
              <Link href="/register" variant="body2">
                {t('auth.needAdminWarningLink')}
              </Link>
            </Alert>
          )}
          {!!loginError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {t('auth.loginError')}
            </Alert>
          )}
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label={t('auth.email')}
              name="email"
              autoComplete="email"
              value={email}
              size="small"
              onChange={handleEmailChange}
              onBlur={handleEmailBlur}
              error={!!emailError}
              helperText={emailError}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label={t('auth.password')}
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={password}
              size="small"
              onChange={handlePasswordChange}
              onBlur={handlePasswordBlur}
              error={!!passwordError}
              helperText={passwordError}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleTogglePasswordVisibility}
                      edge="end"
                      size="small"
                    >
                      {showPassword ? (
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
              disabled={!!isLoggingIn}
              loading={isLoggingIn}
              loadingPosition="start"
              sx={{ mt: 3, mb: 2 }}
            >
              {t('auth.login')}
            </Button>
            <Link href="#" variant="body2">
              {t('auth.forgotPassword')}
            </Link>
          </Box>
        </CardContent>
      </Card>
    </div>
  );
}

export default LoginPage;
