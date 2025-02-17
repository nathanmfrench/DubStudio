import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
import { config } from './env';
import Constants from 'expo-constants';
import { Amplify } from 'aws-amplify';

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

console.log('Initializing Amplify with config:', {
  userPoolId: config.aws.userPoolId,
  userPoolClientId: config.aws.userPoolClientId,
  region: config.aws.region
});

const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: config.aws.userPoolId,
      userPoolClientId: config.aws.userPoolClientId,
      region: config.aws.region,
      signUpVerificationMethod: 'code' as const
    }
  },
  API: {
    REST: {
      dubstudio: {
        endpoint: config.api.baseUrl,
        region: config.aws.region,
        authorizationType: 'AMAZON_COGNITO_USER_POOLS'
      }
    }
  }
};

// Initialize Amplify
Amplify.configure(amplifyConfig);

export { amplifyConfig };
export { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';

// Export API endpoints configuration
export const apiEndpoints = {
  videos: {
    upload: `${config.api.baseUrl}/v1/videos`,
    process: (videoId: string) => `${config.api.baseUrl}/v1/videos/${videoId}/process`,
    status: (videoId: string) => `${config.api.baseUrl}/v1/videos/${videoId}/status`,
  },
}; 