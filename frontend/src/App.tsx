import { ApolloProvider } from '@apollo/client';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { BrowserRouter, Route, Routes } from 'react-router';
import AppLayout from './components/layout/app-layout';
import AuthLayout from './components/layout/auth-layout';
import SettingLayout from './components/layout/setting-layout';
import { AlertProvider } from './hooks/useAlert';
import { AuthProvider } from './hooks/useAuth';
import { initializeApollo } from './libs/apolloClient';
import theme from './libs/theme';
import ForgotPasswordPage from './pages/auth/forgot-password';
import LoginPage from './pages/auth/login';
import RegisterPage from './pages/auth/register';
import HomePage from './pages/home';
import EmailServerSettingPage from './pages/setting/email-server';
import GeneralSettingPage from './pages/setting/general';

function App() {
  const apolloClient = initializeApollo();

  if (!apolloClient) return null;

  return (
    <ThemeProvider theme={theme} defaultMode="system">
      <CssBaseline />
      <BrowserRouter>
        <ApolloProvider client={apolloClient}>
          <AlertProvider>
            <AuthProvider>
              <Routes>
                {/* Unauthenticated Routes */}
                <Route element={<AuthLayout />}>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                </Route>
                {/* Main App Routes */}
                <Route element={<AppLayout />}>
                  <Route path="/" element={<HomePage />} />
                  <Route element={<SettingLayout />}>
                    <Route path="/setting" element={<GeneralSettingPage />} />
                    <Route path="/setting/email-server" element={<EmailServerSettingPage />} />
                  </Route>
                </Route>
              </Routes>
            </AuthProvider>
          </AlertProvider>
        </ApolloProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
