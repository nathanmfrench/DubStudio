import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Platform, Alert, TextInput, Linking, Switch, Animated, LayoutAnimation, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { TierBadge } from '../components/TierBadge';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ListItem } from '../components/ListItem';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { facebookService } from '../services/FacebookService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTier } from '../contexts/TierContext';
import { useTheme } from '../contexts/ThemeContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { FlingGestureHandler, Directions, State, FlingGestureHandlerStateChangeEvent } from 'react-native-gesture-handler';
import { get, post } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { config } from '../config/env';
import NetInfo from '@react-native-community/netinfo';
import { VideoUpload } from '../components/VideoUpload/VideoUpload';
import { videoService } from '../services/videoService';
import { useAuth } from '../contexts/AuthContext';
import * as FileSystem from 'expo-file-system';
import { SubtitleStyler } from '../components/SubtitleStyler/SubtitleStyler';
import { SubtitleStyle } from 'infrastructure/lambda/src/types/video';
import { v4 as uuid } from 'uuid';

interface VideoSelection {
  id: string;
  name: string;
  uri: string;
  duration: number;
  type: string;
  size: number;
  thumbnailUri?: string;
}

interface CaptionDetails {
  caption: string;
  targetLanguages: string[];
  id: string;
}

interface ConnectedAccount {
  platform: 'instagram';
  username: string;
  language?: string;
  isConnected: boolean;
  accessToken?: string;
  userId?: string;
  pageId?: string;
  pageName?: string;
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

interface AccountCreationDetails {
  username: string;
  password: string;
  email?: string;
  bio?: string;
  profilePicture?: string;
  language: string;
  languageName: string;
}

interface UploadState {
  sourceLanguage: string;
  caption: string;
  translationType: 'dubbing' | 'subtitles' | 'schedule' | '';
  targetLanguages: string[];
  includeSubtitles: boolean;
  subtitleData?: {
    [language: string]: Array<{
      startTime: number;
      endTime: number;
      text: string;
    }>;
  };
  translateCaptions: boolean;
  deliveryOption: 'post' | 'schedule' | 'download' | '';
  scheduledDate?: Date;
}

interface DubbingProgress {
  status: 'idle' | 'starting' | 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  error: string | null;
  languageProgress: Record<string, {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
  }>;
}

interface VideoFormData {
  uri: string;
  type: string;
  name: string;
}

const initialDubbingProgress: DubbingProgress = {
  status: 'idle',
  progress: 0,
  error: null,
  languageProgress: {}
};

const AVAILABLE_LANGUAGES = [
  // Most widely spoken languages globally
  { code: 'en', name: 'English' },
  { code: 'zh', name: 'Chinese' },
  { code: 'hi', name: 'Hindi' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'es', name: 'Spanish' },
  { code: 'ar', name: 'Arabic' },
  { code: 'fr', name: 'French' },
  { code: 'id', name: 'Indonesian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ru', name: 'Russian' },
  { code: 'de', name: 'German' },
  { code: 'ko', name: 'Korean' },
  
  // Other supported languages
  { code: 'it', name: 'Italian' },
  { code: 'tr', name: 'Turkish' },
  { code: 'pl', name: 'Polish' },
  { code: 'nl', name: 'Dutch' },
  { code: 'fil', name: 'Filipino' },
  { code: 'ms', name: 'Malay' },
  { code: 'ta', name: 'Tamil' },
  { code: 'sv', name: 'Swedish' },
  { code: 'ro', name: 'Romanian' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'el', name: 'Greek' },
  { code: 'cs', name: 'Czech' },
  { code: 'da', name: 'Danish' },
  { code: 'fi', name: 'Finnish' },
  { code: 'bg', name: 'Bulgarian' },
  { code: 'hr', name: 'Croatian' },
  { code: 'sk', name: 'Slovak' }
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

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

type NavigationProps = NativeStackNavigationProp<any>;

const API_BASE_URL = config.api.baseUrl;

export const UploadScreen: React.FC = () => {
  const { currentTierData } = useTier();
  const { colors, isDarkMode } = useTheme();
  const { isAuthenticated, user } = useAuth();
  const [selectedVideo, setSelectedVideo] = useState<VideoSelection | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadState, setUploadState] = useState<UploadState>({
    sourceLanguage: '',
    caption: '',
    translationType: '',
    targetLanguages: [],
    includeSubtitles: false,
    subtitleData: {},
    translateCaptions: false,
    deliveryOption: '',
  });
  const [languageSearch, setLanguageSearch] = useState('');
  const [dubbingProgress, setDubbingProgress] = useState<DubbingProgress>(initialDubbingProgress);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyle>({
    fontSize: 24,
    fontColor: '#FFFFFF',
    backgroundColor: '#000000',
    fontType: 'Arial',
    outline: 1,
    opacity: 0.8,
    position: { x: 50, y: 90, width: 100, height: 100 },
  });
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const pickVideo = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "DubStudio needs access to your media library to upload videos.",
          [
            {
              text: "Open Settings",
              onPress: () => {
                Platform.OS === 'ios' 
                  ? Linking.openURL('app-settings:')
                  : Linking.openSettings();
              }
            },
            {
              text: "Cancel",
              style: "cancel"
            }
          ]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'videos',
        allowsEditing: true,
        quality: 1,
        videoMaxDuration: MAX_DURATION,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const durationInSeconds = (asset.duration || 0) / 1000;

        if (durationInSeconds > MAX_DURATION) {
          Alert.alert(
            "Video Too Long",
            `Videos must be ${MAX_DURATION} seconds or less for Instagram Reels. This video is ${Math.round(durationInSeconds)} seconds.`
          );
          return;
        }

        const isValidFormat = await validateVideoFormat(asset.uri);
        if (!isValidFormat) {
          Alert.alert(
            "Unsupported Format",
            "Please select a video in MP4 format (H.264 or HEVC codec)."
          );
          return;
        }

        setSelectedVideo({
          id: uuid(),
          name: asset.fileName || 'video',
          uri: asset.uri,
          duration: durationInSeconds,
          type: 'video/mp4',
          size: asset.fileSize || 0,
        });
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to select video. Please try again.');
    }
  };

  const pickThumbnail = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "DubStudio needs access to your media library to select a thumbnail.",
          [
            {
              text: "Open Settings",
              onPress: () => {
                Platform.OS === 'ios' 
                  ? Linking.openURL('app-settings:')
                  : Linking.openSettings();
              }
            },
            {
              text: "Cancel",
              style: "cancel"
            }
          ]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedVideo(prev => prev ? {
          ...prev,
          thumbnailUri: result.assets[0].uri
        } : null);
      }
    } catch (error) {
      console.error('Error picking thumbnail:', error);
      Alert.alert('Error', 'Failed to select thumbnail. Please try again.');
    }
  };

  const renderVideoPreview = () => {
    if (!selectedVideo) return null;

    return (
      <View style={[styles.videoPreviewContainer, {
        backgroundColor: colors.surface,
        borderColor: colors.cardBorder
      }]}>
        {selectedVideo.thumbnailUri && (
          <Image
            source={{ uri: selectedVideo.thumbnailUri }}
            style={styles.videoThumbnail}
            resizeMode="cover"
          />
        )}
        <View style={styles.videoDetails}>
          <MaterialCommunityIcons name="video" size={24} color={colors.primary} />
          <View style={styles.videoInfo}>
            <Text style={[styles.videoName, { color: colors.text }]}>
              {selectedVideo.name}
            </Text>
            <Text style={[styles.videoMetadata, { color: colors.textSecondary }]}>
              {formatFileSize(selectedVideo.size)} • {Math.round(selectedVideo.duration)}s
            </Text>
          </View>
          <TouchableOpacity onPress={pickVideo}>
            <MaterialCommunityIcons name="pencil" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.thumbnailOptions}>
          <TouchableOpacity
            style={[styles.thumbnailButton, { backgroundColor: colors.primary }]}
            onPress={pickThumbnail}
          >
            <MaterialCommunityIcons name="image" size={20} color="#FFFFFF" />
            <Text style={styles.thumbnailButtonText}>
              {selectedVideo.thumbnailUri ? 'Change Thumbnail' : 'Add Custom Thumbnail'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderUploadArea = () => (
    <View style={[styles.uploadArea, { 
      backgroundColor: colors.surface,
      borderColor: colors.border
    }]}>
      <MaterialCommunityIcons 
        name="cloud-upload-outline" 
        size={48} 
        color={colors.primary} 
      />
      <Text style={[styles.uploadTitle, { color: colors.text }]}>
        Select a Video to Get Started
      </Text>
      <Text style={[styles.uploadSubtitle, { color: colors.textSecondary }]}>
        Upload an MP4 or MOV file (max 90 seconds)
      </Text>
      <Button
        title="Select Video"
        onPress={pickVideo}
        variant="primary"
        leftIcon="video-plus"
      />
    </View>
  );

  const goToNextStep = () => {
    const maxSteps = uploadState.translationType === 'subtitles' ? 6 : 5;
    if (currentStep < maxSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSourceLanguageChange = (language: string) => {
    setUploadState(prev => ({
      ...prev,
      sourceLanguage: prev.sourceLanguage === language ? '' : language
    }));
  };

  const handleCaptionChange = (text: string) => {
    if (text.length <= 2200) {
      setUploadState(prev => ({
        ...prev,
        caption: text
      }));
    }
  };

  const handleTargetLanguageChange = (language: string) => {
    setUploadState(prev => ({
      ...prev,
      targetLanguages: prev.targetLanguages.includes(language)
        ? prev.targetLanguages.filter(lang => lang !== language)
        : [...prev.targetLanguages, language]
    }));
  };

  const filteredSourceLanguages = AVAILABLE_LANGUAGES
    .filter(lang => lang.name.toLowerCase().includes(languageSearch.toLowerCase()));

  const filteredTargetLanguages = AVAILABLE_LANGUAGES
    .filter(lang => 
      lang.code !== uploadState.sourceLanguage && 
      lang.name.toLowerCase().includes(languageSearch.toLowerCase())
    );

  const renderStep1 = () => {
    return (
      <View style={[styles.inputContainer, {
        backgroundColor: colors.surface,
        borderColor: colors.cardBorder
      }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Choose a Translation Type</Text>
        
        <View style={styles.translationOptions}>
          <TouchableOpacity
            style={[
              styles.translationOption,
              uploadState.translationType === 'dubbing' && styles.selectedTranslationOption,
              {
                backgroundColor: colors.cardBackground,
                borderColor: uploadState.translationType === 'dubbing' ? colors.primary : colors.border
              }
            ]}
            onPress={() => {
              setUploadState(prev => ({ ...prev, translationType: 'dubbing' }));
              goToNextStep();
            }}
          >
            <View style={styles.translationIconContainer}>
              <MaterialCommunityIcons
                name="account-voice"
                size={32}
                color={uploadState.translationType === 'dubbing' ? colors.primary : colors.text}
              />
            </View>
            <Text style={[
              styles.translationTitle,
              { color: uploadState.translationType === 'dubbing' ? colors.primary : colors.text }
            ]}>
              Dubbing
            </Text>
            <Text style={[styles.translationDescription, { color: colors.textSecondary }]}>
              Translate voice to other languages
            </Text>
            <Text style={[styles.translationPricing, { color: colors.textSecondary }]}>
              1 credit per language
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.translationOption,
              uploadState.translationType === 'subtitles' && styles.selectedTranslationOption,
              {
                backgroundColor: colors.cardBackground,
                borderColor: uploadState.translationType === 'subtitles' ? colors.primary : colors.border
              }
            ]}
            onPress={() => {
              setUploadState(prev => ({ ...prev, translationType: 'subtitles' }));
              goToNextStep();
            }}
          >
            <View style={styles.translationIconContainer}>
              <MaterialCommunityIcons
                name="subtitles-outline"
                size={32}
                color={uploadState.translationType === 'subtitles' ? colors.primary : colors.text}
              />
            </View>
            <Text style={[
              styles.translationTitle,
              { color: uploadState.translationType === 'subtitles' ? colors.primary : colors.text }
            ]}>
              Subtitles
            </Text>
            <Text style={[styles.translationDescription, { color: colors.textSecondary }]}>
              Add translated subtitles
            </Text>
            <Text style={[styles.translationPricing, { color: colors.textSecondary }]}>
              0.2 credits per language
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.translationOption,
              uploadState.translationType === 'schedule' && styles.selectedTranslationOption,
              {
                backgroundColor: colors.cardBackground,
                borderColor: uploadState.translationType === 'schedule' ? colors.primary : colors.border
              }
            ]}
            onPress={() => {
              setUploadState(prev => ({ ...prev, translationType: 'schedule' }));
              goToNextStep();
            }}
          >
            <View style={styles.translationIconContainer}>
              <MaterialCommunityIcons
                name="calendar-clock"
                size={32}
                color={uploadState.translationType === 'schedule' ? colors.primary : colors.text}
              />
            </View>
            <Text style={[
              styles.translationTitle,
              { color: uploadState.translationType === 'schedule' ? colors.primary : colors.text }
            ]}>
              Schedule Only
            </Text>
            <Text style={[styles.translationDescription, { color: colors.textSecondary }]}>
              Schedule posts without translation
            </Text>
            <Text style={[styles.translationPricing, { color: colors.textSecondary }]}>
              No credits needed
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderStep2 = () => {
    return (
      <>
        {selectedVideo ? (
          <>
            {renderVideoPreview()}
            
            <View style={[styles.inputContainer, {
              backgroundColor: colors.surface,
              borderColor: colors.cardBorder
            }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Source Language</Text>
              
              <View style={[styles.searchContainer, { 
                backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#F3F4F6'
              }]}>
                <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Search languages..."
                  placeholderTextColor={colors.textSecondary}
                  value={languageSearch}
                  onChangeText={setLanguageSearch}
                />
                {languageSearch ? (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => setLanguageSearch('')}
                  >
                    <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                ) : null}
              </View>

              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.languageScroll}
              >
                {filteredSourceLanguages.map((lang) => (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.languageButton,
                      uploadState.sourceLanguage === lang.code && {
                        backgroundColor: colors.primary,
                        borderColor: colors.primary
                      }
                    ]}
                    onPress={() => handleSourceLanguageChange(lang.code)}
                  >
                    <Text style={[
                      styles.languageButtonText,
                      { color: uploadState.sourceLanguage === lang.code ? '#FFFFFF' : colors.text }
                    ]}>
                      {lang.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={[styles.inputContainer, {
              backgroundColor: colors.surface,
              borderColor: colors.cardBorder
            }]}>
              <View style={styles.captionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Caption</Text>
                <Text style={[styles.characterCount, { color: colors.textSecondary }]}>
                  {uploadState.caption.length}/2200
                </Text>
              </View>
              <TextInput
                style={[styles.captionInput, { 
                  color: colors.text,
                  backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#F3F4F6'
                }]}
                placeholder="Write a caption..."
                placeholderTextColor={colors.textSecondary}
                value={uploadState.caption}
                onChangeText={handleCaptionChange}
                multiline
                maxLength={2200}
                textAlignVertical="top"
              />
            </View>
          </>
        ) : (
          <View style={[styles.uploadArea, { 
            backgroundColor: colors.surface,
            borderColor: colors.border
          }]}>
            <MaterialCommunityIcons 
              name="cloud-upload-outline" 
              size={48} 
              color={colors.primary} 
            />
            <Text style={[styles.uploadTitle, { color: colors.text }]}>
              Select a Video to {uploadState.translationType === 'dubbing' ? 'Dub' : uploadState.translationType === 'subtitles' ? 'Subtitle' : 'Schedule'}
            </Text>
            <Text style={[styles.uploadSubtitle, { color: colors.textSecondary }]}>
              Upload an MP4 or MOV file (max 90 seconds)
            </Text>
            <Button
              title="Select Video"
              onPress={pickVideo}
              variant="primary"
              leftIcon="video-plus"
            />
          </View>
        )}

        <View style={styles.footer}>
          <Button
            title="Continue"
            onPress={goToNextStep}
            variant="primary"
            disabled={!selectedVideo || !uploadState.sourceLanguage}
          />
        </View>
      </>
    );
  };

  const renderStep3 = () => {
    if (!selectedVideo) return null;

    const videoCreditsNeeded = uploadState.targetLanguages.length * (uploadState.translationType === 'dubbing' ? 1 : 0.2);

    return (
      <>
        {renderVideoPreview()}
        
        <View style={[styles.inputContainer, {
          backgroundColor: colors.surface,
          borderColor: colors.cardBorder
        }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Target Languages</Text>
          
          <View style={[styles.searchContainer, { 
            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#F3F4F6'
          }]}>
            <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search languages..."
              placeholderTextColor={colors.textSecondary}
              value={languageSearch}
              onChangeText={setLanguageSearch}
            />
            {languageSearch ? (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setLanguageSearch('')}
              >
                <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.languageScroll}
          >
            {filteredTargetLanguages.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageButton,
                  uploadState.targetLanguages.includes(lang.code) && {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary
                  }
                ]}
                onPress={() => handleTargetLanguageChange(lang.code)}
              >
                <Text style={[
                  styles.languageButtonText,
                  { color: uploadState.targetLanguages.includes(lang.code) ? '#FFFFFF' : colors.text }
                ]}>
                  {lang.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={[styles.creditNotice, { backgroundColor: colors.cardBackground }]}>
            <MaterialCommunityIcons name="information" size={20} color={colors.primary} />
            <Text style={[styles.creditText, { color: colors.text }]}>
              This will consume {videoCreditsNeeded} {videoCreditsNeeded === 1 ? 'credit' : 'credits'}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            title="Continue"
            onPress={goToNextStep}
            variant="primary"
            disabled={uploadState.targetLanguages.length === 0}
          />
        </View>
      </>
    );
  };

  const renderStep4 = () => {
    if (!selectedVideo) return null;

    return (
      <>
        <View style={[styles.inputContainer, {
          backgroundColor: colors.surface,
          borderColor: colors.cardBorder
        }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Delivery Options</Text>
          
          <View style={styles.deliveryOptions}>
            <TouchableOpacity
              style={[
                styles.deliveryOption,
                uploadState.deliveryOption === 'post' && styles.selectedDeliveryOption,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: uploadState.deliveryOption === 'post' ? colors.primary : colors.border
                }
              ]}
              onPress={() => setUploadState(prev => ({ ...prev, deliveryOption: 'post' }))}
            >
              <View style={styles.deliveryIconContainer}>
                <MaterialCommunityIcons
                  name="instagram"
                  size={24}
                  color={uploadState.deliveryOption === 'post' ? colors.primary : colors.text}
                />
              </View>
              <Text style={[
                styles.deliveryTitle,
                { color: uploadState.deliveryOption === 'post' ? colors.primary : colors.text }
              ]}>
                Post Now
              </Text>
              <Text style={[styles.deliveryDescription, { color: colors.textSecondary }]}>
                Post directly to Instagram Reels
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.deliveryOption,
                uploadState.deliveryOption === 'schedule' && styles.selectedDeliveryOption,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: uploadState.deliveryOption === 'schedule' ? colors.primary : colors.border
                }
              ]}
              onPress={() => setUploadState(prev => ({ ...prev, deliveryOption: 'schedule' }))}
            >
              <View style={styles.deliveryIconContainer}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={24}
                  color={uploadState.deliveryOption === 'schedule' ? colors.primary : colors.text}
                />
              </View>
              <Text style={[
                styles.deliveryTitle,
                { color: uploadState.deliveryOption === 'schedule' ? colors.primary : colors.text }
              ]}>
                Schedule Post
              </Text>
              <Text style={[styles.deliveryDescription, { color: colors.textSecondary }]}>
                Choose when to publish
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.deliveryOption,
                uploadState.deliveryOption === 'download' && styles.selectedDeliveryOption,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: uploadState.deliveryOption === 'download' ? colors.primary : colors.border
                }
              ]}
              onPress={() => setUploadState(prev => ({ ...prev, deliveryOption: 'download' }))}
            >
              <View style={styles.deliveryIconContainer}>
                <MaterialCommunityIcons
                  name="download-outline"
                  size={24}
                  color={uploadState.deliveryOption === 'download' ? colors.primary : colors.text}
                />
              </View>
              <Text style={[
                styles.deliveryTitle,
                { color: uploadState.deliveryOption === 'download' ? colors.primary : colors.text }
              ]}>
                Download Video
              </Text>
              <Text style={[styles.deliveryDescription, { color: colors.textSecondary }]}>
                Save video with translations
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            title="Continue"
            onPress={goToNextStep}
            variant="primary"
            disabled={!uploadState.deliveryOption}
          />
        </View>
      </>
    );
  };

  const renderStep5 = () => {
    if (!selectedVideo) return null;

    const getLanguageName = (code: string) => {
      const language = AVAILABLE_LANGUAGES.find(lang => lang.code === code);
      return language ? language.name : code;
    };

    return (
      <>
        <View style={[styles.inputContainer, {
          backgroundColor: colors.surface,
          borderColor: colors.cardBorder
        }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Review Your Post</Text>
          
          <View style={styles.reviewSection}>
            <View style={styles.reviewItem}>
              <MaterialCommunityIcons 
                name={uploadState.translationType === 'dubbing' ? 'account-voice' : 
                     uploadState.translationType === 'subtitles' ? 'subtitles-outline' : 
                     'calendar-clock'} 
                size={20} 
                color={colors.textSecondary} 
              />
              <View style={styles.reviewContent}>
                <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Translation Type</Text>
                <Text style={[styles.reviewValue, { color: colors.text }]}>
                  {uploadState.translationType === 'dubbing' ? 'Dubbing' :
                   uploadState.translationType === 'subtitles' ? 'Subtitles' :
                   'Schedule Only'}
                </Text>
              </View>
            </View>

            <View style={styles.reviewItem}>
              <MaterialCommunityIcons name="video" size={20} color={colors.textSecondary} />
              <View style={styles.reviewContent}>
                <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Video</Text>
                <Text style={[styles.reviewValue, { color: colors.text }]}>
                  {selectedVideo.name} ({Math.round(selectedVideo.duration)}s)
                </Text>
              </View>
            </View>

            <View style={styles.reviewItem}>
              <MaterialCommunityIcons name="translate" size={20} color={colors.textSecondary} />
              <View style={styles.reviewContent}>
                <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Source Language</Text>
                <Text style={[styles.reviewValue, { color: colors.text }]}>
                  {getLanguageName(uploadState.sourceLanguage)}
                </Text>
              </View>
            </View>

            <View style={styles.reviewItem}>
              <MaterialCommunityIcons name="translate" size={20} color={colors.textSecondary} />
              <View style={styles.reviewContent}>
                <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Target Languages</Text>
                <Text style={[styles.reviewValue, { color: colors.text }]}>
                  {uploadState.targetLanguages.map(getLanguageName).join(', ')}
                </Text>
              </View>
            </View>

            <View style={styles.reviewItem}>
              <MaterialCommunityIcons name="text" size={20} color={colors.textSecondary} />
              <View style={styles.reviewContent}>
                <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Caption</Text>
                <Text style={[styles.reviewValue, { color: colors.text }]} numberOfLines={2}>
                  {uploadState.caption || 'No caption added'}
                </Text>
              </View>
            </View>

            <View style={styles.reviewItem}>
              <MaterialCommunityIcons 
                name={uploadState.deliveryOption === 'post' ? 'instagram' : 
                     uploadState.deliveryOption === 'schedule' ? 'clock-outline' : 'download-outline'} 
                size={20} 
                color={colors.textSecondary} 
              />
              <View style={styles.reviewContent}>
                <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Delivery</Text>
                <Text style={[styles.reviewValue, { color: colors.text }]}>
                  {uploadState.deliveryOption === 'post' ? 'Post Now' :
                   uploadState.deliveryOption === 'schedule' ? 'Schedule Post' : 'Download Video'}
                </Text>
              </View>
            </View>

            <View style={styles.reviewItem}>
              <MaterialCommunityIcons name="cog" size={20} color={colors.textSecondary} />
              <View style={styles.reviewContent}>
                <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Options</Text>
                <Text style={[styles.reviewValue, { color: colors.text }]}>
                  {[
                    uploadState.translateCaptions ? 'Translate captions' : null,
                  ].filter(Boolean).join(', ') || 'Default settings'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            title={uploadState.deliveryOption === 'post' ? 'Upload & Post' :
                  uploadState.deliveryOption === 'schedule' ? 'Schedule Post' : 'Download Video'}
            onPress={() => {
              if (!selectedVideo || !uploadState.sourceLanguage || !uploadState.targetLanguages.length) {
                Alert.alert('Missing Information', 
                  'Please ensure you have selected a video, source language, and at least one target language.');
                return;
              }
              
              if (uploadState.deliveryOption === 'download' && uploadState.translationType === 'subtitles') {
                processVideoWithSubtitles();
              } else {
                // Handle other delivery options
                console.log('Processing video with settings:', { uploadState, selectedVideo });
              }
            }}
            variant="primary"
            leftIcon={uploadState.deliveryOption === 'post' ? 'upload' :
                     uploadState.deliveryOption === 'schedule' ? 'clock-outline' : 'download'}
          />
        </View>
      </>
    );
  };

  const handleSwipeRight = ({ nativeEvent }: FlingGestureHandlerStateChangeEvent) => {
    if (nativeEvent.state === State.END && currentStep > 1) {
      goToPreviousStep();
    }
  };

  const handleUploadComplete = async (videoId: string) => {
    Alert.alert('Success', `Video uploaded with ID: ${videoId}`);
    
    // Start polling for status
    try {
      const status = await videoService.getVideoStatus(videoId);
      console.log('Initial video status:', status);
    } catch (error) {
      console.error('Error checking status:', error);
    }
  };

  const handleError = (error: string) => {
    Alert.alert('Error', error);
  };

  const renderProcessingModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isProcessing}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.processingModal, { 
          backgroundColor: colors.surface,
          borderColor: colors.border
        }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.processingTitle, { color: colors.text }]}>
            Processing Video
          </Text>
          <Text style={[styles.processingSubtitle, { color: colors.textSecondary }]}>
            {processingError ? 'Error: ' + processingError : 'Please wait while we process your video...'}
          </Text>
          {!processingError && (
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    backgroundColor: colors.primary,
                    width: `${processingProgress}%` 
                  }
                ]} 
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  const downloadVideo = async (videoUrl: string, filename: string) => {
    try {
      const downloadResumable = FileSystem.createDownloadResumable(
        videoUrl,
        FileSystem.documentDirectory + filename,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          setProcessingProgress(90 + (progress * 10)); // Last 10% of the progress bar
        }
      );

      const result = await downloadResumable.downloadAsync();
      if (!result) throw new Error('Download failed');
      return result.uri;
    } catch (error) {
      console.error('Download error:', error);
      throw error;
    }
  };

  const processVideoWithSubtitles = async () => {
    if (!selectedVideo) return;

    // Add debug logging
    console.log('Debug - Processing video with:', {
      videoName: selectedVideo?.name,
      sourceLanguage: uploadState.sourceLanguage,
      targetLanguages: uploadState.targetLanguages,
      hasVideo: !!selectedVideo,
      videoDetails: selectedVideo,
      fullUploadState: uploadState,
    });

    setIsProcessing(true);
    setProcessingProgress(0);
    setProcessingError(null);

    try {
      // Step 1: Get presigned URL
      setProcessingProgress(10);
      const uploadUrlResponse = await videoService.getUploadUrl({
        fileName: selectedVideo.name,
        fileType: 'video/mp4',
      });

      console.log('Debug - Upload URL Response:', uploadUrlResponse);

      // Step 2: Upload to S3
      setProcessingProgress(20);
      await videoService.uploadToS3(
        uploadUrlResponse.uploadUrl,
        {
          uri: selectedVideo.uri,
          type: 'video/mp4',
          name: selectedVideo.name,
        },
        {
          onProgress: (progress: number) => {
            // Update progress from 20% to 70% during upload
            setProcessingProgress(20 + (progress * 50));
          }
        }
      );

      // Get videoId from upload response
      const videoId = uploadUrlResponse.videoId;
      setProcessingProgress(70);

      // Start subtitle processing
      const processResponse = await fetch(`${config.api.baseUrl}/v1/videos/${videoId}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceLanguage: uploadState.sourceLanguage,
          targetLanguages: uploadState.targetLanguages,
          translationType: 'subtitles',
          caption: uploadState.caption,
        }),
      });

      if (!processResponse.ok) {
        throw new Error('Failed to process video');
      }

      setProcessingProgress(80);

      // Poll for status until complete
      let status = 'processing';
      while (status === 'processing') {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Poll every 2 seconds

        const statusResponse = await fetch(`${config.api.baseUrl}/v1/videos/${videoId}/status`);
        const statusData = await statusResponse.json();
        
        if (statusData.status === 'completed') {
          status = 'completed';
          setProcessingProgress(90); // Save last 10% for download progress
        } else if (statusData.status === 'failed') {
          throw new Error(statusData.error || 'Processing failed');
        } else {
          setProcessingProgress(70 + (statusData.progress || 0) * 0.2); // Use 20% for processing
        }
      }

      // Download the processed video
      const downloadUrl = `${config.api.baseUrl}/v1/videos/${videoId}/download`;
      const filename = `subtitled_${selectedVideo.name}`;
      const localUri = await downloadVideo(downloadUrl, filename);

      Alert.alert(
        'Download Complete',
        `Video saved to: ${localUri}`,
        [
          {
            text: 'OK',
            onPress: () => {
              setIsProcessing(false);
              setProcessingProgress(0);
            }
          }
        ]
      );

    } catch (error: any) {
      console.error('Processing error:', error);
      setProcessingError(error.message || 'Failed to process video');
    } finally {
      if (processingError) {
        setTimeout(() => {
          setIsProcessing(false);
          setProcessingProgress(0);
          setProcessingError(null);
        }, 2000);
      }
    }
  };

  const renderSubtitleStyleStep = () => {
    if (!selectedVideo) return null;

    // Get first target language for preview
    const previewLanguage = uploadState.targetLanguages[0];
    
    return (
      <View style={styles.container}>
        <Text style={styles.stepTitle}>Customize Subtitles</Text>
        <SubtitleStyler
          style={subtitleStyle}
          onChange={setSubtitleStyle}
          onPreview={handlePreview}
          sourceLanguage={uploadState.sourceLanguage}
          targetLanguage={previewLanguage}
          previewText="This is a sample subtitle text for preview"
        />
      </View>
    );
  };

  const handlePreview = async () => {
    if (!selectedVideo) return;
    
    // Generate a preview frame with the current subtitle style
    try {
      const response = await videoService.generateSubtitlePreview({
        videoId: selectedVideo.id,
        subtitleStyle,
        timestamp: selectedVideo.duration / 2, // Preview middle of video
        sourceLanguage: uploadState.sourceLanguage,
        targetLanguage: uploadState.targetLanguages[0],
        previewText: "This is a sample subtitle text for preview"
      });
      
      // Show preview image
      setPreviewImage(response.previewUrl);
    } catch (error) {
      console.error('Preview generation failed:', error);
      Alert.alert('Error', 'Failed to generate preview');
    }
  };

  return (
    <ErrorBoundary>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <FlingGestureHandler
            direction={Directions.RIGHT}
            onHandlerStateChange={handleSwipeRight}
          >
            <View style={styles.content}>
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  {currentStep > 1 && (
                    <TouchableOpacity
                      onPress={goToPreviousStep}
                      style={styles.backButton}
                    >
                      <MaterialCommunityIcons
                        name="chevron-left"
                        size={24}
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                  )}
                  <Text style={[styles.title, { color: colors.primary }]}>New Post</Text>
                  <Text style={[styles.stepIndicator, { color: colors.textSecondary }]}>
                    Step {currentStep} of {uploadState.translationType === 'subtitles' ? 6 : 5}
                  </Text>
                </View>
                <View style={styles.headerRight}>
                  <TierBadge tier={currentTierData.name} />
                </View>
              </View>

              <ScrollView 
                style={styles.scrollContent} 
                contentContainerStyle={styles.scrollContainer}
              >
                {currentStep === 1 ? (
                  renderStep1()
                ) : currentStep === 2 ? (
                  renderStep2()
                ) : currentStep === 3 ? (
                  uploadState.translationType === 'subtitles' ? 
                  renderStep3() :
                  renderStep3()
                ) : currentStep === 4 ? (
                  uploadState.translationType === 'subtitles' ? 
                  renderSubtitleStyleStep() :
                  renderStep4()
                ) : currentStep === 5 ? (
                  uploadState.translationType === 'subtitles' ? 
                  renderStep4() :
                  renderStep5()
                ) : currentStep === 6 ? (
                  renderStep5()
                ) : null}
              </ScrollView>
            </View>
          </FlingGestureHandler>
        </GestureHandlerRootView>
        {renderProcessingModal()}
      </SafeAreaView>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  stepIndicator: {
    fontSize: 14,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    padding: 16,
    minHeight: '100%',
  },
  uploadArea: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    marginVertical: 32,
  },
  uploadTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  uploadSubtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  videoPreviewContainer: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  videoDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  videoInfo: {
    flex: 1,
  },
  videoName: {
    fontSize: 16,
    fontWeight: '500',
  },
  videoMetadata: {
    fontSize: 13,
    marginTop: 2,
  },
  videoThumbnail: {
    width: '100%',
    height: 200,
    backgroundColor: '#F3F4F6',
  },
  thumbnailOptions: {
    padding: 16,
    gap: 16,
  },
  thumbnailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  thumbnailButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  footer: {
    marginTop: 24,
  },
  previewContainer: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  previewThumbnail: {
    width: '100%',
    height: 200,
    backgroundColor: '#F3F4F6',
  },
  inputContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  languageScroll: {
    marginHorizontal: -8,
    flexGrow: 0,
  },
  languageButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 2,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  languageButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  captionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  characterCount: {
    fontSize: 12,
  },
  captionInput: {
    minHeight: 120,
    padding: 12,
    borderRadius: 8,
    textAlignVertical: 'top',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    marginLeft: 8,
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
  optionContainer: {
    gap: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    marginRight: 12,
  },
  deliveryOptions: {
    gap: 12,
  },
  deliveryOption: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  selectedDeliveryOption: {
    borderWidth: 2,
  },
  deliveryIconContainer: {
    marginBottom: 12,
  },
  deliveryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  deliveryDescription: {
    fontSize: 14,
  },
  reviewSection: {
    gap: 16,
  },
  reviewItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  reviewContent: {
    flex: 1,
  },
  reviewLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  reviewValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  selectedLanguagesContainer: {
    gap: 12,
    marginBottom: 16,
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  languageLabel: {
    flex: 1,
    fontSize: 16,
  },
  creditNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  creditText: {
    flex: 1,
    fontSize: 14,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
  },
  translationOptions: {
    gap: 16,
  },
  translationOption: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
  },
  selectedTranslationOption: {
    borderWidth: 2,
  },
  translationIconContainer: {
    marginBottom: 16,
  },
  translationTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  translationDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  translationPricing: {
    fontSize: 13,
    fontWeight: '500',
  },
  processingModal: {
    padding: 24,
    borderRadius: 16,
    width: '80%',
    alignItems: 'center',
    borderWidth: 1,
  },
  processingTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  processingSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
}); 