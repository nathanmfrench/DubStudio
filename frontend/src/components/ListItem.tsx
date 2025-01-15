import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  StyleProp,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type PlatformType = 'tiktok' | 'instagram' | 'youtube' | 'facebook';
type ConnectionStatus = 'connected' | 'disconnected' | 'pending' | 'error';

interface ListItemProps {
  platform: PlatformType;
  accountName: string;
  subtitle?: string;
  status: ConnectionStatus;
  language?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function ListItem({
  platform,
  accountName,
  subtitle,
  status,
  language,
  onPress,
  style,
}: ListItemProps) {
  const getPlatformIcon = () => {
    switch (platform) {
      case 'tiktok':
        return 'music-circle';
      case 'instagram':
        return 'instagram';
      case 'youtube':
        return 'youtube';
      case 'facebook':
        return 'facebook';
      default:
        return 'account';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return '#34D399';
      case 'pending':
        return '#FCD34D';
      case 'error':
        return '#EF4444';
      default:
        return '#9CA3AF';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return 'check-circle';
      case 'pending':
        return 'clock-outline';
      case 'error':
        return 'alert-circle';
      default:
        return 'link-variant-off';
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.leftIcon}>
        <MaterialCommunityIcons
          name={getPlatformIcon()}
          size={24}
          color="#2171C1"
        />
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.accountName}>{accountName}</Text>
          {language && status === 'connected' && (
            <View style={styles.languageTag}>
              <MaterialCommunityIcons
                name="translate"
                size={12}
                color="#2171C1"
              />
              <Text style={styles.languageText}>{language}</Text>
            </View>
          )}
        </View>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      <View style={[styles.status, { backgroundColor: getStatusColor() }]}>
        <MaterialCommunityIcons
          name={getStatusIcon()}
          size={16}
          color="#FFFFFF"
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  leftIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(33, 113, 193, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  status: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  languageTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(33, 113, 193, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  languageText: {
    fontSize: 12,
    color: '#2171C1',
    fontWeight: '500',
  },
}); 