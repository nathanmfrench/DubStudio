import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Amplify } from 'aws-amplify';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import { Settings } from 'react-native-fbsdk-next';

// Contexts and Services
import { AuthProvider } from '../src/contexts/AuthContext';
import { facebookService } from '../src/services/FacebookService';

// Utilities and Config
import { loadFonts } from '../src/utils/loadFonts';
import * as awsconfig from '../src/config/aws-config';
import { testConfig } from '../src/utils/test-config';

// Navigation
import { AppNavigator } from '../src/navigation/AppNavigator';

// Initialize Amplify
Amplify.configure(awsconfig as any);

export default function App() {
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('Starting app initialization...');

        // 1. Initialize Facebook SDK
        Settings.initializeSDK();
        facebookService.initialize();
        console.log('Facebook services initialized');

        // 2. Request tracking permissions
        const { status } = await requestTrackingPermissionsAsync();
        if (status === 'granted') {
          await Settings.setAdvertiserTrackingEnabled(true);
        }
        console.log('Tracking status:', status);

        // 3. Load fonts and test config
        await Promise.all([loadFonts(), testConfig()]);
        console.log('Fonts and config loaded');

      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        setAppReady(true);
      }
    };

    initializeApp();
  }, []);

  if (!appReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

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