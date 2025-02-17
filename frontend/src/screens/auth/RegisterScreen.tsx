import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';

export function RegisterScreen({ navigation }: { navigation: any }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  const validateForm = () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return false;
    }
    return true;
  };

  const handleSignUp = async () => {
    console.log('Sign up button pressed');
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      console.log('Attempting sign up with email:', email);
      const signUpResult = await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
          }
        }
      });
      console.log('Sign up result:', signUpResult);
      
      // If successful, navigate to confirmation screen
      navigation.navigate('ConfirmSignUp', { email });
    } catch (error: any) {
      console.error('Sign up error:', error);
      Alert.alert(
        'Sign Up Failed',
        error.message || 'An error occurred during sign up. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#2E3192', '#1BFFFF']}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Create Account</Text>
          <Text style={styles.subText}>Sign up to get started</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor="rgba(255, 255, 255, 0.6)"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="rgba(255, 255, 255, 0.6)"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="rgba(255, 255, 255, 0.6)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor="rgba(255, 255, 255, 0.6)"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.signUpButton}
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#2E3192" />
            ) : (
              <Text style={styles.signUpButtonText}>Sign Up</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLink}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 8,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    paddingHorizontal: 16,
  },
  input: {
    height: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  signUpButton: {
    height: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  signUpButtonText: {
    color: '#2E3192',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.8)',
    marginRight: 8,
  },
  loginLink: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
}); 