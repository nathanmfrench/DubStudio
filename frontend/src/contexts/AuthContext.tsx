import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { signIn, signUp, signOut, getCurrentUser, confirmSignUp, resetPassword, confirmResetPassword, resendSignUpCode, fetchAuthSession } from 'aws-amplify/auth';
import type { SignUpInput } from 'aws-amplify/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any | null;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (params: SignUpInput) => Promise<any>;
  signOut: () => Promise<void>;
  confirmSignUp: (email: string, code: string) => Promise<any>;
  resendSignUpCode: (email: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuthState();
  }, []);

  async function checkAuthState() {
    setLoading(true);
    try {
      const authUser = await getCurrentUser();
      setUser(authUser);
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
      console.log('AuthContext: Starting sign in...');
      
      const signInResult = await signIn({
        username: email,
        password,
        options: {
          authFlowType: 'USER_PASSWORD_AUTH'
        }
      });
      
      console.log('AuthContext: Sign in result:', signInResult);
      
      if (signInResult.isSignedIn) {
        // Fetch session without trying to pass scopes
        const session = await fetchAuthSession();
        
        // Log the complete access token details
        if (session.tokens?.accessToken) {
          console.log('AuthContext: Access Token Details:', {
            jwtToken: session.tokens.accessToken.toString(),
            payload: session.tokens.accessToken.payload,
            scopes: session.tokens.accessToken.payload.scope?.split(' ') || []
          });
        }

        // Get and set the current user
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        setIsAuthenticated(true);
        console.log('AuthContext: Successfully signed in and set user state');
        
        return signInResult;
      } else {
        throw new Error('Sign in failed - user not signed in after completion');
      }
    } catch (error) {
      console.error('AuthContext: Sign in error:', error);
      setUser(null);
      setIsAuthenticated(false);
      setError(error instanceof Error ? error.message : 'An error occurred during sign in');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (params: SignUpInput) => {
    setLoading(true);
    setError(null);
    try {
      const result = await signUp(params);
      return result;
    } catch (error: any) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSignUp = async (email: string, code: string) => {
    setLoading(true);
    setError(null);
    try {
      return await confirmSignUp({ username: email, confirmationCode: code });
    } catch (error: any) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      await resendSignUpCode({ username: email });
    } catch (error: any) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    setError(null);
    try {
      await signOut();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error: any) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      await resetPassword({ username: email });
    } catch (error: any) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (email: string, code: string, newPassword: string) => {
    setLoading(true);
    setError(null);
    try {
      await confirmResetPassword({
        username: email,
        confirmationCode: code,
        newPassword,
      });
    } catch (error: any) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    isAuthenticated,
    user,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    confirmSignUp: handleConfirmSignUp,
    resendSignUpCode: handleResendCode,
    forgotPassword: handleForgotPassword,
    resetPassword: handleResetPassword,
    loading,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}