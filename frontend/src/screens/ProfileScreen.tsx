import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { FacebookTest } from '../components/FacebookTest';

const { width } = Dimensions.get('window');

interface AnalyticsSummary {
  totalAccounts: number;
  totalFollowers: number;
  totalViews: number;
  totalPosts: number;
}

// Mock data - replace with real API data later
const analyticsSummary: AnalyticsSummary = {
  totalAccounts: 2,
  totalFollowers: 23600,
  totalViews: 70000,
  totalPosts: 8,
};

export function ProfileScreen() {
  const { signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } catch (error: any) {
      console.error('Error signing out:', error);
      Alert.alert(
        'Sign Out Failed',
        error.message || 'Failed to sign out. Please try again.'
      );
    } finally {
      setIsSigningOut(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const renderSettingsItem = (
    icon: keyof typeof MaterialCommunityIcons.glyphMap,
    title: string,
    subtitle: string,
    onPress?: () => void
  ) => (
    <TouchableOpacity
      style={styles.settingsItem}
      onPress={onPress}
      disabled={title === 'Sign Out' && isSigningOut}
    >
      <View style={styles.settingsItemLeft}>
        <MaterialCommunityIcons name={icon} size={24} color="#6B7280" />
        <View style={styles.settingsItemText}>
          <Text style={styles.settingsItemTitle}>{title}</Text>
          <Text style={styles.settingsItemSubtitle}>{subtitle}</Text>
        </View>
      </View>
      {title === 'Sign Out' && isSigningOut ? (
        <ActivityIndicator color="#6B7280" />
      ) : (
        <MaterialCommunityIcons name="chevron-right" size={24} color="#6B7280" />
      )}
    </TouchableOpacity>
  );

  const renderWaveBackground = () => (
    <View style={styles.waveContainer}>
      <Svg
        height="200"
        width={width}
        viewBox={`0 0 ${width} 200`}
        style={styles.waveSvg}
      >
        <Path
          d={`M0 0 
             C ${width * 0.3} 50, ${width * 0.7} 20, ${width} 50 
             L${width} 0 Z`}
          fill="rgba(33, 113, 193, 0.1)"
        />
        <Path
          d={`M0 0 
             C ${width * 0.4} 30, ${width * 0.6} 40, ${width} 20 
             L${width} 0 Z`}
          fill="rgba(33, 113, 193, 0.15)"
        />
      </Svg>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[
          'rgba(33, 113, 193, 0.9)',
          'rgba(33, 113, 193, 0.4)',
          'rgba(33, 113, 193, 0.3)',
          'transparent'
        ]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <ScrollView style={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* Analytics Summary */}
        <View style={[styles.analyticsContainer, styles.elevatedCard]}>
          <View style={styles.analyticsRow}>
            <View style={styles.analyticsItem}>
              <View style={styles.analyticsIconContainer}>
                <MaterialCommunityIcons name="account-group" size={20} color="#2171C1" />
              </View>
              <Text style={styles.analyticsValue}>{analyticsSummary.totalAccounts}</Text>
              <Text style={styles.analyticsLabel}>Accounts</Text>
            </View>
            <View style={styles.analyticsDivider} />
            <View style={styles.analyticsItem}>
              <View style={styles.analyticsIconContainer}>
                <MaterialCommunityIcons name="account-multiple" size={20} color="#2171C1" />
              </View>
              <Text style={styles.analyticsValue}>{formatNumber(analyticsSummary.totalFollowers)}</Text>
              <Text style={styles.analyticsLabel}>Total Followers</Text>
            </View>
          </View>
          <View style={styles.analyticsRow}>
            <View style={styles.analyticsItem}>
              <View style={styles.analyticsIconContainer}>
                <MaterialCommunityIcons name="eye" size={20} color="#2171C1" />
              </View>
              <Text style={styles.analyticsValue}>{formatNumber(analyticsSummary.totalViews)}</Text>
              <Text style={styles.analyticsLabel}>Total Views</Text>
            </View>
            <View style={styles.analyticsDivider} />
            <View style={styles.analyticsItem}>
              <View style={styles.analyticsIconContainer}>
                <MaterialCommunityIcons name="video" size={20} color="#2171C1" />
              </View>
              <Text style={styles.analyticsValue}>{analyticsSummary.totalPosts}</Text>
              <Text style={styles.analyticsLabel}>Total Posts</Text>
            </View>
          </View>
        </View>

        {/* Settings */}
        <View style={[styles.settingsContainer, styles.elevatedCard]}>
          <Text style={styles.sectionTitle}>Settings</Text>
          {renderSettingsItem('account-cog', 'Account Settings', 'Privacy, security, and more')}
          {renderSettingsItem('bell-outline', 'Notifications', 'Manage your notifications')}
          {renderSettingsItem('help-circle-outline', 'Help & Support', 'Get help with DubStudio')}
          {renderSettingsItem('information-outline', 'About', 'App version and information')}
          {renderSettingsItem('logout', 'Sign Out', 'Sign out of your account', handleSignOut)}
        </View>

        <FacebookTest />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2171C1',
  },
  analyticsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    margin: 16,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  analyticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  analyticsItem: {
    flex: 1,
    alignItems: 'center',
  },
  analyticsValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  analyticsLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  analyticsDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 20,
  },
  settingsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    margin: 16,
    marginTop: 0,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingsItemText: {
    marginLeft: 12,
    flex: 1,
  },
  settingsItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  settingsItemSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  signOutContainer: {
    padding: 16,
    paddingTop: 0,
  },
  signOutButton: {
    marginTop: 8,
  },
  waveContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 0,
  },
  waveSvg: {
    position: 'absolute',
    top: 0,
  },
  elevatedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  analyticsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
}); 