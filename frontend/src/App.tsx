import { ApolloProvider } from '@apollo/client';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { BrowserRouter, Route, Routes } from 'react-router';
import AppLayout from './components/layout/app-layout';
import AuthLayout from './components/layout/auth-layout';
import { AuthProvider } from './hooks/useAuth';
import { initializeApollo } from './libs/apolloClient';
import theme from './libs/theme';
import ForgotPasswordPage from './pages/forgot-password';
import HomePage from './pages/home';
import LoginPage from './pages/login';
import RegisterPage from './pages/register';

function App() {
  const apolloClient = initializeApollo();

  if (!apolloClient) return null;

  return (
    <ThemeProvider theme={theme} defaultMode="system">
      <CssBaseline />
      <BrowserRouter>
        <ApolloProvider client={apolloClient}>
          <AuthProvider>
            <Routes>
              {/* Unauthenticated Routes */}
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              </Route>
              {/*  */}
              <Route element={<AppLayout />}>
                <Route path="/" element={<HomePage />} />
              </Route>
            </Routes>
          </AuthProvider>
        </ApolloProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
