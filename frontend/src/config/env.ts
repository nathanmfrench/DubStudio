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
export const getEnvironment = (): Environment => {
  const env = Constants.expoConfig?.extra?.EXPO_PUBLIC_ENVIRONMENT as Environment;
  console.log('Current environment:', env);
  return env || 'development';
};

// Export API endpoints configuration
export const apiEndpoints = {
  videos: {
    upload: '/v1/videos',
    process: (videoId: string) => `/v1/videos/${videoId}/process`,
    status: (videoId: string) => `/v1/videos/${videoId}/status`,
  },
};

// Get configuration from environment variables
const getConfig = (): Config => {
  const expoConfig = Constants.expoConfig?.extra;
  
  if (!expoConfig) {
    console.error('Missing Expo configuration');
    throw new Error('Missing Expo configuration');
  }

  // Development fallback values
  const devConfig = {
    region: 'us-east-1',
    userPoolId: 'us-east-1_Sv5SbRCAV',
    userPoolClientId: '7kteo366fu3jrda6oi462mc258',
    apiUrl: 'https://yajlya1xkl.execute-api.us-east-1.amazonaws.com/prod'
  };

  // Log raw values for debugging
  console.log('Raw Expo config:', Constants.expoConfig);
  console.log('Raw extra config:', expoConfig);
  console.log('Development fallback config:', devConfig);

  // Extract AWS configuration with development fallbacks
  const awsConfig = {
    region: expoConfig.EXPO_PUBLIC_AWS_REGION || process.env.EXPO_PUBLIC_AWS_REGION || devConfig.region,
    userPoolId: expoConfig.EXPO_PUBLIC_AWS_USER_POOL_ID || process.env.EXPO_PUBLIC_AWS_USER_POOL_ID || devConfig.userPoolId,
    userPoolClientId: expoConfig.EXPO_PUBLIC_AWS_USER_POOL_CLIENT_ID || process.env.EXPO_PUBLIC_AWS_USER_POOL_CLIENT_ID || devConfig.userPoolClientId,
  };

  console.log('Extracted AWS config:', awsConfig);

  const config = {
    environment: getEnvironment(),
    api: {
      baseUrl: expoConfig.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_URL || devConfig.apiUrl,
      timeout: Number(expoConfig.EXPO_PUBLIC_API_TIMEOUT) || 30000,
      retries: Number(expoConfig.EXPO_PUBLIC_API_RETRIES) || 3
    },
    aws: awsConfig,
    instagram: {
      clientId: expoConfig.EXPO_PUBLIC_INSTAGRAM_CLIENT_ID || process.env.EXPO_PUBLIC_INSTAGRAM_CLIENT_ID || '',
      clientSecret: expoConfig.EXPO_PUBLIC_INSTAGRAM_CLIENT_SECRET || process.env.EXPO_PUBLIC_INSTAGRAM_CLIENT_SECRET || '',
      redirectUri: expoConfig.EXPO_PUBLIC_INSTAGRAM_REDIRECT_URI || process.env.EXPO_PUBLIC_INSTAGRAM_REDIRECT_URI || '',
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

  // Validate required AWS configuration
  const missingAwsConfig = Object.entries(awsConfig).filter(([_, value]) => !value);
  if (missingAwsConfig.length > 0) {
    console.error('Missing AWS configuration values:', missingAwsConfig.map(([key]) => key));
    throw new Error(`Missing required AWS configuration: ${missingAwsConfig.map(([key]) => key).join(', ')}`);
  }

  // Validate API configuration
  if (!config.api.baseUrl) {
    console.error('Missing required API configuration:', config.api);
    throw new Error('Missing required API configuration');
  }
  
  console.log('Final validated config:', config);
  return config;
};

export const config = getConfig(); 