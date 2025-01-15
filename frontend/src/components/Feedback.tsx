import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  StyleProp,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type FeedbackType = 'success' | 'error' | 'info' | 'loading';

interface FeedbackProps {
  type: FeedbackType;
  message: string;
  description?: string;
  style?: StyleProp<ViewStyle>;
}

export function Feedback({
  type,
  message,
  description,
  style,
}: FeedbackProps) {
  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'rgba(52, 211, 153, 0.1)';
      case 'error':
        return 'rgba(239, 68, 68, 0.1)';
      case 'info':
        return 'rgba(33, 113, 193, 0.1)';
      default:
        return 'rgba(156, 163, 175, 0.1)';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'success':
        return '#34D399';
      case 'error':
        return '#EF4444';
      case 'info':
        return '#2171C1';
      default:
        return '#9CA3AF';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return 'check-circle';
      case 'error':
        return 'alert-circle';
      case 'info':
        return 'information';
      default:
        return 'information';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: getBackgroundColor() }, style]}>
      <View style={styles.iconContainer}>
        {type === 'loading' ? (
          <ActivityIndicator size="small" color="#2171C1" />
        ) : (
          <MaterialCommunityIcons
            name={getIcon()}
            size={24}
            color={getIconColor()}
          />
        )}
      </View>
      <View style={styles.content}>
        <Text style={[styles.message, { color: getIconColor() }]}>{message}</Text>
        {description && (
          <Text style={styles.description}>{description}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
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
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  message: {
    fontSize: 16,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
}); 