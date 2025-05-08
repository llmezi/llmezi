import { ApolloError, gql, useMutation } from '@apollo/client';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import { useState } from 'react';
import { TFunction, useTranslation } from 'react-i18next';
import { HashLoader } from 'react-spinners';
import { useAuth } from '../hooks/useAuth';
import { useFirstAdminCheck } from '../hooks/useFirstAdminCheck';
import { validateEmail, validateName, validatePassword } from '../libs/authValidator';

// ===============================
// Types and Interfaces
// ===============================

interface RegisterResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
  };
}

interface AdminRegistrationInput {
  name: string;
  email: string;
  password: string;
}

// ===============================
// GraphQL Queries
// ===============================

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

// ===============================
// Helper Components
// ===============================

/**
 * Alert component for displaying registration errors
 */
const RegisterError: React.FC<{ t: TFunction }> = ({ t }) => (
  <Alert severity="error" sx={{ mb: 2 }}>
    {t('auth.registerError')}
  </Alert>
);

/**
 * Registration form component
 */
function RegistrationForm({ t }: { t: TFunction }): JSX.Element {
  const { login } = useAuth();

  // Form state
  const [formState, setFormState] = useState<{
    name: string;
    email: string;
    password: string;
    showPassword: boolean;
    nameError: string;
    emailError: string;
    passwordError: string;
  }>({
    name: '',
    email: '',
    password: '',
    showPassword: false,
    nameError: '',
    emailError: '',
    passwordError: '',
  });

  // Mutation hook
  const [registerFirstAdmin, { loading: isRegistering, error: mutationError }] = useMutation<
    { user: { registerFirstAdmin: RegisterResult } },
    { input: AdminRegistrationInput }
  >(REGISTER_FIRST_ADMIN_MUTATION);

  // Form handlers
  const updateFormState =
    (field: keyof typeof formState) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormState({
        ...formState,
        [field]: e.target.value,
        // Clear error when typing
        ...(field === 'name' && formState.nameError ? { nameError: '' } : {}),
        ...(field === 'email' && formState.emailError ? { emailError: '' } : {}),
        ...(field === 'password' && formState.passwordError ? { passwordError: '' } : {}),
      });
    };

  const handleNameBlur = () => {
    const result = validateName(formState.name, t);
    setFormState({
      ...formState,
      nameError: result.errorMessage,
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

    const nameValidation = validateName(formState.name, t);
    const emailValidation = validateEmail(formState.email, t);
    const passwordValidation = validatePassword(formState.password, t);

    setFormState({
      ...formState,
      nameError: nameValidation.errorMessage,
      emailError: emailValidation.errorMessage,
      passwordError: passwordValidation.errorMessage,
    });

    if (nameValidation.isValid && emailValidation.isValid && passwordValidation.isValid) {
      registerFirstAdmin({
        variables: {
          input: {
            name: formState.name,
            email: formState.email,
            password: formState.password,
          },
        },
      })
        .then(({ data }) => {
          if (data?.user.registerFirstAdmin) {
            const authData = data.user.registerFirstAdmin;
            login({
              accessToken: authData.accessToken,
              refreshToken: authData.refreshToken,
              userId: authData.user.id,
            });
          }
        })
        .catch((error: ApolloError) => {
          console.error('Registration error:', error);
        });
    }
  };

  return (
    <>
      {!!mutationError && <RegisterError t={t} />}

      <Box component="form" onSubmit={handleSubmit}>
        <TextField
          margin="normal"
          required
          fullWidth
          id="name"
          label={t('auth.name')}
          name="name"
          autoComplete="name"
          value={formState.name}
          size="small"
          onChange={updateFormState('name')}
          onBlur={handleNameBlur}
          error={!!formState.nameError}
          helperText={formState.nameError}
        />
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
          autoComplete="new-password"
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
          disabled={isRegistering}
          loading={isRegistering}
          loadingPosition="start"
          sx={{ mt: 3, mb: 2 }}
        >
          {t('auth.register')}
        </Button>
      </Box>
    </>
  );
}

/**
 * Registration page main component
 */
function RegisterPage(): JSX.Element {
  const { t } = useTranslation();
  const { isFirstAdminCreated, loading: isFirstAdminCheckLoading } = useFirstAdminCheck();

  return (
    <div className="flex grow items-center justify-center px-4 lg:px-0">
      <Card className="max-w-md">
        <CardHeader title={t('auth.register')} subheader={t('auth.registerSubheader')} />
        <CardContent>
          {isFirstAdminCheckLoading && <HashLoader color="#1d1d1d" className="mx-auto my-12" />}

          {!isFirstAdminCheckLoading && isFirstAdminCreated && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <p>{t('auth.noNeedAdminWarning')}</p>
              <Link href="/login" variant="body2">
                {t('auth.noNeedAdminWarningLink')}
              </Link>
            </Alert>
          )}

          {!isFirstAdminCheckLoading && !isFirstAdminCreated && <RegistrationForm t={t} />}
        </CardContent>
      </Card>
    </div>
  );
}

export default RegisterPage;
