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
    baseUrl: 'http://localhost:3000',
    timeout: 10000,
    retries: 3,
  },
  aws: {
    region: 'us-east-1',
    userPoolId: 'us-east-1_J9JvV0AWa',
    userPoolClientId: '41aonsge1fgmet7s2v92u1aea1',
  },
};

// Development configuration
const developmentConfig: Partial<Config> = {
  environment: 'development',
  api: {
    baseUrl: Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3000',
    timeout: 10000,
    retries: 3,
  },
};

// Production configuration
const productionConfig: Partial<Config> = {
  environment: 'production',
  api: {
    baseUrl: Constants.expoConfig?.extra?.apiUrl || 'https://api.dubstudio.com',
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