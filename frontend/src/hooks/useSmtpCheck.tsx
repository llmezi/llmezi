import { gql, useQuery } from '@apollo/client';

// ===============================
// Types and Interfaces
// ===============================

interface SmtpStatus {
  isSmtpReady: boolean;
}

// ===============================
// GraphQL Queries
// ===============================

const IS_SMTP_READY = gql`
  query CheckSmtpStatus {
    isSmtpReady
  }
`;

// ===============================
// SMTP Check Hook Implementation
// ===============================

/**
 * Custom hook to check if the SMTP server is properly configured and ready.
 * This is useful for features that depend on email functionality.
 *
 * @returns An object containing:
 *   - isSmtpReady: boolean indicating if SMTP server is ready (or undefined while loading)
 *   - loading: boolean indicating if the query is in progress
 *   - error: any GraphQL error that occurred
 */
export const useSmtpCheck = () => {
  const { data, loading, error } = useQuery<SmtpStatus>(IS_SMTP_READY, {
    fetchPolicy: 'network-only', // Don't use cache for this critical check
    notifyOnNetworkStatusChange: true,
  });

  return {
    isSmtpReady: data?.isSmtpReady,
    loading,
    error,
  };
};
