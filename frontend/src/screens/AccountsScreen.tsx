import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ListItem } from '../components/ListItem';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';

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

export function AccountsScreen() {
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);

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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Your Accounts</Text>
          <Button
            title="Add Account"
            size="small"
            onPress={() => {}}
            leftIcon="plus-circle"
          />
        </View>

        <View style={styles.accountsContainer}>
          {mockAccounts.map((account) => (
            <View key={account.id} style={styles.accountCard}>
              <ListItem
                accountName={account.accountName}
                subtitle={`${account.region} • ${account.language}`}
                status="connected"
                language={account.language}
                onPress={() => handleAccountPress(account)}
              />
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal
        visible={showDashboard}
        onClose={() => {
          console.warn('Modal closing');
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
  accountHeader: {
    borderBottomWidth: 0,
  },
  accountDetails: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  analyticsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  analyticsItem: {
    alignItems: 'center',
    flex: 1,
  },
  analyticsValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 4,
  },
  analyticsLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
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
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
  },
}); 