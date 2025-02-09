import { Amplify } from 'aws-amplify';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values';

const expoConfig = Constants.expoConfig?.extra;

if (!expoConfig) {
  throw new Error('Missing Expo configuration');
}

export const configureAmplify = () => {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: expoConfig.EXPO_PUBLIC_AWS_USER_POOL_ID,
        userPoolClientId: expoConfig.EXPO_PUBLIC_AWS_USER_POOL_CLIENT_ID,
        loginWith: {
          email: true,
          phone: false,
          username: false,
          oauth: {
            domain: expoConfig.EXPO_PUBLIC_AUTH_DOMAIN,
            scopes: [
              'phone',
              'email',
              'profile',
              'openid',
              'aws.cognito.signin.user.admin'
            ],
            redirectSignIn: [expoConfig.EXPO_PUBLIC_OAUTH_REDIRECT_SIGNIN],
            redirectSignOut: [expoConfig.EXPO_PUBLIC_OAUTH_REDIRECT_SIGNOUT],
            responseType: 'code'
          }
        }
      }
    },
    API: {
      REST: {
        dubstudio: {
          endpoint: expoConfig.EXPO_PUBLIC_API_URL,
          region: expoConfig.EXPO_PUBLIC_AWS_REGION || 'us-east-1'
        }
      }
    }
  });
}; 