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

// Default configuration values
const defaultConfig: Config = {
  environment: 'development',
  api: {
    baseUrl: 'https://ve5pvzxy2d.execute-api.us-east-1.amazonaws.com/prod',
    timeout: 10000,
    retries: 3,
  },
  aws: {
    region: 'us-east-1',
    userPoolId: 'us-east-1_H8AcY3ZlK',
    userPoolClientId: '6hqhp7husqc641npi0dihj8a8b',
  },
};

// Development configuration
const developmentConfig: Partial<Config> = {
  environment: 'development',
  api: {
    baseUrl: Constants.expoConfig?.extra?.apiUrl || 'https://ve5pvzxy2d.execute-api.us-east-1.amazonaws.com/prod',
    timeout: 10000,
    retries: 3,
  },
};

// Production configuration
const productionConfig: Partial<Config> = {
  environment: 'production',
  api: {
    baseUrl: Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || 'https://ve5pvzxy2d.execute-api.us-east-1.amazonaws.com/prod',
    timeout: 15000,
    retries: 2,
  },
};

// Get the current environment
const getEnvironment = (): Environment => {
  return (Constants.expoConfig?.extra?.environment as Environment) || 'development';
};

// Merge configurations based on environment
const getConfig = (): Config => {
  const environment = getEnvironment();
  const environmentConfig = environment === 'production' ? productionConfig : developmentConfig;
  
  return {
    ...defaultConfig,
    ...environmentConfig,
  };
};

export const config = getConfig(); 