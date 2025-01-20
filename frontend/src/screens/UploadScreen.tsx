import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Dimensions, Alert, TextInput, TouchableOpacity, ScrollView, Platform, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ListItem } from '../components/ListItem';
import { Modal } from '../components/Modal';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { fetchAuthSession, getCurrentUser, signOut } from 'aws-amplify/auth';
import { apiEndpoints } from '../config/aws-config';
import { config } from '../config/env';

interface VideoSelection {
  uri: string;
  type: string;
  name: string;
  duration: number;
  size: number;
}

interface CaptionDetails {
  caption: string;
  targetLanguages: string[];
  id: string;
}

interface ConnectedAccount {
  platform: 'tiktok' | 'instagram' | 'youtube' | 'facebook';
  username: string;
  language?: string;
  isConnected: boolean;
}

interface AccountMetrics {
  followers: number;
  followersGrowth: number;
  engagement: number;
  impressions: number;
  reachRate: number;
  topPostLikes: number;
  postsThisWeek: number;
}

interface UploadResponse {
  videoId: string;
  uploadUrl: string;
}

interface ProcessingStatus {
  status: 'pending_upload' | 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  languages: {
    [key: string]: {
      status: 'pending' | 'processing' | 'completed' | 'failed';
      progress: number;
      error?: string;
    };
  };
}

const AVAILABLE_LANGUAGES = [
  { code: 'hi', name: 'Hindi' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'ru', name: 'Russian' },
  { code: 'ko', name: 'Korean' },
  { code: 'id', name: 'Indonesian' },
  { code: 'it', name: 'Italian' },
  { code: 'nl', name: 'Dutch' },
  { code: 'tr', name: 'Turkish' },
  { code: 'pl', name: 'Polish' },
  { code: 'sv', name: 'Swedish' },
  { code: 'fil', name: 'Filipino' },
  { code: 'ms', name: 'Malay' },
  { code: 'ro', name: 'Romanian' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'el', name: 'Greek' },
  { code: 'cs', name: 'Czech' },
  { code: 'da', name: 'Danish' },
  { code: 'fi', name: 'Finnish' },
  { code: 'bg', name: 'Bulgarian' },
  { code: 'hr', name: 'Croatian' },
  { code: 'sk', name: 'Slovak' },
  { code: 'ta', name: 'Tamil' }
];

const MAX_DURATION = 90; // 90 seconds max for Instagram Reels

const LANGUAGE_SUFFIXES = {
  en: 'english',
  hi: 'hindi',
  pt: 'portugues',
  zh: 'zhongwen',
  es: 'espanol',
  fr: 'francais',
  de: 'deutsch',
  ja: 'nihongo',
  ar: 'arabi',
  ru: 'russkiy',
  ko: 'hangugeo',
  id: 'indonesia',
  it: 'italiano',
  nl: 'nederlands',
  tr: 'turkce',
  pl: 'polski',
  sv: 'svenska',
  fil: 'filipino',
  ms: 'melayu',
  ro: 'romana',
  uk: 'ukrainska',
  el: 'ellinika',
  cs: 'cestina',
  da: 'dansk',
  fi: 'suomi',
  bg: 'bulgarski',
  hr: 'hrvatski',
  sk: 'slovencina',
  ta: 'tamil'
};

const DUMMY_METRICS: AccountMetrics = {
  followers: 15420,
  followersGrowth: 324,
  engagement: 4.8,
  impressions: 45200,
  reachRate: 28.5,
  topPostLikes: 1250,
  postsThisWeek: 5,
};

const CurvedPath = () => (
  <Svg
    width={width * 0.8}
    height={width * 0.8}
    style={styles.curvedPath}
  >
    <Path
      d={`M0 ${width * 0.4} Q ${width * 0.4} ${width * 0.3} ${width * 0.8} ${width * 0.4}`}
      fill="none"
      stroke="#E5E7EB"
      strokeWidth="1"
    />
  </Svg>
);

const SUPPORTED_VIDEO_FORMATS = ['mp4', 'mov', 'hevc'];

const validateVideoFormat = async (uri: string): Promise<boolean> => {
  try {
    // First check file extension
    const extension = uri.split('.').pop()?.toLowerCase();
    if (!extension || !['mp4', 'mov', 'm4v'].includes(extension)) {
      return false;
    }

    // Then check the video codec using the blob
    const response = await fetch(uri);
    const blob = await response.blob();
    
    // H.264/AVC MIME types
    const h264Types = [
      'video/mp4',
      'video/mp4; codecs=avc1',
      'video/mp4; codecs=avc1.42E01E',
      'video/mp4; codecs=avc1.42E01E,mp4a.40.2',
      'video/x-m4v',
      'video/quicktime'
    ];

    // HEVC/H.265 MIME types
    const hevcTypes = [
      'video/mp4; codecs=hevc',
      'video/mp4; codecs=hevc,mp4a.40.2',
      'video/hevc'
    ];

    const videoType = blob.type;
    console.log('Video MIME type:', videoType); // Debug log
    return h264Types.includes(videoType) || hevcTypes.includes(videoType);
  } catch (error) {
    console.error('Error validating video format:', error);
    return false;
  }
};

export function UploadScreen() {
  const [selectedVideo, setSelectedVideo] = useState<VideoSelection | null>(null);
  const [step, setStep] = useState<'select' | 'details'>('select');
  const [captionDetails, setCaptionDetails] = useState<CaptionDetails>({
    caption: '',
    targetLanguages: [],
    id: `VID_${Date.now()}`
  });
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([
    { platform: 'tiktok', username: '@username', isConnected: false },
    { platform: 'instagram', username: '@username', isConnected: false }
  ]);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [startTime] = useState(Date.now());

  const handleBack = () => {
    if (step === 'details') {
      setStep('select');
    } else {
      setSelectedVideo(null);
    }
  };

  const handleContinue = () => {
    setStep('details');
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

        const isValidFormat = await validateVideoFormat(asset.uri);
        if (!isValidFormat) {
          Alert.alert(
            "Unsupported Format",
            "Please select a video in MP4 format (H.264 or HEVC codec).",
            [{ text: "OK" }]
          );
          return;
        }

        // Get the actual MIME type from the blob
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const mimeType = blob.type || 'video/mp4';

        setSelectedVideo({
          name: asset.fileName || 'Untitled',
          uri: asset.uri,
          duration: durationInSeconds,
          type: mimeType,
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

  const toggleLanguage = (code: string) => {
    setCaptionDetails(prev => {
      const languages = prev.targetLanguages.includes(code)
        ? prev.targetLanguages.filter(lang => lang !== code)
        : [...prev.targetLanguages, code];
      return { ...prev, targetLanguages: languages };
    });
  };

  const handleConnectAccounts = () => {
    // Navigate to accounts screen
  };

  const getRecommendedUsername = (language: string) => {
    const baseUsername = 'nathanfrench';
    const suffix = LANGUAGE_SUFFIXES[language as keyof typeof LANGUAGE_SUFFIXES];
    return `${baseUsername}.${suffix}`;
  };

  const handleAccountPress = (accountName: string) => {
    setSelectedAccount(accountName);
  };

  const renderMetricItem = (label: string, value: string | number, icon: keyof typeof MaterialCommunityIcons.glyphMap) => (
    <View style={styles.metricItem}>
      <MaterialCommunityIcons name={icon} size={24} color="#2171C1" style={styles.metricIcon} />
      <View>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
    </View>
  );

  const renderDashboard = () => (
    <ScrollView style={styles.dashboardContent}>
      <View style={styles.metricsHeader}>
        <MaterialCommunityIcons name="instagram" size={32} color="#2171C1" />
        <Text style={styles.accountTitle}>@{selectedAccount}</Text>
      </View>

      <View style={styles.metricsOverview}>
        {renderMetricItem('Followers', DUMMY_METRICS.followers.toLocaleString(), 'account-group')}
        <View style={styles.metricDivider} />
        {renderMetricItem('Growth', `+${DUMMY_METRICS.followersGrowth}`, 'trending-up')}
        <View style={styles.metricDivider} />
        {renderMetricItem('Engagement', `${DUMMY_METRICS.engagement}%`, 'heart-outline')}
      </View>

      <View style={styles.metricSection}>
        <Text style={styles.sectionTitle}>Performance Metrics</Text>
        <View style={styles.metricsGrid}>
          {renderMetricItem('Impressions', DUMMY_METRICS.impressions.toLocaleString(), 'eye-outline')}
          {renderMetricItem('Reach Rate', `${DUMMY_METRICS.reachRate}%`, 'chart-line')}
          {renderMetricItem('Top Post Likes', DUMMY_METRICS.topPostLikes.toLocaleString(), 'thumb-up-outline')}
          {renderMetricItem('Posts This Week', DUMMY_METRICS.postsThisWeek, 'image-multiple')}
        </View>
      </View>

      <View style={styles.metricSection}>
        <Text style={styles.sectionTitle}>Recent Posts</Text>
        <View style={styles.recentPosts}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.postPreview}>
              <Image
                source={{ uri: `https://picsum.photos/200/200?random=${i}` }}
                style={styles.postImage}
              />
              <View style={styles.postStats}>
                <MaterialCommunityIcons name="heart" size={12} color="#EF4444" />
                <Text style={styles.postStatsText}>{Math.floor(Math.random() * 1000)}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  const renderVideoSelection = () => (
    <View style={styles.content}>
      {!selectedVideo ? (
        <View style={styles.uploadContainer}>
          <View style={styles.uploadCircle}>
            <LinearGradient
              colors={[
                '#ADB6C4',
                '#294C60',
                '#001B2E',
              ]}
              style={[StyleSheet.absoluteFill, styles.circleGradient]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View style={styles.textButtonContainer}>
              <CurvedPath />
              <TouchableOpacity 
                onPress={pickVideo} 
                activeOpacity={0.7}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              >
                <Text style={styles.uploadText}>select a video to upload</Text>
              </TouchableOpacity>
            </View>
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
              onPress={handleContinue}
              style={styles.actionButton}
            />
          </View>
        </View>
      )}
    </View>
  );

  const resetState = () => {
    setSelectedVideo(null);
    setCaptionDetails({
      caption: '',
      targetLanguages: [],
      id: `VID_${Date.now()}`
    });
    setStep('select');
    setIsUploading(false);
  };

  const validateVideo = (video: VideoSelection): string | null => {
    if (!video.uri) {
      return 'Invalid video file';
    }
    if (video.size > 100 * 1024 * 1024) { // 100MB limit
      return 'Video file size must be less than 100MB';
    }
    if (video.duration > MAX_DURATION) {
      return `Video duration must be less than ${MAX_DURATION} seconds`;
    }
    return null;
  };

  const MAX_POLLING_DURATION = 15 * 60 * 1000; // 15 minutes

  const pollVideoStatus = async (videoId: string) => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();
      if (!token) throw new Error('No auth token');

      const response = await fetch(apiEndpoints.videos.status(videoId), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch status');
      
      const data = await response.json();
      console.log('[Status] Received status update:', data);

      setProcessingStatus(prevStatus => {
        if (!prevStatus) return null;

        // Map backend status to frontend status (handle both upper and lowercase)
        const statusMap: Record<string, ProcessingStatus['status']> = {
          'pending_upload': 'pending_upload',
          'PENDING_UPLOAD': 'pending_upload',
          'uploading': 'uploading',
          'UPLOADING': 'uploading',
          'processing': 'processing',
          'PROCESSING': 'processing',
          'completed': 'completed',
          'COMPLETED': 'completed',
          'failed': 'failed',
          'FAILED': 'failed',
          // Add legacy status mappings
          'dubbing': 'processing',
          'dubbed': 'completed'
        };

        // Convert backend status to lowercase for consistent comparison
        const backendStatus = (data.status || '').toLowerCase();
        const newStatus = statusMap[data.status] || statusMap[backendStatus] || prevStatus.status;
        console.log('[Status] Mapping status:', { 
          from: data.status, 
          to: newStatus, 
          current: prevStatus.status 
        });

        const progress = data.progress || prevStatus.progress;

        // Update language statuses
        const updatedLanguages = Object.fromEntries(
          Object.entries(prevStatus.languages).map(([lang, status]) => {
            const langStatus = data.languages?.[lang];
            if (!langStatus) return [lang, status];

            return [lang, {
              status: langStatus.status || status.status,
              progress: langStatus.progress || status.progress,
              error: langStatus.error
            }];
          })
        );

        return {
          ...prevStatus,
          status: newStatus,
          progress: progress,
          error: data.error,
          languages: updatedLanguages
        };
      });

      // Continue polling if not in a final state (check both upper and lowercase)
      const status = (data.status || '').toLowerCase();
      if (!['completed', 'failed', 'dubbed'].includes(status)) {
        setTimeout(() => pollVideoStatus(videoId), 5000);
      } else if (status === 'completed' || status === 'dubbed') {
        // Show completion for a moment before closing
        setTimeout(() => {
          setStatusModalVisible(false);
          resetState();
        }, 3000);
      } else if (status === 'failed') {
        // Show error state but allow manual dismissal
        Alert.alert('Processing Failed', data.error || 'An error occurred during processing');
      }
    } catch (error) {
      console.error('[Status] Error polling status:', error);
      // Don't stop polling on temporary errors, unless we've been polling for too long
      if (Date.now() - startTime < MAX_POLLING_DURATION) {
        setTimeout(() => pollVideoStatus(videoId), 5000);
      } else {
        setProcessingStatus(prev => prev ? {
          ...prev,
          status: 'failed',
          error: 'Polling timeout exceeded'
        } : null);
        Alert.alert('Processing Failed', 'Status check timed out. Please try again.');
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedVideo) {
      setError('No video selected');
      return;
    }

    let currentVideoId: string | null = null;

    try {
      setError(null);
      setIsUploading(true);
      setStatusModalVisible(true);
      setProcessingStatus({
        status: 'pending_upload',
        progress: 0,
        languages: Object.fromEntries(
          captionDetails.targetLanguages.map(lang => [
            lang,
            { status: 'pending', progress: 0 }
          ])
        )
      });

      console.log('[Upload] Starting upload process with video:', {
        name: selectedVideo.name,
        size: formatFileSize(selectedVideo.size),
        type: selectedVideo.type,
        duration: formatDuration(selectedVideo.duration)
      });
      
      // Get current auth session
      console.log('[Upload] Fetching auth session...');
      const session = await fetchAuthSession().catch(error => {
        console.error('[Upload] Auth session error:', error);
        throw new Error('Failed to authenticate. Please try logging in again.');
      });

      // Get access token
      const token = session.tokens?.accessToken?.toString();
      if (!token) {
        console.error('[Upload] No access token found in session');
        throw new Error('Authentication required. Please log in again.');
      }
      console.log('[Upload] Successfully obtained access token');

      // Prepare request for upload URL
      const apiUrl = `${apiEndpoints.videos.upload}`;
      console.log('[Upload] Making request to:', apiUrl);
      
      // Make request for upload URL with timeout
      console.log('[Upload] Requesting presigned URL...');
      const uploadUrlResponse = await Promise.race([
        fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            fileName: selectedVideo.name,
            fileType: selectedVideo.type,
            fileSize: selectedVideo.size
          })
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout. Please try again.')), 30000)
        )
      ]) as Response;

      if (!uploadUrlResponse.ok) {
        const errorData = await uploadUrlResponse.text();
        console.error('[Upload] Failed to get upload URL:', {
          status: uploadUrlResponse.status,
          statusText: uploadUrlResponse.statusText,
          error: errorData
        });
        throw new Error(`Failed to get upload URL: ${uploadUrlResponse.status} - ${errorData}`);
      }

      const data = await uploadUrlResponse.json() as UploadResponse;
      currentVideoId = data.videoId;
      console.log('[Upload] Received presigned URL response:', {
        videoId: data.videoId,
        hasUploadUrl: !!data.uploadUrl
      });

      // Get the video blob
      console.log('[Upload] Reading video file...');
      const videoResponse = await fetch(selectedVideo.uri);
      if (!videoResponse.ok) {
        console.error('[Upload] Failed to read video file:', videoResponse.statusText);
        throw new Error('Failed to read video file. Please try again.');
      }
      const videoBlob = await videoResponse.blob();
      
      // Determine content type from the blob
      const contentType = videoBlob.type || 'video/mp4';

      // Upload video to S3 with progress tracking
      console.log('[Upload] Starting S3 upload...');
      const xhr = new XMLHttpRequest();
      
      // Single onprogress handler for upload
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          console.log(`[Upload] Progress: ${progress.toFixed(1)}%`);
          setUploadProgress(progress);
          setProcessingStatus(prev => prev ? {
            ...prev,
            status: 'uploading',
            progress
          } : null);
        }
      };

      // Wait for S3 upload to complete
      await new Promise((resolve, reject) => {
        xhr.open('PUT', data.uploadUrl);
        xhr.setRequestHeader('Content-Type', contentType);
        xhr.onload = () => {
          if (xhr.status === 200) {
            console.log('[Upload] S3 upload completed successfully');
            // Update status to show upload complete
            setProcessingStatus(prev => prev ? {
              ...prev,
              status: 'processing',
              progress: 100,
              languages: Object.fromEntries(
                Object.entries(prev.languages).map(([lang, status]) => [
                  lang,
                  { ...status, status: 'pending' }
                ])
              )
            } : null);
            resolve(null);
          } else {
            console.error('[Upload] S3 upload failed:', {
              status: xhr.status,
              response: xhr.responseText
            });
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };
        xhr.onerror = () => {
          console.error('[Upload] Network error during S3 upload');
          reject(new Error('Network error during upload'));
        };
        xhr.send(videoBlob);
      });

      // Start processing
      console.log('[Upload] Starting video processing...');
      const processResponse = await fetch(apiEndpoints.videos.process(data.videoId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          sourceLanguage: 'en',
          targetLanguages: captionDetails.targetLanguages,
          caption: captionDetails.caption
        })
      });

      if (!processResponse.ok) {
        const errorData = await processResponse.json();
        console.error('[Upload] Processing request failed:', errorData);
        throw new Error(errorData.error || 'Failed to start processing');
      }

      console.log('[Upload] Video processing started successfully');
      
      // Start polling for status immediately after processing starts
      // Add a small delay to allow backend to update status
      setTimeout(() => pollVideoStatus(data.videoId), 2000);

    } catch (error) {
      console.error('[Upload] Error details:', {
        cause: error instanceof Error ? error.cause : undefined,
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : 'UnknownError',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      Alert.alert('Upload Failed', errorMessage);
      setError(errorMessage);
      setProcessingStatus(prev => prev ? {
        ...prev,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      } : null);
      
      // Reset state on error
      resetState();
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const renderCaptionDetails = () => (
    <View style={styles.content}>
      <View style={styles.detailsContainer}>
        <ScrollView style={styles.scrollContent}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Caption</Text>
            <TextInput
              style={styles.captionInput}
              multiline
              placeholder="Enter your video caption..."
              value={captionDetails.caption}
              onChangeText={(text) => setCaptionDetails(prev => ({ ...prev, caption: text }))}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.languagesLabel}>Select Languages (Video & Caption)</Text>
            <View style={styles.languageGrid}>
              {AVAILABLE_LANGUAGES.map(lang => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageButton,
                    captionDetails.targetLanguages.includes(lang.code) && styles.languageButtonSelected
                  ]}
                  onPress={() => toggleLanguage(lang.code)}
                >
                  <Text style={[
                    styles.languageButtonText,
                    captionDetails.targetLanguages.includes(lang.code) && styles.languageButtonTextSelected
                  ]}>
                    {lang.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Post to Accounts</Text>
            <View style={styles.accountsList}>
              {captionDetails.targetLanguages.map((langCode, index) => {
                const existingAccount = connectedAccounts.find(
                  account => account.isConnected && account.language === langCode
                );

                if (existingAccount) {
                  return (
                    <View key={langCode} style={styles.accountItem}>
                      <ListItem
                        accountName={existingAccount.username.replace('@', '')}
                        status="connected"
                        language={AVAILABLE_LANGUAGES.find(lang => lang.code === langCode)?.name}
                        onPress={() => handleAccountPress(existingAccount.username.replace('@', ''))}
                      />
                    </View>
                  );
                }

                return (
                  <View key={langCode} style={styles.accountItem}>
                    <ListItem
                      accountName={getRecommendedUsername(langCode)}
                      subtitle="Recommended account name"
                      status="disconnected"
                      language={AVAILABLE_LANGUAGES.find(lang => lang.code === langCode)?.name}
                    />
                  </View>
                );
              })}
            </View>
            {captionDetails.targetLanguages.length === 0 && (
              <View style={styles.noAccountsContainer}>
                <Text style={styles.noAccountsText}>Select languages to see recommended accounts</Text>
              </View>
            )}
            {captionDetails.targetLanguages.length > 0 && (
              <Button
                title="Create Recommended Accounts"
                leftIcon="account-plus"
                variant="secondary"
                onPress={handleConnectAccounts}
                style={styles.connectButton}
              />
            )}
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <Button
            title="Back"
            variant="secondary"
            leftIcon="arrow-left"
            onPress={handleBack}
            style={styles.actionButton}
          />
          <Button
            title={isUploading ? "Uploading..." : "Upload"}
            leftIcon="cloud-upload"
            onPress={handleUpload}
            style={styles.actionButton}
            disabled={isUploading || !selectedVideo || captionDetails.targetLanguages.length === 0}
          />
        </View>
      </View>

      <Modal
        visible={!!selectedAccount}
        onClose={() => setSelectedAccount(null)}
        title="Account Dashboard"
        size="large"
      >
        {renderDashboard()}
      </Modal>
    </View>
  );

  const renderStatusModal = () => (
    <Modal
      visible={statusModalVisible}
      onClose={() => {
        if (processingStatus?.status !== 'processing') {
          setStatusModalVisible(false);
        }
      }}
      title="Processing Status"
      size="small"
    >
      <View style={styles.statusContent}>
        <View style={styles.statusHeader}>
          <MaterialCommunityIcons
            name={
              processingStatus?.status === 'completed' ? 'check-circle' :
              processingStatus?.status === 'failed' ? 'alert-circle' :
              'progress-clock'
            }
            size={24}
            color={
              processingStatus?.status === 'completed' ? '#34D399' :
              processingStatus?.status === 'failed' ? '#EF4444' :
              '#2171C1'
            }
          />
          <Text style={styles.statusTitle}>
            {processingStatus?.status === 'pending_upload' ? 'Preparing Upload...' :
             processingStatus?.status === 'uploading' ? 'Uploading Video...' :
             processingStatus?.status === 'processing' ? 'Processing Video...' :
             processingStatus?.status === 'completed' ? 'Processing Complete!' :
             'Processing Failed'}
          </Text>
        </View>

        {processingStatus?.status === 'uploading' && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { width: `${processingStatus.progress}%` }
                ]}
              />
            </View>
            <Text style={styles.progressText}>{Math.round(processingStatus.progress)}%</Text>
          </View>
        )}

        {(processingStatus?.status === 'processing' || processingStatus?.status === 'completed') && (
          <View style={styles.languageStatusList}>
            {Object.entries(processingStatus.languages).map(([lang, status]) => (
              <View key={lang} style={styles.languageStatusItem}>
                <View style={styles.languageStatusHeader}>
                  <Text style={styles.languageStatusText}>
                    {AVAILABLE_LANGUAGES.find(l => l.code === lang)?.name}
                  </Text>
                  <MaterialCommunityIcons
                    name={
                      status.status === 'completed' ? 'check-circle' :
                      status.status === 'failed' ? 'alert-circle' :
                      status.status === 'processing' ? 'progress-clock' :
                      'clock-outline'
                    }
                    size={18}
                    color={
                      status.status === 'completed' ? '#34D399' :
                      status.status === 'failed' ? '#EF4444' :
                      '#2171C1'
                    }
                  />
                </View>
                {status.status === 'processing' && (
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill,
                        { width: `${status.progress}%` }
                      ]}
                    />
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {processingStatus?.error && (
          <Text style={styles.errorText}>{processingStatus.error}</Text>
        )}
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[
          'rgba(33, 113, 193, 0.9)',
          'rgba(33, 113, 193, 0.4)',
          'rgba(33, 113, 193, 0.3)',
          'transparent'
        ]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <ScrollView style={styles.scrollContent}>
        {step === 'select' ? renderVideoSelection() : renderCaptionDetails()}
      </ScrollView>
      {renderStatusModal()}
    </SafeAreaView>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  scrollContent: {
    flexGrow: 1,
  },
  uploadContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: Dimensions.get('window').height - 100,
    marginTop: -50,
  },
  uploadCircle: {
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: (width * 0.8) / 2,
    backgroundColor: 'transparent',
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
    position: 'relative',
    overflow: 'hidden',
  },
  circleGradient: {
    borderRadius: (width * 0.8) / 2,
  },
  uploadIcon: {
    position: 'absolute',
    top: '25%',
    transform: [{ translateY: -24 }],
  },
  textButtonContainer: {
    alignItems: 'center',
    position: 'absolute',
    width: '100%',
    top: '50%',
  },
  curvedPath: {
    position: 'absolute',
    opacity: 0.5,
    top: 0,
    left: 0,
  },
  uploadText: {
    fontSize: 16,
    color: '#E8F1F2',
    textAlign: 'center',
    marginBottom: 16,
    transform: [{ translateY: -8 }],
  },
  button: {
    minWidth: 200,
    alignSelf: 'center',
    transform: [{ translateY: -4 }],
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
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  actionButton: {
    flex: 1,
  },
  detailsContainer: {
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
    flex: 1, // Take up all available space
  },
  inputContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  inputLabel: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    fontWeight: '500',
    textAlign: 'left',
  },
  captionInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    height: 100,
    textAlignVertical: 'top',
    fontSize: 14,
    color: '#1F2937',
    textAlign: 'left',
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    justifyContent: 'center',
  },
  languageButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  languageButtonSelected: {
    backgroundColor: '#2171C1',
    borderColor: '#2171C1',
  },
  languageButtonText: {
    fontSize: 14,
    color: '#374151',
  },
  languageButtonTextSelected: {
    color: '#FFFFFF',
  },
  accountsList: {
    paddingTop: 8,
    alignItems: 'stretch',
  },
  accountItem: {
    marginBottom: 8,
  },
  noAccountsContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  noAccountsText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  connectButton: {
    minWidth: 200,
    alignSelf: 'center',
    marginTop: 16,
  },
  languagesLabel: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    fontWeight: '500',
    textAlign: 'center',
  },
  dashboardContent: {
    padding: 16,
  },
  metricsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  accountTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1F2937',
  },
  metricsOverview: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  metricItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metricIcon: {
    backgroundColor: '#EFF6FF',
    padding: 8,
    borderRadius: 8,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  metricLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  metricDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  metricSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  recentPosts: {
    flexDirection: 'row',
    gap: 12,
  },
  postPreview: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  postStats: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  postStatsText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  statusContent: {
    padding: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 2,
    overflow: 'hidden',
    marginVertical: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2171C1',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
  },
  languageStatusList: {
    gap: 12,
  },
  languageStatusItem: {
    gap: 4,
  },
  languageStatusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  languageStatusText: {
    fontSize: 14,
    color: '#374151',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginTop: 12,
  },
}); 