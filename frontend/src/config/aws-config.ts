import { Amplify } from 'aws-amplify';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';
import { signIn, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { CognitoIdentityClient } from '@aws-sdk/client-cognito-identity';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-provider-cognito-identity';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { config } from './env';

console.log('Expo Config:', Constants.expoConfig?.extra);
console.log('AWS Config being used:', {
  region: config.aws.region,
  userPoolId: config.aws.userPoolId,
  userPoolClientId: config.aws.userPoolClientId
});

console.log('Raw environment variables:', {
  userPoolId: process.env.EXPO_PUBLIC_AWS_USER_POOL_ID,
  userPoolClientId: process.env.EXPO_PUBLIC_AWS_USER_POOL_CLIENT_ID,
  region: process.env.EXPO_PUBLIC_AWS_REGION
});

console.log('Config object:', config.aws);

// Check for required AWS configuration
if (!config.aws.userPoolId || !config.aws.userPoolClientId || !config.aws.region) {
  console.error('Missing required AWS configuration:', {
    userPoolId: config.aws.userPoolId,
    userPoolClientId: config.aws.userPoolClientId,
    region: config.aws.region
  });
  throw new Error('Missing required AWS configuration');
}

// Configure token storage
cognitoUserPoolsTokenProvider.setKeyValueStorage(AsyncStorage);

// Auth Manager for handling all authentication operations
class AuthManager {
  private static instance: AuthManager;
  private identityClient: CognitoIdentityClient;

  private constructor() {
    this.identityClient = new CognitoIdentityClient({ region: config.aws.region });
  }

  public static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  public async signIn(email: string, password: string) {
    try {
      console.log('[Auth] Starting SRP authentication flow...');
      
      const signInResult = await signIn({
        username: email,
        password,
        options: {
          authFlowType: 'USER_SRP_AUTH'
        }
      });

      console.log('[Auth] SRP authentication result:', {
        isSignedIn: signInResult.isSignedIn,
        nextStep: signInResult.nextStep
      });

      if (signInResult.isSignedIn) {
        const session = await this.getSession();
        console.log('[Auth] Session established:', {
          hasIdToken: !!session.tokens?.idToken,
          hasAccessToken: !!session.tokens?.accessToken,
        });
      }

      return signInResult;
    } catch (error) {
      console.error('[Auth] SRP authentication error:', error);
      throw error;
    }
  }

  public async getSession() {
    try {
      const session = await fetchAuthSession();
      if (!session.tokens?.accessToken) {
        throw new Error('No access token available');
      }
      return session;
    } catch (error) {
      console.error('[Auth] Error getting session:', error);
      throw error;
    }
  }

  public async getCredentials() {
    try {
      const session = await this.getSession();
      if (!session.tokens?.idToken) {
        throw new Error('No ID token available');
      }

      const credentials = await fromCognitoIdentityPool({
        client: this.identityClient,
        identityPoolId: config.aws.identityPoolId,
        logins: {
          [`cognito-idp.${config.aws.region}.amazonaws.com/${config.aws.userPoolId}`]: session.tokens.idToken.toString()
        }
      })();

      return credentials;
    } catch (error) {
      console.error('[Auth] Error getting credentials:', error);
      throw error;
    }
  }

  public async getAuthHeaders() {
    try {
      const session = await this.getSession();
      const token = session.tokens?.accessToken.toString();
      console.log('[Auth] Access token:', token);
      return {
        Authorization: `Bearer ${token}`
      };
    } catch (error) {
      console.error('[Auth] Error getting auth headers (this occurs in the', error);
      throw error;
    }
  }

  public async checkAuthState() {
    try {
      const user = await getCurrentUser();
      const session = await this.getSession();
      return { user, session };
    } catch (error) {
      console.error('[Auth] No authenticated user:', error);
      throw error;
    }
  }
}

// Initialize auth manager
export const authManager = AuthManager.getInstance();

// Export API endpoints configuration
export const apiEndpoints = {
  videos: {
    upload: `${config.api.baseUrl}/v1/videos`,
    process: (videoId: string) => `${config.api.baseUrl}/v1/videos/${videoId}/process`,
    status: (videoId: string) => `${config.api.baseUrl}/v1/videos/${videoId}/status`,
  },
};

// Amplify configuration
export const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: config.aws.userPoolId,
      userPoolClientId: config.aws.userPoolClientId,
      region: config.aws.region,
      signInWithUsername: false,
      signInWithEmail: true,
      authenticationFlowType: 'USER_SRP_AUTH',
      loginWith: {
        username: false,
        email: true,
        phone: false,
        preferredAuth: ['srp']
      }
    }
  },
  API: {
    REST: {
      dubstudio: {
        endpoint: config.api.baseUrl,
        region: config.aws.region,
        custom_header: () => authManager.getAuthHeaders()
      }
    }
  }
};

// Initialize Amplify
Amplify.configure(amplifyConfig);

// Export auth utilities
export const auth = {
  signIn: (email: string, password: string) => authManager.signIn(email, password),
  getSession: () => authManager.getSession(),
  getCredentials: () => authManager.getCredentials(),
  getAuthHeaders: () => authManager.getAuthHeaders(),
  checkAuthState: () => authManager.checkAuthState()
}; 