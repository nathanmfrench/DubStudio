import React, { useCallback, useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Amplify } from 'aws-amplify';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import { Settings } from 'react-native-fbsdk-next';
import { amplifyConfig, checkAuthState } from './config/aws-config';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider } from './contexts/ThemeContext';

// Contexts and Services
import { AuthProvider } from '../src/contexts/AuthContext';
import { facebookService } from '../src/services/FacebookService';
import { TierProvider } from './contexts/TierContext';

// Utilities and Config
import { loadFonts } from '../src/utils/loadFonts';
import { testConfig } from '../src/utils/test-config';

// Navigation
import { AppNavigator } from '../src/navigation/AppNavigator';

// Initialize Amplify with the configuration
Amplify.configure(amplifyConfig);

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('Starting app initialization...');
        
        // Check auth state after Amplify is configured
        await checkAuthState();

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
        setAppIsReady(true);
      }
    };

    initializeApp();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();
      setTimeout(() => setShowSplash(false), 500);
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <TierProvider>
          <ThemeProvider>
            <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
              <NavigationContainer>
                <AppNavigator />
              </NavigationContainer>
            </View>
          </ThemeProvider>
        </TierProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}