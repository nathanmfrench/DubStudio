import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_TOKEN_KEY = '@auth_token';

export async function getAuthToken(): Promise<string | null> {
  try {
    const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      throw new Error('No authentication token found');
    }
    return token;
  } catch (error) {
    console.error('Error getting auth token:', error);
    throw error;
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