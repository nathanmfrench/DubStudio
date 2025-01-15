import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ListItem } from '../components/ListItem';
import { Button } from '../components/Button';

interface AccountAnalytics {
  followers: number;
  posts: number;
  engagement: number;
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
    accountName: 'nathanfrench.india',
    region: 'India',
    language: 'Hindi',
    analytics: {
      followers: 15400,
      posts: 127,
      engagement: 8.5,
      views: 45000,
    },
  },
  {
    id: '2',
    accountName: 'nathanfrench.japan',
    region: 'Japan',
    language: 'Japanese',
    analytics: {
      followers: 8200,
      posts: 84,
      engagement: 6.2,
      views: 25000,
    },
  },
];

export function AccountsScreen() {
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const renderAnalytics = (analytics: AccountAnalytics) => {
    return (
      <View style={styles.analyticsContainer}>
        <View style={styles.analyticsItem}>
          <MaterialCommunityIcons name="account-group" size={24} color="#2171C1" />
          <Text style={styles.analyticsValue}>{formatNumber(analytics.followers)}</Text>
          <Text style={styles.analyticsLabel}>Followers</Text>
        </View>
        <View style={styles.analyticsItem}>
          <MaterialCommunityIcons name="post" size={24} color="#2171C1" />
          <Text style={styles.analyticsValue}>{formatNumber(analytics.posts)}</Text>
          <Text style={styles.analyticsLabel}>Posts</Text>
        </View>
        <View style={styles.analyticsItem}>
          <MaterialCommunityIcons name="chart-line" size={24} color="#2171C1" />
          <Text style={styles.analyticsValue}>{analytics.engagement}%</Text>
          <Text style={styles.analyticsLabel}>Engagement</Text>
        </View>
        <View style={styles.analyticsItem}>
          <MaterialCommunityIcons name="eye" size={24} color="#2171C1" />
          <Text style={styles.analyticsValue}>{formatNumber(analytics.views)}</Text>
          <Text style={styles.analyticsLabel}>Views</Text>
        </View>
      </View>
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
              <TouchableOpacity
                style={styles.accountHeader}
                onPress={() => setSelectedAccount(
                  selectedAccount?.id === account.id ? null : account
                )}
              >
                <ListItem
                  accountName={account.accountName}
                  subtitle={`${account.region} • ${account.language}`}
                  status="connected"
                  language={account.language}
                />
              </TouchableOpacity>
              
              {selectedAccount?.id === account.id && (
                <View style={styles.accountDetails}>
                  {renderAnalytics(account.analytics)}
                  <View style={styles.actionButtons}>
                    <Button
                      title="View Insights"
                      size="small"
                      variant="secondary"
                      leftIcon="chart-box"
                      onPress={() => {}}
                    />
                    <View style={{ width: 12 }} />
                    <Button
                      title="Settings"
                      size="small"
                      variant="secondary"
                      leftIcon="cog-outline"
                      onPress={() => {}}
                    />
                  </View>
                </View>
              )}
            </View>
          ))}
        </View>
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
}); 