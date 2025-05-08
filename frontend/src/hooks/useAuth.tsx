/* eslint-disable  react-hooks/exhaustive-deps, react-refresh/only-export-components */
import { gql, useMutation } from '@apollo/client';
import { createContext, ReactNode, useContext, useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage';

interface AuthContextType {
  isLoggedIn: boolean;
  login: (credentials: {
    accessToken: string;
    refreshToken: string;
    userId: string;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const LOGOUT_MUTATION = gql`
  mutation Logout($refreshToken: String!) {
    auth {
      logout(refreshToken: $refreshToken)
    }
  }
`;

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [accessToken, setAccessToken] = useLocalStorage<string | null>('accessToken', null);
  const [refreshToken, setRefreshToken] = useLocalStorage<string | null>('refreshToken', null);
  const [userId, setUserId] = useLocalStorage<string | null>('userId', null);

  const [logoutMutation] = useMutation(LOGOUT_MUTATION);

  // call this function when you want to authenticate the user
  const login = async ({
    accessToken,
    refreshToken,
    userId,
  }: {
    accessToken: string;
    refreshToken: string;
    userId: string;
  }): Promise<void> => {
    setAccessToken(accessToken);
    setRefreshToken(refreshToken);
    setUserId(userId);
  };

  // call this function to sign out logged in user
  const logout = (): Promise<void> => {
    logoutMutation({ variables: { refreshToken } });

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

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
