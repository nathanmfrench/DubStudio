import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Image,
  Dimensions,
  Animated,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ListItem } from '../components/ListItem';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { LinearGradient } from 'expo-linear-gradient';
import { facebookService } from '../services/FacebookService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AccountAnalytics {
  followers: number;
  followersGrowth: number;
  engagement: number;
  impressions: number;
  reachRate: number;
  topPostLikes: number;
  postsThisWeek: number;
  views: number;
}

interface Account {
  id: string;
  accountName: string;
  region: string;
  language: string;
  analytics: AccountAnalytics;
}

interface ConnectedAccount {
  platform: 'instagram';
  username: string;
  isConnected: boolean;
  accessToken?: string;
  userId?: string;
  pageId?: string;
  pageName?: string;
}

// Mock data - replace with real API data later
const mockAccounts: Account[] = [
  {
    id: '1',
    accountName: 'nathanfrench.espanol',
    region: 'Spain',
    language: 'Spanish',
    analytics: {
      followers: 15400,
      followersGrowth: 324,
      engagement: 8.5,
      impressions: 45200,
      reachRate: 28.5,
      topPostLikes: 1250,
      postsThisWeek: 5,
      views: 45000,
    },
  },
  {
    id: '2',
    accountName: 'nathanfrench.francais',
    region: 'France',
    language: 'French',
    analytics: {
      followers: 8200,
      followersGrowth: 156,
      engagement: 6.2,
      impressions: 25000,
      reachRate: 22.4,
      topPostLikes: 850,
      postsThisWeek: 3,
      views: 25000,
    },
  },
];

const GRID_SIZE = 60;
const SHAPE_SIZE = 20;

function BackgroundPattern() {
  const translateX = new Animated.Value(0);
  const translateY = new Animated.Value(0);

  useEffect(() => {
    const xAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: GRID_SIZE,
          duration: 20000,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: 0,
          duration: 20000,
          useNativeDriver: true,
        }),
      ])
    );

    const yAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: GRID_SIZE,
          duration: 25000,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 25000,
          useNativeDriver: true,
        }),
      ])
    );

    xAnimation.start();
    yAnimation.start();
    return () => {
      xAnimation.stop();
      yAnimation.stop();
    };
  }, []);

  const renderShape = (x: number, y: number, index: number) => {
    const isAlternate = (x + y) % 2 === 0;
    const opacity = 0.03 + (Math.sin(x + y) * 0.02);
    
    return (
      <View
        key={`${x}-${y}`}
        style={[
          styles.shape,
          {
            left: x * GRID_SIZE,
            top: y * GRID_SIZE,
            opacity,
            transform: [
              { rotate: isAlternate ? '45deg' : '0deg' },
              { scale: isAlternate ? 0.7 : 1 }
            ]
          }
        ]}
      />
    );
  };

  const renderGrid = () => {
    const shapes = [];
    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;
    const cols = Math.ceil(screenWidth / GRID_SIZE) + 1;
    const rows = Math.ceil(screenHeight / GRID_SIZE) + 1;

    for (let y = -1; y < rows; y++) {
      for (let x = -1; x < cols; x++) {
        shapes.push(renderShape(x, y, y * cols + x));
      }
    }

    return shapes;
  };

  return (
    <View style={styles.backgroundPattern}>
      <Animated.View
        style={[
          styles.gridContainer,
          {
            transform: [
              { translateX },
              { translateY }
            ]
          }
        ]}
      >
        {renderGrid()}
      </Animated.View>
    </View>
  );
}

export function AccountsScreen() {
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const handleAccountPress = (account: Account) => {
    console.warn('Account pressed:', account.accountName);
    setSelectedAccount(account);
    console.warn('Selected account set');
    setShowDashboard(true);
    console.warn('Show dashboard set to true');
  };

  const handleConnectFacebook = async () => {
    setIsLoading(true);
    try {
      // Facebook connection flow (moved from UploadScreen)
      if (!facebookService.isInitialized()) {
        facebookService.initialize();
      }

      const loginResult = await facebookService.login();
      const pages = await facebookService.getPages();

      if (!pages || pages.length === 0) {
        Alert.alert(
          'No Facebook Pages Found',
          'You need to have a Facebook Page to connect Instagram business accounts. Would you like to create one?',
          [
            {
              text: 'Create Page',
              onPress: () => Linking.openURL('https://www.facebook.com/pages/create'),
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        return;
      }

      const instagramAccounts = await Promise.all(
        pages.map(async (page) => {
          try {
            const instagramAccount = await facebookService.getInstagramBusinessAccount(page.id);
            return { pageId: page.id, pageName: page.name, instagramAccount };
          } catch (error) {
            console.error(`Error fetching Instagram account for page ${page.name}:`, error);
            return { pageId: page.id, pageName: page.name, instagramAccount: null };
          }
        })
      );

      const connectedAccounts = instagramAccounts.filter(acc => acc.instagramAccount);

      if (connectedAccounts.length === 0) {
        Alert.alert(
          'No Instagram Business Accounts',
          'Would you like to connect an Instagram account to one of your Facebook pages?',
          [
            {
              text: 'Connect Instagram',
              onPress: () => Linking.openURL('https://business.facebook.com/settings/instagram'),
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        return;
      }

      const updatedAccounts = connectedAccounts.map(acc => ({
        platform: 'instagram' as const,
        username: acc.instagramAccount?.username || '',
        isConnected: true,
        accessToken: loginResult.accessToken,
        userId: acc.instagramAccount?.id || '',
        pageId: acc.pageId,
        pageName: acc.pageName,
      }));

      setConnectedAccounts(updatedAccounts);
      
      // Store accounts in AsyncStorage for persistence
      await AsyncStorage.setItem('connectedAccounts', JSON.stringify(updatedAccounts));

      Alert.alert(
        'Success',
        `Connected ${updatedAccounts.length} Instagram business account${updatedAccounts.length > 1 ? 's' : ''}.`
      );

    } catch (error) {
      console.error('Connection error:', error);
      Alert.alert('Error', 'Failed to connect accounts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Load saved accounts on mount
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const saved = await AsyncStorage.getItem('connectedAccounts');
        if (saved) {
          setConnectedAccounts(JSON.parse(saved));
        }
      } catch (error) {
        console.error('Error loading accounts:', error);
      }
    };
    loadAccounts();
  }, []);

  const renderMetricItem = (label: string, value: string | number, icon: keyof typeof MaterialCommunityIcons.glyphMap) => (
    <View style={[styles.metricItem, styles.metricCard]}>
      <View style={styles.metricIconContainer}>
        <MaterialCommunityIcons name={icon} size={20} color="#2171C1" />
      </View>
      <View style={styles.metricContent}>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
    </View>
  );

  const renderDashboard = () => {
    if (!selectedAccount) return null;

    return (
      <ScrollView style={styles.dashboardContent}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.profileInfo}>
            <Text style={styles.accountTitle}>@{selectedAccount.accountName}</Text>
            <Text style={styles.accountSubtitle}>{selectedAccount.region} • {selectedAccount.language}</Text>
          </View>
        </View>

        {/* Key Metrics */}
        <View style={styles.metricsOverview}>
          <View style={styles.overviewMetric}>
            <Text style={styles.overviewValue}>{formatNumber(selectedAccount.analytics.followers)}</Text>
            <Text style={styles.overviewLabel}>Followers</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.overviewMetric}>
            <Text style={styles.overviewValue}>+{formatNumber(selectedAccount.analytics.followersGrowth)}</Text>
            <Text style={styles.overviewLabel}>Growth</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.overviewMetric}>
            <Text style={styles.overviewValue}>{selectedAccount.analytics.engagement}%</Text>
            <Text style={styles.overviewLabel}>Engagement</Text>
          </View>
        </View>

        {/* Performance Metrics */}
        <View style={styles.metricSection}>
          <Text style={styles.sectionTitle}>Performance Metrics</Text>
          <View style={styles.metricsGrid}>
            {renderMetricItem('Impressions', formatNumber(selectedAccount.analytics.impressions), 'eye-outline')}
            {renderMetricItem('Reach Rate', `${selectedAccount.analytics.reachRate}%`, 'chart-line')}
            {renderMetricItem('Top Post Likes', formatNumber(selectedAccount.analytics.topPostLikes), 'thumb-up-outline')}
            {renderMetricItem('Posts This Week', selectedAccount.analytics.postsThisWeek, 'image-multiple')}
          </View>
        </View>
      </ScrollView>
    );
  };

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
      <View style={styles.contentContainer}>
        <ScrollView style={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Accounts</Text>
          </View>

          <View style={styles.accountsContainer}>
            {connectedAccounts.length > 0 ? (
              connectedAccounts.map((account, index) => (
                <View key={account.userId || index} style={styles.accountCard}>
                  <ListItem
                    accountName={account.username}
                    subtitle={`Connected via ${account.pageName}`}
                    status="connected"
                  />
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="account-plus" size={48} color="#9CA3AF" />
                <Text style={styles.emptyStateText}>No connected accounts</Text>
                <Text style={styles.emptyStateSubtext}>
                  Connect your Facebook page with Instagram business accounts to get started
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
        
        <View style={styles.bottomContainer}>
          <Button
            title="Connect Facebook"
            leftIcon="facebook"
            onPress={handleConnectFacebook}
            loading={isLoading}
          />
        </View>
      </View>

      <Modal
        visible={showDashboard}
        onClose={() => {
          setShowDashboard(false);
          setSelectedAccount(null);
        }}
        size="full"
      >
        {renderDashboard()}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  gridContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  shape: {
    position: 'absolute',
    width: SHAPE_SIZE,
    height: SHAPE_SIZE,
    backgroundColor: '#2171C1',
    borderRadius: 4,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2171C1',
  },
  accountsContainer: {
    gap: 16,
  },
  accountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
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
  dashboardContent: {
    padding: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2171C1',
    margin: -20,
    marginBottom: 20,
    padding: 20,
    paddingBottom: 24,
  },
  profileInfo: {
    alignItems: 'center',
  },
  accountTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  accountSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
    textAlign: 'center',
  },
  metricsOverview: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  overviewMetric: {
    flex: 1,
    alignItems: 'center',
  },
  overviewValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  overviewLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  metricDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
    alignSelf: 'stretch',
  },
  metricSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metricCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: '47%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  metricItem: {
    gap: 12,
  },
  metricIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricContent: {
    flex: 1,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  metricLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 24,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  contentContainer: {
    flex: 1,
  },
  bottomContainer: {
    padding: 16,
    backgroundColor: 'transparent',
  },
}); 