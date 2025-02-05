import Constants from 'expo-constants';

// Environment type definition
export type Environment = 'development' | 'staging' | 'production';

// Configuration interface
export interface Config {
  environment: Environment;
  api: {
    baseUrl: string;
    timeout: number;
    retries: number;
  };
  aws: {
    region: string;
    userPoolId: string;
    userPoolClientId: string;
  };
  instagram: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scopes: string[];
  };
}

// Get the current environment
const getEnvironment = (): Environment => {
  const env = Constants.expoConfig?.extra?.EXPO_PUBLIC_ENVIRONMENT as Environment;
  console.log('Current environment:', env);
  return env || 'development';
};

// Get configuration from environment variables
const getConfig = (): Config => {
  const config = {
    environment: getEnvironment(),
    api: {
      baseUrl: Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL || '',
      timeout: Number(Constants.expoConfig?.extra?.EXPO_PUBLIC_API_TIMEOUT) || 10000,
      retries: Number(Constants.expoConfig?.extra?.EXPO_PUBLIC_API_RETRIES) || 3,
    },
    aws: {
      region: Constants.expoConfig?.extra?.EXPO_PUBLIC_AWS_REGION || 'us-east-1',
      userPoolId: Constants.expoConfig?.extra?.EXPO_PUBLIC_AWS_USER_POOL_ID || '',
      userPoolClientId: Constants.expoConfig?.extra?.EXPO_PUBLIC_AWS_USER_POOL_CLIENT_ID || '',
    },
    instagram: {
      clientId: Constants.expoConfig?.extra?.EXPO_PUBLIC_INSTAGRAM_CLIENT_ID || '',
      clientSecret: Constants.expoConfig?.extra?.EXPO_PUBLIC_INSTAGRAM_CLIENT_SECRET || '',
      redirectUri: Constants.expoConfig?.extra?.EXPO_PUBLIC_INSTAGRAM_REDIRECT_URI || '',
      scopes: [
        'instagram_basic',
        'instagram_manage_insights',
        'instagram_content_publish',
        'instagram_business_basic',
        'instagram_business_content_publish',
        'pages_show_list',
        'pages_read_engagement',
        'business_management'
      ]
    }
  };
  
  console.log('Generated config:', config);
  return config;
};

export const config = getConfig(); 