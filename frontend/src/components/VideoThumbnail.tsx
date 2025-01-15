import React from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  StyleProp,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface VideoThumbnailProps {
  title: string;
  thumbnailUrl: string;
  duration: string;
  status?: 'original' | 'processing' | 'dubbed' | 'error';
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function VideoThumbnail({
  title,
  thumbnailUrl,
  duration,
  status = 'original',
  onPress,
  style,
}: VideoThumbnailProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'processing':
        return '#FCD34D'; // Yellow
      case 'dubbed':
        return '#34D399'; // Green
      case 'error':
        return '#EF4444'; // Red
      default:
        return '#6B7280'; // Gray
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return 'clock-outline';
      case 'dubbed':
        return 'check-circle-outline';
      case 'error':
        return 'alert-circle-outline';
      default:
        return 'video-outline';
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.thumbnailContainer}>
        <Image
          source={{ uri: thumbnailUrl }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
        <View style={styles.duration}>
          <Text style={styles.durationText}>{duration}</Text>
        </View>
        <View style={[styles.status, { backgroundColor: getStatusColor() }]}>
          <MaterialCommunityIcons
            name={getStatusIcon()}
            size={14}
            color="#FFFFFF"
          />
        </View>
      </View>
      <View style={styles.details}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  thumbnailContainer: {
    position: 'relative',
    aspectRatio: 16 / 9,
    backgroundColor: '#F3F4F6',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  duration: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  status: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  details: {
    padding: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    lineHeight: 20,
  },
}); 