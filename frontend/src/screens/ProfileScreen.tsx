import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform, Dimensions, Alert, ActivityIndicator, Modal, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { TierBadge } from '../components/TierBadge';
import { useTier } from '../contexts/TierContext';
import { useTheme } from '../contexts/ThemeContext';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');

interface PricingTier {
  name: string;
  monthlyPrice: number;
  features: string[];
  goal: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}

const pricingTiers: PricingTier[] = [
  {
    name: 'Basic',
    monthlyPrice: 9.99,
    features: [
      '15 videos per month',
      'Advanced dubbing, unlimited captions',
      'Views analytics',
    ],
    goal: 'Entry point for individual creators and small businesses',
    icon: 'rocket-launch-outline',
  },
  {
    name: 'Premium',
    monthlyPrice: 39,
    features: [
      '100 videos per month',
      'Full scheduling capabilities',
      'Views & Comments Analytics',
    ],
    goal: 'Active content creators or small businesses',
    icon: 'star-outline',
  },
  {
    name: 'Professional',
    monthlyPrice: 99,
    features: [
      '300 videos/month',
      'Advanced scheduling & crossposting',
      'Growth recommendations',
      'Account manager',
    ],
    goal: 'Serious content creators',
    icon: 'diamond-stone',
  },
  {
    name: 'Enterprise',
    monthlyPrice: 199,
    features: [
      'Unlimited videos',
      'Custom API integration',
      'White-label solution',
      'Premium support',
    ],
    goal: 'Large organizations needing custom solutions',
    icon: 'crown',
  },
];

export function ProfileScreen() {
  const { signOut } = useAuth();
  const { currentTier, tiers, setCurrentTier } = useTier();
  const { isDarkMode, toggleTheme, colors } = useTheme();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isAnnual, setIsAnnual] = useState(false);
  const textOpacity = useState(new Animated.Value(1))[0];

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

  const calculatePrice = (monthlyPrice: number) => {
    if (isAnnual) {
      const annualPrice = monthlyPrice * 12 * 0.80; // 15% discount
      return (annualPrice / 12).toFixed(2);
    }
    return monthlyPrice.toFixed(2);
  };

  const handleUpgrade = (tier: keyof typeof tiers) => {
    console.log(`Upgraded to: ${tier}!`);
    setCurrentTier(tier);
    // In a real app, you would make an API call here to upgrade the subscription
  };

  const toggleBilling = () => {
    Animated.sequence([
      Animated.timing(textOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    
    setIsAnnual(!isAnnual);
  };

  const renderSettingsItem = (
    icon: keyof typeof MaterialCommunityIcons.glyphMap,
    title: string,
    subtitle: string,
    onPress?: () => void
  ) => (
    <TouchableOpacity
      style={[styles.settingsItem, { borderBottomColor: colors.border }]}
      onPress={onPress}
      disabled={title === 'Sign Out' && isSigningOut}
    >
      <View style={styles.settingsItemLeft}>
        <MaterialCommunityIcons name={icon} size={24} color={colors.textSecondary} />
        <View style={styles.settingsItemText}>
          <Text style={[styles.settingsItemTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.settingsItemSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        </View>
      </View>
      {title === 'Sign Out' && isSigningOut ? (
        <ActivityIndicator color={colors.textSecondary} />
      ) : (
        <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondary} />
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
          fill={isDarkMode ? 'rgba(96, 165, 250, 0.1)' : 'rgba(33, 113, 193, 0.1)'}
        />
        <Path
          d={`M0 0 
             C ${width * 0.4} 30, ${width * 0.6} 40, ${width} 20 
             L${width} 0 Z`}
          fill={isDarkMode ? 'rgba(96, 165, 250, 0.15)' : 'rgba(33, 113, 193, 0.15)'}
        />
      </Svg>
    </View>
  );

  const renderPricingTier = (tierKey: keyof typeof tiers) => {
    const tier = tiers[tierKey];
    return (
      <TouchableOpacity 
        style={[styles.pricingTier, {
          backgroundColor: colors.cardBackground,
          borderColor: colors.cardBorder
        }]}
        onPress={() => handleUpgrade(tierKey)}
        activeOpacity={0.7}
      >
        <View style={styles.tierHeader}>
          <MaterialCommunityIcons name={tier.icon as any} size={24} color={colors.primary} />
          <Text style={[styles.tierName, { color: colors.text }]}>{tier.name}</Text>
        </View>
        <View style={styles.priceContainer}>
          <Text style={[styles.price, { color: colors.primary }]}>${calculatePrice(tier.monthlyPrice)}</Text>
          <Text style={[styles.pricePeriod, { color: colors.textSecondary }]}>/month</Text>
        </View>
        <View style={styles.featuresContainer}>
          {tier.features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <MaterialCommunityIcons name="check" size={16} color={colors.primary} />
              <Text style={[styles.featureText, { color: colors.text }]}>{feature}</Text>
            </View>
          ))}
        </View>
        <Text style={[styles.goalText, { color: colors.textSecondary }]}>{tier.goal}</Text>
      </TouchableOpacity>
    );
  };

  const renderSettingsModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showSettings}
      onRequestClose={() => setShowSettings(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { 
          backgroundColor: colors.background,
          borderTopColor: colors.border 
        }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Settings</Text>
            <TouchableOpacity 
              onPress={() => setShowSettings(false)}
              style={styles.closeButton}
            >
              <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {renderSettingsItem(
            'account-cog',
            'Account Settings',
            'Privacy, security, and more'
          )}
          {renderSettingsItem(
            'help-circle-outline',
            'Help & Support',
            'Get help with DubStudio'
          )}
          {renderSettingsItem(
            'theme-light-dark',
            'Dark Mode',
            'Toggle dark theme',
            toggleTheme
          )}
          {renderSettingsItem(
            'logout',
            'Sign Out',
            'Sign out of your account',
            handleSignOut
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.title, { color: colors.primary }]}>Profile</Text>
          </View>
          <View style={styles.headerRight}>
            <TierBadge tier={currentTier} />
            <TouchableOpacity 
              onPress={toggleTheme}
              style={styles.iconButton}
            >
              <MaterialCommunityIcons 
                name={isDarkMode ? 'weather-night' : 'white-balance-sunny'} 
                size={22} 
                color={colors.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setShowSettings(true)}
              style={styles.iconButton}
            >
              <MaterialCommunityIcons name="cog" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Pricing */}
        <View style={[styles.pricingContainer, styles.elevatedCard, { 
          backgroundColor: colors.surface,
          borderColor: colors.cardBorder
        }]}>
          <View style={styles.pricingHeader}>
            <View style={[styles.savingsBadge, {
              backgroundColor: isDarkMode ? 'rgba(96, 165, 250, 0.1)' : '#EBF5FF'
            }]}>
              <MaterialCommunityIcons name="tag-outline" size={14} color={colors.primary} />
              <Text style={[styles.savingsText, { color: colors.primary }]}>Save 20% with yearly</Text>
            </View>
            <View style={styles.billingToggle}>
              <TouchableOpacity 
                style={[
                  styles.toggleContainer, 
                  { backgroundColor: isDarkMode ? '#374151' : '#E5E7EB' },
                  isAnnual && { backgroundColor: colors.primaryLight }
                ]} 
                onPress={toggleBilling}
                activeOpacity={0.8}
              >
                <View style={[styles.toggleHandle, { backgroundColor: colors.background }]} />
              </TouchableOpacity>
              <Animated.Text style={[styles.billingPeriod, { 
                opacity: textOpacity,
                color: colors.primary 
              }]}>
                {isAnnual ? 'Yearly' : 'Monthly'}
              </Animated.Text>
            </View>
          </View>

          <View style={styles.pricingContent}>
            <View style={styles.pricingGrid}>
              <View style={styles.pricingRow}>
                <View style={[styles.pricingTierWrapper, styles.pricingTierMarginRight]}>
                  {renderPricingTier('Basic')}
                </View>
                <View style={styles.pricingTierWrapper}>
                  {renderPricingTier('Premium')}
                </View>
              </View>
              <View style={styles.pricingRow}>
                <View style={[styles.pricingTierWrapper, styles.pricingTierMarginRight]}>
                  {renderPricingTier('Professional')}
                </View>
                <View style={styles.pricingTierWrapper}>
                  {renderPricingTier('Enterprise')}
                </View>
              </View>
            </View>
          </View>
        </View>

        {renderSettingsModal()}
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
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
  pricingContainer: {
    flex: 1,
    margin: 12,
    marginBottom: 0,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
  pricingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 8,
  },
  pricingContent: {
    flex: 1,
    padding: 12,
    paddingBottom: 4,
    paddingTop: 4,
  },
  pricingGrid: {
    flex: 1,
    gap: 0,
  },
  pricingRow: {
    flex: 1,
    flexDirection: 'row',
    marginBottom: 0,
  },
  pricingTierWrapper: {
    flex: 1,
    aspectRatio: 0.85,
  },
  pricingTierMarginRight: {
    marginRight: 12,
  },
  pricingTier: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tierName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  price: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2171C1',
  },
  pricePeriod: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  featuresContainer: {
    marginBottom: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 1,
  },
  featureText: {
    fontSize: 11,
    color: '#374151',
    marginLeft: 4,
    flex: 1,
    lineHeight: 14,
  },
  goalText: {
    fontSize: 10,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 2,
  },
  settingsButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
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
  savingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF5FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
  },
  savingsText: {
    fontSize: 12,
    color: '#2171C1',
    fontWeight: '500',
  },
  billingToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleContainer: {
    width: 48,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#93C5FD',
  },
  toggleHandle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    transform: [{ translateX: 0 }],
  },
  toggleHandleActive: {
    transform: [{ translateX: 24 }],
  },
  billingPeriod: {
    fontSize: 14,
    color: '#2171C1',
    fontWeight: '500',
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  iconButton: {
    padding: 6,
  },
}); 