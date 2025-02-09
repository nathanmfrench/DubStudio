import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchAuthSession } from 'aws-amplify/auth';

const AUTH_TOKEN_KEY = '@auth_token';

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

export async function setAuthToken(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch (error) {
    console.error('Error setting auth token:', error);
    throw error;
  }
}

export async function removeAuthToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
  } catch (error) {
    console.error('Error removing auth token:', error);
    throw error;
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