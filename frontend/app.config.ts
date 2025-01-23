import { ExpoConfig, ConfigContext } from 'expo/config';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables based on EXPO_PUBLIC_ENVIRONMENT
const env = process.env.EXPO_PUBLIC_ENVIRONMENT || 'development';
const envPath = path.resolve(__dirname, '..', `.env.${env}`);
console.log('Loading environment from:', envPath);
dotenv.config({ path: envPath });

const BUNDLE_IDENTIFIER = 'tech.voxium.dubstudio';

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
    owner: 'nfrench17',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    scheme: 'voxium',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff'
    },
    assetBundlePatterns: [
      '**/*',
      'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/*'
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: BUNDLE_IDENTIFIER,
      config: {
        usesNonExemptEncryption: false
      },
      infoPlist: {
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: [
              'fb1125481698703055',
              'voxium'
            ]
          }
        ],
        FacebookAppID: '1125481698703055',
        FacebookClientToken: '950bf5366410fca4ce7afec23c16b6df',
        FacebookDisplayName: 'DubStudio',
        FacebookAutoLogAppEventsEnabled: true,
        FacebookAdvertiserIDCollectionEnabled: true,
        NSUserTrackingUsageDescription: "This identifier will be used to deliver personalized ads to you.",
        LSApplicationQueriesSchemes: [
          'fbapi',
          'fb-messenger-api',
          'fbauth2',
          'fbshareextension'
        ]
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff'
      },
      package: BUNDLE_IDENTIFIER,
      versionCode: 1,
      permissions: [
        'CAMERA',
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
        'INTERNET'
      ]
    },
    plugins: [
      [
        'expo-image-picker',
        {
          photosPermission: 'Allow DubStudio to access your photos for video uploads.',
          cameraPermission: 'Allow DubStudio to access your camera for video recording.'
        }
      ],
      [
        'react-native-fbsdk-next',
        {
          appID: "1125481698703055",
          clientToken: "950bf5366410fca4ce7afec23c16b6df",
          displayName: "DubStudio",
          scheme: "fb1125481698703055",
          advertiserIDCollectionEnabled: false,
          autoLogAppEventsEnabled: false,
          isAutoInitEnabled: true,
          iosUserTrackingPermission: "This identifier will be used to deliver personalized ads to you."
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
      eas: {
        projectId: 'a3a24494-5f90-4ec5-8609-cd7eecfe29b3'
      },
      hostUri: "192.168.1.30:19000", // Add this line
    }
  };
}; 