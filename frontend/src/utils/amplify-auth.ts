import { fetchAuthSession as amplifyFetchAuthSession, getCurrentUser as amplifyGetCurrentUser } from 'aws-amplify/auth';

class AuthManager {
  private static instance: AuthManager;
  private initialized = false;

  private constructor() {}

  public static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  public async getAuthHeaders() {
    try {
      const session = await amplifyFetchAuthSession();
      if (!session.tokens?.accessToken) {
        console.error('[API] No access token available in session');
        throw new Error('No access token available');
      }
      return {
        Authorization: `Bearer ${session.tokens.accessToken.toString()}`
      };
    } catch (error) {
      console.error('[API] Error getting auth header:', error);
      throw error;
    }
  }

  public async checkAuthState() {
    try {
      const user = await amplifyGetCurrentUser();
      console.log('Current user found:', user.username);
      
      const session = await amplifyFetchAuthSession();
      console.log('Initial session state:', {
        hasTokens: !!session.tokens,
        idToken: session.tokens?.idToken ? {
          tokenUse: session.tokens.idToken.payload.token_use,
          expiration: session.tokens.idToken.payload.exp ? 
            new Date(session.tokens.idToken.payload.exp * 1000).toISOString() : 
            'No expiration',
          scopes: session.tokens.idToken.payload.scope?.split(' ') || []
        } : 'No ID Token'
      });
    } catch (error) {
      console.log('No authenticated user found:', error);
    }
  }
}

export const authManager = AuthManager.getInstance();
export const getAuthHeaders = () => authManager.getAuthHeaders();
export const checkAuthState = () => authManager.checkAuthState();