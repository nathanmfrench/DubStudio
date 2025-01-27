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
import { facebookService } from '../services/FacebookService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TierBadge } from '../components/TierBadge';
import { useTier } from '../contexts/TierContext';

interface ConnectedAccount {
  platform: 'instagram';
  username: string;
  isConnected: boolean;
  accessToken?: string;
  userId?: string;
  pageId?: string;
  pageName?: string;
}

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
  const { currentTier } = useTier();
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleConnectFacebook = async () => {
    setIsLoading(true);
    try {
      if (!facebookService.isInitialized()) {
        facebookService.initialize();
      }

      const loginResult = await facebookService.login();
      
      // Handle user cancellation
      if (!loginResult || !loginResult.accessToken) {
        setIsLoading(false);
        return; // Silently return without showing an error
      }

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
      // Only show alert for non-cancellation errors
      if (error instanceof Error && !error.message.includes('cancelled')) {
        Alert.alert('Error', 'Failed to connect accounts. Please try again.');
      }
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Accounts</Text>
          </View>
          <View style={styles.headerRight}>
            <TierBadge tier={currentTier} />
          </View>
        </View>
        <ScrollView style={styles.scrollContent}>
          <View style={styles.accountsContainer}>
            {connectedAccounts.length === 0 ? (
              <View style={styles.noAccountsContainer}>
                <Text style={styles.noAccountsText}>No connected accounts</Text>
                <TouchableOpacity
                  style={styles.connectButton}
                  onPress={handleConnectFacebook}
                >
                  <MaterialCommunityIcons
                    name="facebook"
                    size={24}
                    color="#FFFFFF"
                  />
                  <Text style={styles.connectButtonText}>Connect Facebook</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {connectedAccounts.map((account, index) => (
                  <View key={account.userId || index} style={styles.accountCard}>
                    <ListItem
                      accountName={account.username}
                      subtitle={`Connected via ${account.pageName}`}
                      status="connected"
                    />
                  </View>
                ))}
                <TouchableOpacity
                  style={styles.addAccountButton}
                  onPress={handleConnectFacebook}
                >
                  <MaterialCommunityIcons
                    name="account-plus"
                    size={24}
                    color="#FFFFFF"
                  />
                  <Text style={styles.addAccountButtonText}>Add Account</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingTop: 16,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  noAccountsContainer: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 24,
  },
  noAccountsText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginTop: 12,
  },
  connectButton: {
    backgroundColor: '#2171C1',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  connectButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  addAccountButton: {
    backgroundColor: '#2171C1',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addAccountButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
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
}); 