import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface VideoSelection {
  uri: string;
  duration: number;
  type: string;
  size: number;
}

const MAX_DURATION = 90; // 90 seconds max for Instagram Reels

export function UploadScreen() {
  const [selectedVideo, setSelectedVideo] = useState<VideoSelection | null>(null);

  const handleBack = () => {
    setSelectedVideo(null);
  };

  const pickVideo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permission.granted) {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'videos',
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const durationInSeconds = (asset.duration || 0) / 1000;

        if (durationInSeconds > MAX_DURATION) {
          Alert.alert(
            "Video Too Long",
            `Videos must be ${MAX_DURATION} seconds or less for Instagram Reels. This video is ${Math.round(durationInSeconds)} seconds.`,
            [{ text: "OK" }]
          );
          return;
        }

        setSelectedVideo({
          uri: asset.uri,
          duration: durationInSeconds,
          type: 'video',
          size: asset.fileSize || 0,
        });
      }
    }
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}m ${secs}s`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {!selectedVideo ? (
          <View style={styles.uploadContainer}>
            <View style={styles.uploadCircle}>
              <MaterialCommunityIcons 
                name="video-plus" 
                size={48} 
                color="#2171C1" 
              />
              <Text style={styles.uploadText}>Select a video to upload</Text>
              <Button
                title="Choose from Gallery"
                leftIcon="image-multiple"
                onPress={pickVideo}
                style={styles.button}
              />
            </View>
          </View>
        ) : (
          <View style={styles.previewContainer}>
            <Image 
              source={{ uri: selectedVideo.uri }} 
              style={styles.thumbnail}
              resizeMode="cover"
            />
            <View style={styles.videoInfo}>
              <View style={styles.infoItem}>
                <MaterialCommunityIcons name="clock-outline" size={20} color="#2171C1" />
                <Text style={styles.infoText}>
                  {formatDuration(selectedVideo.duration)}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <MaterialCommunityIcons name="file-outline" size={20} color="#2171C1" />
                <Text style={styles.infoText}>
                  {formatFileSize(selectedVideo.size)}
                </Text>
              </View>
            </View>
            <View style={styles.actions}>
              <Button
                title="Back"
                variant="secondary"
                leftIcon="arrow-left"
                onPress={handleBack}
                style={styles.actionButton}
              />
              <Button
                title="Continue"
                leftIcon="arrow-right"
                onPress={() => {}}
                style={styles.actionButton}
              />
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 16,
    flex: 1,
  },
  uploadContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadCircle: {
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: (width * 0.8) / 2,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  uploadText: {
    marginTop: 16,
    marginBottom: 24,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  button: {
    minWidth: 200,
  },
  previewContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  thumbnail: {
    width: '100%',
    height: width * 0.5625, // 16:9 aspect ratio
    backgroundColor: '#F3F4F6',
  },
  videoInfo: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#1F2937',
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
}); 