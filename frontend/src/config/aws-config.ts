import { Amplify } from 'aws-amplify';
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
import { config } from './env';

// Check for required AWS configuration
if (!config.aws.userPoolId || !config.aws.userPoolClientId || !config.aws.region) {
  console.error('Missing required AWS configuration:', {
    userPoolId: config.aws.userPoolId,
    userPoolClientId: config.aws.userPoolClientId,
    region: config.aws.region
  });
  throw new Error('Missing required AWS configuration');
}

// Configure Amplify
const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: config.aws.userPoolId,
      userPoolClientId: config.aws.userPoolClientId,
      region: config.aws.region
    }
  }
};

console.log('Configuring Amplify with:', JSON.stringify(amplifyConfig, null, 2));
Amplify.configure(amplifyConfig);

// Check initial auth state
async function checkAuthState() {
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

checkAuthState();

// API endpoints configuration
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