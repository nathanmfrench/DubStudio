import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
import { config } from './env';
import Constants from 'expo-constants';

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

// Export the configuration object
export const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: config.aws.userPoolId,
      userPoolClientId: config.aws.userPoolClientId,
      region: config.aws.region,
      authorizationType: 'AMAZON_COGNITO_USER_POOLS'
    }
  },
  API: {
    REST: {
      dubstudio: {
        endpoint: config.api.baseUrl,
        region: config.aws.region,
        authorization: {
          type: 'AMAZON_COGNITO_USER_POOLS'
        }
      }
    }
  }
};

// Export the check function to be called after configuration
export async function checkAuthState() {
  try {
    const user = await getCurrentUser();
    console.log('Current user found:', user.username);
    
    const session = await fetchAuthSession();
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

// Export API endpoints configuration separately
export const apiEndpoints = {
  videos: {
    upload: `${config.api.baseUrl}/v1/videos`,
    process: (videoId: string) => `${config.api.baseUrl}/v1/videos/${videoId}/process`,
    status: (videoId: string) => `${config.api.baseUrl}/v1/videos/${videoId}/status`,
  },
};

console.log('API Endpoints configured:', {
  baseUrl: config.api.baseUrl,
  endpoints: apiEndpoints,
  region: config.aws.region,
  userPoolId: config.aws.userPoolId,
  userPoolClientId: config.aws.userPoolClientId
}); 