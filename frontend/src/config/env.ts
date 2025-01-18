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
}

// Debug Expo config
console.log('Raw Expo config:', {
  extra: Constants.expoConfig?.extra,
  manifest: Constants.manifest
});

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
  };
  
  console.log('Generated config:', config);
  return config;
};

export const config = getConfig(); 