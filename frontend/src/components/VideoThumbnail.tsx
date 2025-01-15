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
import { LinearGradient } from 'expo-linear-gradient';

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
        return '#FCD34D';
      case 'dubbed':
        return '#34D399';
      case 'error':
        return '#EF4444';
      default:
        return '#6B7280';
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
      activeOpacity={0.9}
    >
      <View style={styles.thumbnailContainer}>
        <Image
          source={{ uri: thumbnailUrl }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.7)', 'transparent', 'rgba(0,0,0,0.7)']}
          locations={[0, 0.5, 1]}
          style={styles.gradient}
        />
        <View style={styles.duration}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={12}
            color="#FFFFFF"
            style={styles.durationIcon}
          />
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
        <View style={styles.titleContainer}>
          <MaterialCommunityIcons
            name={status === 'dubbed' ? 'translate' : 'video'}
            size={18}
            color="#2171C1"
            style={styles.titleIcon}
          />
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.tagContainer}>
            <View style={[styles.tag, { backgroundColor: getStatusColor() }]}>
              <MaterialCommunityIcons
                name={getStatusIcon()}
                size={12}
                color="#FFFFFF"
                style={styles.tagIcon}
              />
              <Text style={styles.tagText}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </View>
          </View>
        </View>
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
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
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
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  duration: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  durationIcon: {
    marginRight: 4,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  status: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  details: {
    padding: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  titleIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    lineHeight: 20,
  },
  tagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagIcon: {
    marginRight: 4,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
}); 