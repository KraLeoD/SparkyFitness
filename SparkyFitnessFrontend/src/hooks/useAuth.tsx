import React, {
  createContext,
  useContext,
  type ReactNode,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  REDIRECT_TRACKING_KEY,
  SW_UNREGISTERED_KEY,
  cancelScheduledRedirect,
} from '@/services/api';

interface User {
  id: string;
  email: string;
  name: string | null;
  activeUserId?: string;
  role?: string;
  twoFactorEnabled?: boolean;
  mfaEmailEnabled?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signIn: (
    userId: string,
    activeUserId: string,
    userEmail: string,
    userRole: string,
    navigateOnSuccess?: boolean,
    userFullName?: string
  ) => void;
  refreshUser: () => Promise<void>;
  switchContext: (targetUserId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const [user, setUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(true); // Track initial hydration
  const navigate = useNavigate();
  const prevSessionRef = React.useRef<typeof session>(null);

  // Only show global loading during initial hydration (isSyncing).
  // Ignoring sessionLoading avoids unmounting components (like Auth/MFA) during background re-fetches.
  const isLoading = isSyncing;

  const [lastManualSignIn, setLastManualSignIn] = useState<number>(0);

  // 1. Sync Effect: Updates User state when Session changes or invalidates
  useEffect(() => {
    const checkSession = async () => {
      try {
        let userAuthenticated = false;

        // Attempt to check OIDC session first
        try {
          const oidcResponse = await fetch('/openid/api/me', {
            credentials: 'include',
          });
          if (oidcResponse.ok) {
            const userData = await oidcResponse.json();
            if (userData && userData.userId && userData.email) {
              const role = userData.role || 'user';
              setUser({
                id: userData.userId,
                email: userData.email,
                role: role,
              });
              userAuthenticated = true;

              // Clear redirect tracking timestamp when successfully authenticated
              // This ensures the next session expiration can trigger a redirect
              localStorage.removeItem(REDIRECT_TRACKING_KEY);
              localStorage.removeItem(SW_UNREGISTERED_KEY);
              // Mark that user has been authenticated - allows Service Worker registration
              localStorage.setItem('sparky_user_was_authenticated', 'true');

              // Register Service Worker now that user is authenticated
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js').catch((err) => {
                  console.warn('SW registration after auth failed:', err);
                });
              }

              cancelScheduledRedirect(); // Cancel any pending redirect
              console.debug(
                'Cleared redirect tracking - OIDC session is valid'
              );
            }
          } else if (
            oidcResponse.status === 401 ||
            oidcResponse.status === 403
          ) {
            // Session expired or unauthorized - this is expected when behind Authentik proxy
            // Don't log as warning, just note it for debugging
            console.debug(
              'OIDC session not found (401/403) - will check password session or trigger Authentik redirect'
            );
          }
        } catch (oidcError) {
          console.warn('OIDC session check failed:', oidcError);
        }

        // If not authenticated via OIDC, attempt to check password session
        if (!userAuthenticated) {
          try {
            const passwordResponse = await fetch('/api/auth/user', {
              credentials: 'include',
            });
            if (passwordResponse.ok) {
              const userData = await passwordResponse.json();
              if (userData && userData.userId && userData.email) {
                const role = userData.role || 'user';
                setUser({
                  id: userData.userId,
                  email: userData.email,
                  role: role,
                });
                userAuthenticated = true;

                // Clear redirect tracking timestamp when successfully authenticated
                // This ensures the next session expiration can trigger a redirect
                localStorage.removeItem(REDIRECT_TRACKING_KEY);
                localStorage.removeItem(SW_UNREGISTERED_KEY);
                // Mark that user has been authenticated - allows Service Worker registration
                localStorage.setItem('sparky_user_was_authenticated', 'true');

                // Register Service Worker now that user is authenticated
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.register('/sw.js').catch((err) => {
                    console.warn('SW registration after auth failed:', err);
                  });
                }

                cancelScheduledRedirect(); // Cancel any pending redirect
                console.debug(
                  'Cleared redirect tracking - password session is valid'
                );
              }
            } else if (
              passwordResponse.status === 401 ||
              passwordResponse.status === 403
            ) {
              // No valid session found - this triggers when Authentik session expires
              console.debug(
                'No valid session found (401/403) - user will need to re-authenticate'
              );
            }
          } catch (passwordError) {
            console.warn('Password session check failed:', passwordError);
          }
        }

        if (!userAuthenticated) {
          setUser(null);
          // Don't redirect here - let Authentik proxy handle initial authentication
          // The redirect will happen when API calls fail (handled in api.ts)
        }
      } catch (error) {
        console.error('Error during session check:', error);
        setUser(null);
      }
      setIsSyncing(false);
    };
  }, [session, sessionLoading, user, lastManualSignIn]);

  const refreshUser = useCallback(async () => {
    setIsSyncing(true); // Re-trigger syncing state during manual refresh
    try {
      // Force invalidate the session to ensure fresh data
      await authClient.getSession();
    } catch (error) {
      console.error('[Auth Hook] Error refreshing session:', error);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      const { error } = await authClient.signOut();
      if (error) {
        console.error('[Auth Hook] SignOut API error:', error);
      }
    } catch (err) {
      console.error('[Auth Hook] SignOut unexpected error:', err);
    }
    setUser(null);
    window.location.href = '/';
  }, []);

  const signIn = (
    userId: string,
    userEmail: string,
    userRole: string,
    authType: 'oidc' | 'password',
    navigateOnSuccess = true
  ) => {
    // authType is no longer stored in localStorage; session is managed by httpOnly cookies.
    setUser({ id: userId, email: userEmail, role: userRole });
    if (navigateOnSuccess) {
      navigate('/');
    }

    // Clear redirect tracking timestamp when user signs in
    // This ensures the next session expiration can trigger a redirect
    localStorage.removeItem(REDIRECT_TRACKING_KEY);
    localStorage.removeItem(SW_UNREGISTERED_KEY);
    // Mark that user has been authenticated - allows Service Worker registration
    localStorage.setItem('sparky_user_was_authenticated', 'true');

    // Register Service Worker now that user is authenticated
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('SW registration after auth failed:', err);
      });
    }

    cancelScheduledRedirect(); // Cancel any pending redirect
    console.debug('Cleared redirect tracking - user signed in via', authType);

    // Navigate to home after successful sign in (from upstream)
    if (navigateOnSuccess) {
      navigate('/');
    }
  };

  const switchContext = useCallback(
    async (targetUserId: string) => {
      try {
        const data = await switchUserContext(targetUserId);

        setUser((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            activeUserId: data.activeUserId || targetUserId,
          };
        });

        await refreshUser();
      } catch (error) {
        console.error(error);
        throw error;
      }
    },
    [refreshUser]
  );

  const value = useMemo(
    () => ({
      user,
      loading: isLoading,
      signOut,
      signIn,
      refreshUser,
      switchContext,
    }),
    [user, isLoading, signOut, signIn, refreshUser, switchContext]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
