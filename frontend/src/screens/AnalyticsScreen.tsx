import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Platform, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TierBadge } from '../components/TierBadge';
import { useTier } from '../contexts/TierContext';

interface OverallMetrics {
  totalFollowers: number;
  totalReach: number;
  totalEngagement: number;
  followerGrowth: number;
}

interface AccountMetrics {
  id: string;
  username: string;
  followers: number;
  engagement: number;
  reachRate: number;
  growth: number;
  posts: number;
}

// Mock data - replace with real API data later
const mockOverallMetrics: OverallMetrics = {
  totalFollowers: 45200,
  totalReach: 128000,
  totalEngagement: 8.5,
  followerGrowth: 12.3,
};

const mockAccounts: AccountMetrics[] = [
  {
    id: '1',
    username: 'dubstudio.espanol',
    followers: 15400,
    engagement: 8.5,
    reachRate: 28.5,
    growth: 324,
    posts: 5,
  },
  {
    id: '2',
    username: 'dubstudio.francais',
    followers: 8200,
    engagement: 6.2,
    reachRate: 22.4,
    growth: 156,
    posts: 3,
  },
];

const { width } = Dimensions.get('window');

export function AnalyticsScreen() {
  const { currentTier } = useTier();
  const [currentPage, setCurrentPage] = useState(1);
  const flatListRef = useRef<FlatList>(null);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const renderMetricCard = (
    title: string,
    value: string | number,
    change: number,
    icon: keyof typeof MaterialCommunityIcons.glyphMap
  ) => (
    <View style={styles.metricCard}>
      <View style={styles.metricHeader}>
        <MaterialCommunityIcons name={icon} size={24} color="#2171C1" />
        <Text style={styles.metricTitle}>{title}</Text>
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <View style={[styles.changeIndicator, { backgroundColor: change >= 0 ? '#DCFCE7' : '#FEE2E2' }]}>
        <MaterialCommunityIcons
          name={change >= 0 ? 'trending-up' : 'trending-down'}
          size={16}
          color={change >= 0 ? '#16A34A' : '#DC2626'}
        />
        <Text style={[styles.changeText, { color: change >= 0 ? '#16A34A' : '#DC2626' }]}>
          {Math.abs(change)}%
        </Text>
      </View>
    </View>
  );

  const renderAccountCard = ({ item: account }: { item: AccountMetrics }) => (
    <View style={styles.accountCard}>
      <View style={styles.accountHeader}>
        <Text style={styles.accountName}>@{account.username}</Text>
      </View>
      <View style={styles.accountMetrics}>
        <View style={styles.accountMetric}>
          <Text style={styles.metricLabel}>Followers</Text>
          <Text style={styles.metricValue}>{formatNumber(account.followers)}</Text>
          <View style={[styles.changeIndicator, { backgroundColor: '#DCFCE7' }]}>
            <MaterialCommunityIcons name="trending-up" size={14} color="#16A34A" />
            <Text style={[styles.changeText, { color: '#16A34A' }]}>
              +{account.growth}
            </Text>
          </View>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.accountMetric}>
          <Text style={styles.metricLabel}>Engagement</Text>
          <Text style={styles.metricValue}>{account.engagement}%</Text>
          <View style={[styles.changeIndicator, { backgroundColor: '#DCFCE7' }]}>
            <MaterialCommunityIcons name="trending-up" size={14} color="#16A34A" />
            <Text style={[styles.changeText, { color: '#16A34A' }]}>
              +2.1%
            </Text>
          </View>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.accountMetric}>
          <Text style={styles.metricLabel}>Reach Rate</Text>
          <Text style={styles.metricValue}>{account.reachRate}%</Text>
          <View style={[styles.changeIndicator, { backgroundColor: '#DCFCE7' }]}>
            <MaterialCommunityIcons name="trending-up" size={14} color="#16A34A" />
            <Text style={[styles.changeText, { color: '#16A34A' }]}>
              +4.3%
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const handleScroll = (event: any) => {
    const page = Math.round(event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width) + 1;
    setCurrentPage(page);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Analytics</Text>
          </View>
          <View style={styles.headerRight}>
            <TierBadge tier={currentTier} />
          </View>
        </View>

        <View style={styles.overallMetrics}>
          <Text style={styles.sectionTitle}>Overall Performance</Text>
          <View style={styles.metricsContainer}>
            {renderMetricCard(
              'Total Followers',
              formatNumber(mockOverallMetrics.totalFollowers),
              mockOverallMetrics.followerGrowth,
              'account-group'
            )}
            {renderMetricCard(
              'Total Reach',
              formatNumber(mockOverallMetrics.totalReach),
              5.8,
              'eye'
            )}
            {renderMetricCard(
              'Engagement',
              mockOverallMetrics.totalEngagement + '%',
              -2.1,
              'heart'
            )}
            {renderMetricCard(
              'Total Posts',
              formatNumber(28),
              12.5,
              'image-multiple'
            )}
          </View>
        </View>

        <View style={styles.accountsSection}>
          <Text style={styles.sectionTitle}>Account Analytics</Text>
          <ScrollView 
            style={styles.accountsScrollView}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.accountsHeader}>
              <Text style={styles.pageIndicator}>{currentPage}/{mockAccounts.length}</Text>
            </View>
            <FlatList
              ref={flatListRef}
              data={mockAccounts}
              renderItem={renderAccountCard}
              keyExtractor={(item) => item.id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              snapToAlignment="center"
              decelerationRate="fast"
              contentContainerStyle={styles.accountsContent}
            />
          </ScrollView>
        </View>
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
  overallMetrics: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 16,
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
    marginBottom: 8,
    textAlign: 'center',
    width: '100%',
  },
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metricCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    width: '47%', // slightly less than 50% to account for gap
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  metricTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  changeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  accountsSection: {
    flex: 1,
    marginHorizontal: 16,
  },
  accountsScrollView: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
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
  accountsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 1,
  },
  pageIndicator: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  accountsContent: {
    flexGrow: 1,
  },
  accountCard: {
    width: Dimensions.get('window').width - 64,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    paddingTop: 24,
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
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  accountName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  accountMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 8,
  },
  accountMetric: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  metricLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  metricDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
}); 