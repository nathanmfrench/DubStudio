import { fetchAuthSession } from 'aws-amplify/auth';

export async function getAuthToken(): Promise<string | null> {
  try {
    const session = await fetchAuthSession();
    const accessToken = session.tokens?.accessToken;
    
    if (!accessToken) {
      console.error('[Auth] No access token found in session');
      return null;
    }
    
    return accessToken.toString();
  } catch (error) {
    console.error('[Auth] Error getting auth token:', error);
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expirationTime = payload.exp * 1000; // Convert to milliseconds
    return Date.now() >= expirationTime;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true;
  }
}