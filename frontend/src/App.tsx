import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './navigation/AppNavigator';
import { AuthProvider } from './contexts/AuthContext';
import { testConfig } from './utils/test-config';
import './config/aws-config';
import { facebookService } from './services/FacebookService';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import { Settings } from 'react-native-fbsdk-next';

export default function App() {
  useEffect(() => {
    const initializeSDKs = async () => {
      try {
        // Initialize Facebook SDK
        facebookService.initialize();
        
        // Request tracking permission and initialize settings
        const { status } = await requestTrackingPermissionsAsync();
        console.log('Tracking permission status:', status);
        
        Settings.initializeSDK();
        
        if (status === 'granted') {
          await Settings.setAdvertiserTrackingEnabled(true);
          console.log('Advertiser tracking enabled');
        }
      } catch (error) {
        console.error('Failed to initialize SDKs:', error);
      }
    };

    initializeSDKs();
    testConfig();
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
} 