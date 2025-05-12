import { gql, useQuery } from '@apollo/client';

// ===============================
// Types and Interfaces
// ===============================

export interface User {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  isActive: boolean;
}

interface WhoAmIResponse {
  me: User | null;
  loading: boolean;
  error?: Error;
  refetch: () => Promise<{ data?: { me: User | null } }>;
}

// ===============================
// GraphQL Queries
// ===============================

const ME_QUERY = gql`
  query Me {
    me {
      id
      name
      avatar
      email
      isAdmin
      isActive
    }
  }
`;

// ===============================
// Hook Implementation
// ===============================

/**
 * Custom hook to fetch the current authenticated user
 * Uses the 'me' query from the user resolver
 * @returns Current user data and query state
 */
export const useWhoAmI = (): WhoAmIResponse => {
  const { data, loading, error, refetch } = useQuery(ME_QUERY, {
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
  });

  return {
    me: data?.me,
    loading,
    error: error as Error | undefined,
    refetch,
  };
};
