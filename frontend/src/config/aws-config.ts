import { Amplify } from 'aws-amplify';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { config } from './env';
import { getAuthHeaders } from '../utils/amplify-auth';

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

// Export API endpoints configuration
export const apiEndpoints = {
  videos: {
    upload: `${config.api.baseUrl}/v1/videos`,
    process: (videoId: string) => `${config.api.baseUrl}/v1/videos/${videoId}/process`,
    status: (videoId: string) => `${config.api.baseUrl}/v1/videos/${videoId}/status`,
  },
};

// Configure token storage first
cognitoUserPoolsTokenProvider.setKeyValueStorage(AsyncStorage);

// Export the configuration object
export const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.EXPO_PUBLIC_AWS_USER_POOL_ID!,
      userPoolClientId: process.env.EXPO_PUBLIC_AWS_USER_POOL_CLIENT_ID!,
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
        endpoint: process.env.EXPO_PUBLIC_API_URL!,
        region: process.env.EXPO_PUBLIC_AWS_REGION!,
        custom_header: getAuthHeaders
      }
    }
  }
};

console.log('Amplify API Config:', amplifyConfig.API.REST);

console.log('Initializing Amplify with config:', {
  userPoolId: config.aws.userPoolId?.substring(0, 6) + '...',
  userPoolClientId: config.aws.userPoolClientId?.substring(0, 6) + '...',
  region: config.aws.region
});

// Initialize Amplify
Amplify.configure(amplifyConfig);

// Re-export auth utilities
export { getAuthHeaders, checkAuthState } from '../utils/amplify-auth'; 