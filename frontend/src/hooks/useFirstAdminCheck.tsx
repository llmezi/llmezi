import { gql, useQuery } from '@apollo/client';

// ===============================
// Types and Interfaces
// ===============================

interface FirstAdminCheckData {
  isFirstAdminCreated: boolean;
}

// ===============================
// GraphQL Queries
// ===============================

/**
 * GraphQL query to check if the first admin user has been created
 */
const IS_FIRST_ADMIN_CREATED = gql`
  query IsFirstAdminCreated {
    isFirstAdminCreated
  }
`;

/**
 * Custom hook to check if the first admin user has been created.
 * This is useful for first-time setup screens or initialization flows.
 *
 * @returns An object containing:
 *   - isFirstAdminCreated: boolean indicating if admin exists (or undefined while loading)
 *   - loading: boolean indicating if the query is in progress
 *   - error: any GraphQL error that occurred
 *   - refetch: function to manually refetch the data
 */
export const useFirstAdminCheck = () => {
  const { data, loading, error, refetch } = useQuery<FirstAdminCheckData>(IS_FIRST_ADMIN_CREATED, {
    fetchPolicy: 'network-only', // Don't use cache for this critical check
    notifyOnNetworkStatusChange: true,
  });

  return {
    isFirstAdminCreated: data?.isFirstAdminCreated,
    loading,
    error,
    refetch,
  };
};
