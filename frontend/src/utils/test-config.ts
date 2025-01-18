import Constants from 'expo-constants';

export function testConfig() {
  console.log('Environment Variables:', {
    ENVIRONMENT: Constants.expoConfig?.extra?.EXPO_PUBLIC_ENVIRONMENT,
    API_URL: Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL,
    AWS_REGION: Constants.expoConfig?.extra?.EXPO_PUBLIC_AWS_REGION,
    USER_POOL_ID: Constants.expoConfig?.extra?.EXPO_PUBLIC_AWS_USER_POOL_ID,
    USER_POOL_CLIENT_ID: Constants.expoConfig?.extra?.EXPO_PUBLIC_AWS_USER_POOL_CLIENT_ID,
  });
} 