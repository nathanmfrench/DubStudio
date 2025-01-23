import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './navigation/AppNavigator';
import { AuthProvider } from './contexts/AuthContext';
import { testConfig } from './utils/test-config';
import './config/aws-config';
import { facebookService } from './services/FacebookService';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import { Settings } from 'react-native-fbsdk-next';
import { loadFonts } from './utils/loadFonts';
import { View, ActivityIndicator } from 'react-native';

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeSDKs = async () => {
      try {
        console.log('Starting SDK initialization...');
        
        // Initialize Facebook SDK first
        Settings.initializeSDK();
        console.log('Facebook SDK initialized');
        
        // Initialize our Facebook service
        facebookService.initialize();
        console.log('Facebook service initialized');
        
        // Request tracking permission
        const { status } = await requestTrackingPermissionsAsync();
        console.log('Tracking permission status:', status);
        
        if (status === 'granted') {
          await Settings.setAdvertiserTrackingEnabled(true);
          console.log('Advertiser tracking enabled');
        }
        
        // Load fonts last since they're not critical for Facebook
        await loadFonts();
        console.log('Fonts loaded');
        
        // Run any test configurations
        await testConfig();
        
        setIsInitialized(true);
        console.log('All initialization complete');
      } catch (error) {
        console.error('Failed to initialize:', error);
        // Still set initialized to true to not block the app
        setIsInitialized(true);
      }
    };

    initializeSDKs();
  }, []);

  if (!isInitialized) {
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