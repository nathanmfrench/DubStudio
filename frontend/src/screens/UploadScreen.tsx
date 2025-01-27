import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Platform, Alert, TextInput, Linking, Switch, Animated, LayoutAnimation } from 'react-native';
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

interface VideoSelection {
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
  targetLanguages: string[];
  translateCaptions: boolean;
  deliveryOption: 'post' | 'schedule' | 'download' | '';
  scheduledDate?: Date;
}

const AVAILABLE_LANGUAGES = [
  { code: 'en', name: 'English' },
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

export function UploadScreen() {
  const { currentTier } = useTier();
  const { colors, isDarkMode } = useTheme();
  const [selectedVideo, setSelectedVideo] = useState<VideoSelection | null>(null);
  const [useDefaultThumbnail, setUseDefaultThumbnail] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [animation] = useState(new Animated.Value(0));
  const [uploadState, setUploadState] = useState<UploadState>({
    sourceLanguage: '',
    caption: '',
    targetLanguages: [],
    translateCaptions: false,
    deliveryOption: '',
  });
  const [languageSearch, setLanguageSearch] = useState('');
  const navigation = useNavigation<NavigationProps>();

  useEffect(() => {
    Animated.timing(animation, {
      toValue: useDefaultThumbnail ? 0 : 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [useDefaultThumbnail]);

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
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
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

        try {
          const { uri: thumbnailUri } = await VideoThumbnails.getThumbnailAsync(asset.uri, {
            time: 0,
            quality: 0.5,
          });

          setSelectedVideo({
            name: asset.fileName || 'video',
            uri: asset.uri,
            duration: durationInSeconds,
            type: 'video/mp4',
            size: asset.fileSize || 0,
            thumbnailUri,
          });
          setUseDefaultThumbnail(true);
        } catch (error) {
          console.error('Error generating thumbnail:', error);
          setSelectedVideo({
            name: asset.fileName || 'video',
            uri: asset.uri,
            duration: durationInSeconds,
            type: 'video/mp4',
            size: asset.fileSize || 0,
          });
        }
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to select video. Please try again.');
    }
  };

  const pickThumbnail = async () => {
    if (useDefaultThumbnail) return;
    
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "DubStudio needs access to your media library to upload thumbnails.",
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
        const asset = result.assets[0];
        setSelectedVideo(prev => prev ? {
          ...prev,
          thumbnailUri: asset.uri
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

        {selectedVideo.thumbnailUri && (
          <Image
            source={{ uri: selectedVideo.thumbnailUri }}
            style={styles.videoThumbnail}
            resizeMode="cover"
          />
        )}

        <View style={styles.thumbnailOptions}>
          <View style={styles.thumbnailToggle}>
            <Text style={[styles.toggleLabel, { color: colors.textSecondary }]}>Use Custom Thumbnail</Text>
            <Switch
              value={!useDefaultThumbnail}
              onValueChange={(value) => {
                setUseDefaultThumbnail(!value);
                if (!value && selectedVideo.uri) {
                  VideoThumbnails.getThumbnailAsync(selectedVideo.uri, {
                    time: 0,
                    quality: 0.5,
                  }).then(({ uri }) => {
                    setSelectedVideo(prev => prev ? {
                      ...prev,
                      thumbnailUri: uri
                    } : null);
                  }).catch(error => {
                    console.error('Error generating default thumbnail:', error);
                  });
                }
              }}
              trackColor={{ false: isDarkMode ? '#374151' : '#E5E7EB', true: colors.primaryLight }}
              thumbColor={!useDefaultThumbnail ? colors.primary : (isDarkMode ? '#9CA3AF' : '#6B7280')}
            />
          </View>

          <Animated.View style={{
            maxHeight: animation.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 48]
            }),
            opacity: animation,
            transform: [{
              translateY: animation.interpolate({
                inputRange: [0, 1],
                outputRange: [-10, 0]
              })
            }],
            overflow: 'hidden',
          }}>
            <Button
              title="Upload Custom Thumbnail"
              onPress={pickThumbnail}
              variant="primary"
              leftIcon="image-plus"
            />
          </Animated.View>
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
    if (currentStep < 5) {
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
    .filter(lang => lang.name.toLowerCase().includes(languageSearch.toLowerCase()))
    .sort((a, b) => {
      if (a.code === uploadState.sourceLanguage) return -1;
      if (b.code === uploadState.sourceLanguage) return 1;
      return a.name.localeCompare(b.name);
    });

  const filteredTargetLanguages = AVAILABLE_LANGUAGES
    .filter(lang => 
      lang.code !== uploadState.sourceLanguage && 
      lang.name.toLowerCase().includes(languageSearch.toLowerCase())
    )
    .sort((a, b) => {
      const aSelected = uploadState.targetLanguages.includes(a.code);
      const bSelected = uploadState.targetLanguages.includes(b.code);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return a.name.localeCompare(b.name);
    });

  const renderStep2 = () => {
    if (!selectedVideo) return null;

    return (
      <>
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

        <View style={styles.footer}>
          <Button
            title="Continue"
            onPress={goToNextStep}
            variant="primary"
            disabled={!uploadState.sourceLanguage}
          />
        </View>
      </>
    );
  };

  const renderStep3 = () => {
    if (!selectedVideo) return null;

    return (
      <>
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
        </View>

        <View style={[styles.inputContainer, {
          backgroundColor: colors.surface,
          borderColor: colors.cardBorder
        }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Translation Options</Text>
          
          <View style={styles.optionContainer}>
            <View style={styles.optionRow}>
              <Text style={[styles.optionText, { color: colors.text }]}>
                Translate captions to target languages
              </Text>
              <Switch
                value={uploadState.translateCaptions}
                onValueChange={(value) => setUploadState(prev => ({
                  ...prev,
                  translateCaptions: value
                }))}
                trackColor={{ false: isDarkMode ? '#374151' : '#E5E7EB', true: colors.primaryLight }}
                thumbColor={uploadState.translateCaptions ? colors.primary : (isDarkMode ? '#9CA3AF' : '#6B7280')}
              />
            </View>
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
                    !useDefaultThumbnail ? 'Custom thumbnail' : null
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
              // Handle upload/schedule/download based on deliveryOption
              console.log('Processing video with settings:', { uploadState, selectedVideo });
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

  return (
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
                  Step {currentStep} of 5
                </Text>
              </View>
              <View style={styles.headerRight}>
                <TierBadge tier={currentTier} />
              </View>
            </View>

            <ScrollView 
              style={styles.scrollContent} 
              contentContainerStyle={styles.scrollContainer}
            >
              {currentStep === 1 ? (
                !selectedVideo ? (
                  renderUploadArea()
                ) : (
                  <>
                    {renderVideoPreview()}
                    <View style={styles.footer}>
                      <Button
                        title="Continue"
                        onPress={goToNextStep}
                        variant="primary"
                        disabled={!selectedVideo.thumbnailUri}
                      />
                    </View>
                  </>
                )
              ) : currentStep === 2 ? (
                renderStep2()
              ) : currentStep === 3 ? (
                renderStep3()
              ) : currentStep === 4 ? (
                renderStep4()
              ) : currentStep === 5 ? (
                renderStep5()
              ) : null}
            </ScrollView>
          </View>
        </FlingGestureHandler>
      </GestureHandlerRootView>
    </SafeAreaView>
  );
}

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
  thumbnailToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    fontSize: 14,
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
}); 