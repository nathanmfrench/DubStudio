import { Amplify } from 'aws-amplify';
import { config } from './env';

if (!config.aws.userPoolId || !config.aws.userPoolClientId || !config.aws.region) {
  console.error('AWS Configuration:', config.aws);
  throw new Error('Missing required AWS configuration');
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

console.log('Configuring Amplify with:', amplifyConfig);
Amplify.configure(amplifyConfig);

// These endpoints are for your backend API
export const apiEndpoints = {
  videos: {
    upload: `${config.api.baseUrl}/v1/videos`,
    process: (videoId: string) => `${config.api.baseUrl}/v1/videos/${videoId}/process`,
    status: (videoId: string) => `${config.api.baseUrl}/v1/videos/${videoId}/status`,
  },
}; 