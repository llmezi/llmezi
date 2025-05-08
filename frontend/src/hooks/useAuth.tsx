/* eslint-disable  react-hooks/exhaustive-deps, react-refresh/only-export-components */
import { gql, useMutation } from '@apollo/client';
import { createContext, ReactNode, useContext, useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage';

// ===============================
// Types and Interfaces
// ===============================

interface AuthContextType {
  isLoggedIn: boolean;
  login: (credentials: {
    accessToken: string;
    refreshToken: string;
    userId: string;
  }) => Promise<void>;
  logout: () => void;
}

interface AuthProviderProps {
  children: ReactNode;
}

interface LoginCredentials {
  accessToken: string;
  refreshToken: string;
  userId: string;
}

// ===============================
// GraphQL Queries
// ===============================

const LOGOUT_MUTATION = gql`
  mutation Logout($refreshToken: String!) {
    auth {
      logout(refreshToken: $refreshToken)
    }
  }
`;

// ===============================
// Auth Context Implementation
// ===============================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [accessToken, setAccessToken] = useLocalStorage<string | null>('accessToken', null);
  const [refreshToken, setRefreshToken] = useLocalStorage<string | null>('refreshToken', null);
  const [userId, setUserId] = useLocalStorage<string | null>('userId', null);

  const [logoutMutation] = useMutation(LOGOUT_MUTATION);

  /**
   * Authenticate the user with the provided credentials
   */
  const login = async ({ accessToken, refreshToken, userId }: LoginCredentials): Promise<void> => {
    setAccessToken(accessToken);
    setRefreshToken(refreshToken);
    setUserId(userId);
  };

  /**
   * Sign out the currently logged in user
   */
  const logout = (): Promise<void> => {
    if (refreshToken) {
      logoutMutation({ variables: { refreshToken } });
    }

    setAccessToken(null);
    setRefreshToken(null);
    setUserId(null);
  };

  const value = useMemo<AuthContextType>(
    () => ({
      isLoggedIn: !!accessToken && !!refreshToken && !!userId,
      login,
      logout,
    }),
    [accessToken, refreshToken, userId]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Custom hook to access the authentication context
 * @returns Authentication context with login, logout and auth state
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
