import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './navigation/AppNavigator';
import { AuthProvider } from './contexts/AuthContext';
import { testConfig } from './utils/test-config';
import './config/aws-config';
import { facebookService } from './services/FacebookService';

export default function App() {
  useEffect(() => {
    // Initialize Facebook SDK
    try {
      facebookService.initialize();
    } catch (error) {
      console.error('Failed to initialize Facebook SDK:', error);
    }

    // Run test config
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