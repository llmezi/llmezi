import { gql, useQuery } from '@apollo/client';

const IS_SMTP_READY = gql`
  query CheckSmtpStatus {
    isSmtpReady
  }
`;

interface SmtpStatus {
  isSmtpReady: boolean;
}

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
