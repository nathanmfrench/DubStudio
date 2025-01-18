import { Amplify } from 'aws-amplify';
import { config } from './env';

if (!config.aws.userPoolId || !config.aws.userPoolClientId || !config.aws.region) {
  console.error('AWS Configuration:', config.aws);
  throw new Error('Missing required AWS configuration');
}

if (!config.api.baseUrl) {
  console.error('API Configuration:', config.api);
  throw new Error('Missing required API configuration');
}

// Configure Amplify
const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: config.aws.userPoolId,
      userPoolClientId: config.aws.userPoolClientId,
    },
    region: config.aws.region
  }
};

console.log('Configuring Amplify with:', JSON.stringify(amplifyConfig, null, 2));
Amplify.configure(amplifyConfig);

// These endpoints are for your backend API
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