import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Settings, LoginManager, AccessToken } from 'react-native-fbsdk-next';
import { facebookService } from '../services/FacebookService';

export function FacebookTest() {
  const [sdkInitialized, setSdkInitialized] = useState(false);
  const [loginStatus, setLoginStatus] = useState<string>('Not logged in');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if SDK is initialized
    const isInitialized = facebookService.isInitialized();
    setSdkInitialized(isInitialized);
    console.log('Facebook SDK initialized:', isInitialized);
  }, []);

  const handleLogin = async () => {
    try {
      setError(null);
      console.log('Starting Facebook login...');
      
      const result = await facebookService.login();
      console.log('Login result:', result);
      
      if (result.accessToken) {
        setLoginStatus('Logged in');
        setPermissions(result.permissions || []);
        
        // Test getting user profile
        const profile = await facebookService.getUserProfile();
        console.log('User profile:', profile);
        
        // Test getting pages
        const pages = await facebookService.getPages();
        console.log('User pages:', pages);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setLoginStatus('Login failed');
    }
  };

  const handleLogout = async () => {
    try {
      await facebookService.logout();
      setLoginStatus('Logged out');
      setPermissions([]);
      setError(null);
    } catch (err) {
      console.error('Logout error:', err);
      setError(err instanceof Error ? err.message : 'Logout failed');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Facebook SDK Test</Text>
      
      <View style={styles.statusContainer}>
        <Text>SDK Initialized: {sdkInitialized ? '✅' : '❌'}</Text>
        <Text>Login Status: {loginStatus}</Text>
      </View>

      {permissions.length > 0 && (
        <View style={styles.permissionsContainer}>
          <Text style={styles.subtitle}>Granted Permissions:</Text>
          {permissions.map((permission, index) => (
            <Text key={index}>• {permission}</Text>
          ))}
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.loginButton]}
          onPress={handleLogin}
        >
          <Text style={styles.buttonText}>Test Facebook Login</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.logoutButton]}
          onPress={handleLogout}
        >
          <Text style={styles.buttonText}>Test Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    margin: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  statusContainer: {
    marginBottom: 20,
  },
  permissionsContainer: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
  },
  errorText: {
    color: '#c62828',
  },
  buttonContainer: {
    gap: 10,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  loginButton: {
    backgroundColor: '#4267B2',
  },
  logoutButton: {
    backgroundColor: '#898F9C',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
}); 