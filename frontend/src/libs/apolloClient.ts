import {
  ApolloClient,
  ApolloLink,
  from,
  HttpLink,
  InMemoryCache,
  NormalizedCacheObject,
  Observable,
} from '@apollo/client';
import { onError } from '@apollo/client/link/error';

/**
 * Apollo Client Configuration
 * This module handles GraphQL client setup with authentication, token refresh,
 * and error handling for the frontend application.
 */

// Global Apollo client instance
let apolloClient: ApolloClient<NormalizedCacheObject> | null = null;

// Server configuration
const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';
const graphqlUri = backendUrl.endsWith('/')
  ? backendUrl.slice(0, -1) + '/graphql'
  : backendUrl + '/graphql';

//-----------------------------------------------------------------------------
// Authentication token management
//-----------------------------------------------------------------------------

/**
 * Gets the current access token from local storage
 */
function getAccessToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

/**
 * Gets the current refresh token from local storage
 */
function getRefreshToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refreshToken');
}

/**
 * Stores or removes the access token in local storage
 */
function setAccessToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem('accessToken', token);
  else localStorage.removeItem('accessToken');
}

/**
 * Stores or removes the refresh token in local storage
 */
function setRefreshToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem('refreshToken', token);
  else localStorage.removeItem('refreshToken');
}

/**
 * Removes all auth tokens and resets Apollo cache
 */
function logout() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');

  if (apolloClient) {
    apolloClient.resetStore().catch(console.error);
  }
}

//-----------------------------------------------------------------------------
// Token refresh management
//-----------------------------------------------------------------------------

type RequestCallback = () => void;

// Track token refresh state
let isRefreshing = false;
let pendingRequests: RequestCallback[] = [];

/**
 * Registers a callback to be executed after token refresh
 */
function registerAfterRefresh(callback: RequestCallback) {
  pendingRequests.push(callback);
}

/**
 * Executes all pending callbacks after successful token refresh
 */
function resolveAfterRefresh() {
  pendingRequests.forEach(callback => callback());
  pendingRequests = [];
}

/**
 * Refreshes the access token using the refresh token
 * Makes a direct GraphQL request to avoid circular dependencies
 */
async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  try {
    const response = await fetch(graphqlUri, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `mutation RefreshToken($token: String!) {
          refreshToken(token: $token) {
            accessToken
            refreshToken
          }
        }`,
        variables: { token: refreshToken },
      }),
    });

    const result = await response.json();

    if (result.errors) {
      throw new Error(result.errors[0]?.message || 'Token refresh failed');
    }

    const tokens = result.data?.refreshToken;
    if (!tokens?.accessToken || !tokens?.refreshToken) {
      throw new Error('Invalid token response');
    }

    setAccessToken(tokens.accessToken);
    setRefreshToken(tokens.refreshToken);

    return tokens.accessToken;
  } catch (error) {
    logout();
    throw error;
  }
}

/**
 * Validates token during Apollo initialization
 */
function performTokenValidation() {
  if (typeof window !== 'undefined') {
    const refreshToken = getRefreshToken();

    if (refreshToken && !isRefreshing) {
      isRefreshing = true;
      refreshAccessToken()
        .catch(error => {
          console.error('Failed to refresh token during initialization:', error);
        })
        .finally(() => {
          isRefreshing = false;
        });
    }
  }
}

//-----------------------------------------------------------------------------
// Apollo Link Configuration
//-----------------------------------------------------------------------------

// Basic HTTP link for GraphQL requests
const httpLink = new HttpLink({ uri: graphqlUri });

/**
 * Auth link that adds the Authorization header with the current access token
 */
const authLink = new ApolloLink((operation, forward) => {
  const accessToken = getAccessToken();

  operation.setContext(({ headers = {} }) => ({
    headers: {
      ...headers,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  }));

  return forward(operation);
});

// Operations that don't require authentication or token refresh
const noAuthOperations = [
  'login',
  'refreshtoken',
  'requestpasswordreset',
  'resetpassword',
  'registeradmin',
];

/**
 * Error handling link that manages authentication errors and token refresh
 */
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    const operationName = operation.operationName?.toLowerCase();
    const isAuthOperation = noAuthOperations.includes(operationName);

    for (const err of graphQLErrors) {
      // Handle authentication errors only for operations that require auth
      if (err.extensions?.code === 'UNAUTHENTICATED' && !isAuthOperation) {
        // Queue this operation if a refresh is already in progress
        if (isRefreshing) {
          return new Observable(observer => {
            registerAfterRefresh(() => {
              const accessToken = getAccessToken();
              if (!accessToken) {
                observer.error(new Error('Authentication required'));
                return;
              }

              // Update headers with new token and retry
              operation.setContext(({ headers = {} }) => ({
                headers: {
                  ...headers,
                  Authorization: `Bearer ${accessToken}`,
                },
              }));

              forward(operation).subscribe({
                next: observer.next.bind(observer),
                error: observer.error.bind(observer),
                complete: observer.complete.bind(observer),
              });
            });
          });
        }

        isRefreshing = true;

        // Handle token refresh and retry operation
        return new Observable(observer => {
          refreshAccessToken()
            .then(() => {
              const accessToken = getAccessToken();
              operation.setContext(({ headers = {} }) => ({
                headers: {
                  ...headers,
                  Authorization: `Bearer ${accessToken}`,
                },
              }));

              resolveAfterRefresh();

              forward(operation).subscribe({
                next: observer.next.bind(observer),
                error: observer.error.bind(observer),
                complete: observer.complete.bind(observer),
              });
            })
            .catch(error => {
              pendingRequests.forEach(callback => callback());
              pendingRequests = [];
              observer.error(error);
            })
            .finally(() => {
              isRefreshing = false;
            });
        });
      }
    }
  }

  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
  }
});

//-----------------------------------------------------------------------------
// Apollo Client Creation
//-----------------------------------------------------------------------------

/**
 * Creates a new Apollo Client instance with all configurations
 */
function createApolloClient() {
  return new ApolloClient({
    link: from([errorLink, authLink, httpLink]),
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first',
        errorPolicy: 'all',
      },
      query: {
        fetchPolicy: 'cache-first',
        errorPolicy: 'all',
      },
      mutate: {
        errorPolicy: 'all',
      },
    },
  });
}

/**
 * Initializes and returns the Apollo Client instance
 * Can be called multiple times but will reuse the same instance
 */
export function initializeApollo() {
  if (!apolloClient || typeof window === 'undefined') {
    apolloClient = createApolloClient();
  }

  performTokenValidation();
  return apolloClient;
}
