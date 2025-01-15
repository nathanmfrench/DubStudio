import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Status = 'connected' | 'disconnected' | 'pending' | 'error';

interface ListItemProps {
  accountName: string;
  subtitle?: string;
  status?: Status;
  language?: string;
  onPress?: () => void;
}

export function ListItem({
  accountName,
  subtitle,
  status = 'disconnected',
  language,
  onPress,
}: ListItemProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return '#34D399';
      case 'pending':
        return '#FCD34D';
      case 'error':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return 'check-circle-outline';
      case 'pending':
        return 'clock-outline';
      case 'error':
        return 'alert-circle-outline';
      default:
        return 'link-variant-off';
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.content}>
        <View style={styles.platformIcon}>
          <MaterialCommunityIcons
            name="instagram"
            size={24}
            color="#2171C1"
          />
        </View>
        <View style={styles.info}>
          <Text style={styles.accountName}>@{accountName}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        <View style={[styles.status, { backgroundColor: getStatusColor() }]}>
          <MaterialCommunityIcons
            name={getStatusIcon()}
            size={14}
            color="#FFFFFF"
          />
        </View>
      </View>
      {status === 'connected' && language && (
        <View style={styles.languageContainer}>
          <MaterialCommunityIcons
            name="translate"
            size={14}
            color="#2171C1"
            style={styles.languageIcon}
          />
          <Text style={styles.languageText}>{language}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
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
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  platformIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  accountName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  status: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  languageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  languageIcon: {
    marginRight: 4,
  },
  languageText: {
    fontSize: 12,
    color: '#2171C1',
    fontWeight: '500',
  },
}); 