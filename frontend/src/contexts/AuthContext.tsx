import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { signIn as amplifySignIn, signUp, signOut, confirmSignUp, resetPassword, 
  confirmResetPassword, resendSignUpCode, getCurrentUser, fetchAuthSession,
  signInWithRedirect } from 'aws-amplify/auth';
import type { SignUpInput, ConfirmSignUpOutput, AuthUser } from 'aws-amplify/auth';
import { Alert, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';

const expoConfig = Constants.expoConfig?.extra;

if (!expoConfig) {
  throw new Error('Missing Expo configuration');
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (params: SignUpInput) => Promise<any>;
  signOut: () => Promise<void>;
  confirmSignUp: (email: string, code: string) => Promise<ConfirmSignUpOutput>;
  resendSignUpCode: (email: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuthState();
  }, []);

  async function checkAuthState() {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }

  const handleSignIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const { isSignedIn } = await amplifySignIn({ username: email, password });
      if (isSignedIn) {
        await checkAuthState();
      }
      return isSignedIn;
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred during sign in';
      setError(errorMessage);
      Alert.alert('Sign In Error', errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleError = (err: any, title: string) => {
    const errorMessage = err.message || `An error occurred during ${title.toLowerCase()}`;
    setError(errorMessage);
    Alert.alert(title, errorMessage);
    throw err;
  };

  const getAccessToken = async () => {
    try {
      const { tokens } = await fetchAuthSession();
      return tokens?.accessToken?.toString() || null;
    } catch (err) {
      console.error('Error getting access token:', err);
      return null;
    }
  };

  const value: AuthContextType = {
    isAuthenticated,
    user,
    signIn: handleSignIn,
    signUp,
    signOut: async () => {
      await signOut();
      setUser(null);
      setIsAuthenticated(false);
    },
    confirmSignUp: async (email: string, code: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await confirmSignUp({ username: email, confirmationCode: code });
        if (!result) {
          throw new Error('Confirmation failed');
        }
        return result;
      } catch (err) {
        handleError(err, 'Confirmation Error');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    resendSignUpCode: async (email: string) => {
      setLoading(true);
      setError(null);
      try {
        await resendSignUpCode({ username: email });
      } catch (err) {
        handleError(err, 'Code Resend Error');
      } finally {
        setLoading(false);
      }
    },
    forgotPassword: async (email: string) => {
      setLoading(true);
      setError(null);
      try {
        await resetPassword({ username: email });
      } catch (err) {
        handleError(err, 'Password Reset Error');
      } finally {
        setLoading(false);
      }
    },
    resetPassword: async (email: string, code: string, newPassword: string) => {
      setLoading(true);
      setError(null);
      try {
        await confirmResetPassword({
          username: email,
          confirmationCode: code,
          newPassword
        });
      } catch (err) {
        handleError(err, 'Password Reset Error');
      } finally {
        setLoading(false);
      }
    },
    loading,
    error,
    getAccessToken
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};