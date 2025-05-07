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
import { validateEmail, validateName, validatePassword } from '../libs/authValidator';

const REGISTER_FIRST_ADMIN_MUTATION = gql`
  mutation registerFirstAdmin($input: AdminRegistrationInput!) {
    user {
      registerFirstAdmin(input: $input) {
        accessToken
        refreshToken
        user {
          id
        }
      }
    }
  }
`;

function RegisterPage() {
  const { t } = useTranslation();
  const { register, login } = useAuth();
  const { isFirstAdminCreated, loading: isFirstAdminCheckLoading } = useFirstAdminCheck();

  const [registerFirstAdmin, { loading: isRegistering, error: mutationError }] = useMutation(
    REGISTER_FIRST_ADMIN_MUTATION
  );

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    if (nameError) setNameError('');
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (emailError) setEmailError('');
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (passwordError) setPasswordError('');
  };

  const handleNameBlur = () => {
    const result = validateName(name, t);
    setNameError(result.errorMessage);
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

    const nameValidation = validateName(name, t);
    const emailValidation = validateEmail(email, t);
    const passwordValidation = validatePassword(password, t);

    setNameError(nameValidation.errorMessage);
    setEmailError(emailValidation.errorMessage);
    setPasswordError(passwordValidation.errorMessage);

    if (nameValidation.isValid && emailValidation.isValid && passwordValidation.isValid) {
      registerFirstAdmin({
        variables: {
          input: {
            name,
            email,
            password,
          },
        },
      })
        .then(({ data }) => {
          login({
            accessToken: data.user.registerFirstAdmin.accessToken,
            refreshToken: data.user.registerFirstAdmin.refreshToken,
            userId: data.user.registerFirstAdmin.user.id,
          });
        })
        .catch(error => {});
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="flex grow items-center justify-center px-4 lg:px-0">
      <Card className="max-w-md">
        <CardHeader title={t('auth.register')} subheader={t('auth.registerSubheader')} />
        <CardContent>
          {!isFirstAdminCheckLoading && isFirstAdminCreated && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <span className="mr-1">{t('auth.noNeedAdminWarning')}</span>
              <Link href="/login" variant="body2">
                {t('auth.noNeedAdminWarningLink')}
              </Link>
            </Alert>
          )}

          {!isFirstAdminCheckLoading && !isFirstAdminCreated && (
            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="name"
                label={t('auth.name')}
                name="name"
                autoComplete="name"
                value={name}
                size="small"
                onChange={handleNameChange}
                onBlur={handleNameBlur}
                error={!!nameError}
                helperText={nameError}
              />
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
                autoComplete="new-password"
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
                disabled={!!isRegistering}
                sx={{ mt: 3, mb: 2 }}
              >
                {t('auth.register')}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default RegisterPage;
