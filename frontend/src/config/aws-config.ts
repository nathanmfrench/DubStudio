import { Amplify } from 'aws-amplify';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';
import { signIn, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { CognitoIdentityClient } from '@aws-sdk/client-cognito-identity';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-provider-cognito-identity';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Get configuration from Expo constants
const expoConfig = Constants.expoConfig?.extra;

if (!expoConfig) {
  throw new Error('Missing Expo configuration');
}

// Development values
const config = {
  aws: {
    region: expoConfig.EXPO_PUBLIC_AWS_REGION || 'us-east-1',
    userPoolId: expoConfig.EXPO_PUBLIC_AWS_USER_POOL_ID || 'us-east-1_Sv5SbRCAV',
    userPoolClientId: expoConfig.EXPO_PUBLIC_AWS_USER_POOL_CLIENT_ID || '7kteo366fu3jrda6oi462mc258',
    identityPoolId: expoConfig.EXPO_PUBLIC_AWS_IDENTITY_POOL_ID || 'us-east-1:335ded2f-915b-4d7e-9c51-369e29c706cd'
  },
  api: {
    baseUrl: expoConfig.EXPO_PUBLIC_API_URL || 'https://yajlya1xkl.execute-api.us-east-1.amazonaws.com/prod'
  }
};

console.log('AWS Config being used:', config.aws);

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
      console.error('[Auth] Error getting auth headers:', error);
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