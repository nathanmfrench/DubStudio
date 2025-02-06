import React, { useState } from 'react';
import { View, TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { videoService } from '../../services/videoService';

interface VideoUploadProps {
  onUploadComplete: (videoId: string) => void;
  onError: (error: string) => void;
}

interface VideoFile {
  uri: string;
  mimeType: string;
  name: string;
}

export const VideoUpload: React.FC<VideoUploadProps> = ({ onUploadComplete, onError }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleVideoSelect = async () => {
    console.log('[VideoUpload] Starting video selection');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
        copyToCacheDirectory: true,
      });

      console.log('[VideoUpload] Document picker result:', result);

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        
        // Validate file
        if (!file.mimeType?.startsWith('video/')) {
          throw new Error('Please select a valid video file');
        }

        console.log('[VideoUpload] Selected file:', {
          name: file.name,
          type: file.mimeType,
          size: file.size,
          uri: file.uri.substring(0, 20) + '...'
        });

        setIsUploading(true);
        setUploadProgress(0);

        // Get pre-signed URL
        const uploadUrlResponse = await videoService.getUploadUrl({
          fileName: file.name,
          fileType: file.mimeType,
        });

        console.log('[VideoUpload] Got upload URL:', {
          videoId: uploadUrlResponse.videoId,
          key: uploadUrlResponse.key
        });

        // Prepare file object
        const videoFile: VideoFile = {
          uri: file.uri,
          mimeType: file.mimeType,
          name: file.name,
        };

        // Upload to S3 with progress tracking
        await videoService.uploadToS3(
          uploadUrlResponse.uploadUrl,
          videoFile,
          {
            onProgress: (progress: number) => {
              console.log('[VideoUpload] Upload progress:', progress);
              setUploadProgress(progress);
            }
          }
        );

        console.log('[VideoUpload] Upload completed successfully');
        setUploadProgress(100);
        onUploadComplete(uploadUrlResponse.videoId);
      }
    } catch (error) {
      console.error('[VideoUpload] Upload error:', error);
      setUploadProgress(0);
      onError(error instanceof Error ? error.message : 'Failed to upload video');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, isUploading && styles.buttonDisabled]}
        onPress={handleVideoSelect}
        disabled={isUploading}
      >
        <Text style={styles.buttonText}>
          {isUploading ? 'Uploading...' : 'Select Video'}
        </Text>
      </TouchableOpacity>
      
      {isUploading && (
        <View style={styles.progressContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.progressText}>{Math.round(uploadProgress)}%</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#99c9ff',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
}); 