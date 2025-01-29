import React, { useState } from 'react';
import { View, TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { videoService } from '../../services/videoService';

interface VideoUploadProps {
  onUploadComplete: (videoId: string) => void;
  onError: (error: string) => void;
}

export const VideoUpload: React.FC<VideoUploadProps> = ({ onUploadComplete, onError }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleVideoSelect = async () => {
    try {
      // Pick video file
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        const file = result.assets[0];
        setIsUploading(true);
        setUploadProgress(0);

        // Get pre-signed URL
        const uploadUrlResponse = await videoService.getUploadUrl({
          fileName: file.name,
          fileType: file.mimeType || 'video/mp4',
        });

        // Upload to S3
        await videoService.uploadToS3(
          uploadUrlResponse.uploadUrl,
          {
            uri: file.uri,
            type: file.mimeType,
            name: file.name,
          } as any
        );

        setUploadProgress(100);
        onUploadComplete(uploadUrlResponse.videoId);
      }
    } catch (error) {
      console.error('Upload error:', error);
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
          <ActivityIndicator size="small" color="#0000ff" />
          <Text style={styles.progressText}>{uploadProgress}%</Text>
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
    backgroundColor: '#ccc',
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