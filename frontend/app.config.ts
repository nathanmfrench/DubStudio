import { ExpoConfig, ConfigContext } from 'expo/config';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables based on EXPO_PUBLIC_ENVIRONMENT
const env = process.env.EXPO_PUBLIC_ENVIRONMENT || 'development';
const envPath = path.resolve(__dirname, '..', `.env.${env}`);
console.log('Loading environment from:', envPath);
dotenv.config({ path: envPath });

export default ({ config }: ConfigContext): ExpoConfig => {
  // Log loaded environment variables
  console.log('Loaded environment variables:', {
    env: process.env.EXPO_PUBLIC_ENVIRONMENT,
    api: process.env.EXPO_PUBLIC_API_URL,
    region: process.env.EXPO_PUBLIC_AWS_REGION,
    poolId: process.env.EXPO_PUBLIC_AWS_USER_POOL_ID,
  });

  return {
    ...config,
    name: 'DubStudio',
    slug: 'dubstudio',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff'
    },
    assetBundlePatterns: [
      '**/*'
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.dubstudio.app'
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff'
      },
      package: 'com.dubstudio.app',
      permissions: ['CAMERA', 'READ_EXTERNAL_STORAGE', 'WRITE_EXTERNAL_STORAGE']
    },
    plugins: [
      [
        'expo-image-picker',
        {
          photosPermission: 'Allow DubStudio to access your photos for video uploads.',
          cameraPermission: 'Allow DubStudio to access your camera for video recording.'
        }
      ]
    ],
    extra: {
      EXPO_PUBLIC_ENVIRONMENT: process.env.EXPO_PUBLIC_ENVIRONMENT,
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
      EXPO_PUBLIC_API_TIMEOUT: process.env.EXPO_PUBLIC_API_TIMEOUT,
      EXPO_PUBLIC_API_RETRIES: process.env.EXPO_PUBLIC_API_RETRIES,
      EXPO_PUBLIC_AWS_REGION: process.env.EXPO_PUBLIC_AWS_REGION,
      EXPO_PUBLIC_AWS_USER_POOL_ID: process.env.EXPO_PUBLIC_AWS_USER_POOL_ID,
      EXPO_PUBLIC_AWS_USER_POOL_CLIENT_ID: process.env.EXPO_PUBLIC_AWS_USER_POOL_CLIENT_ID,
    },
  };
}; 