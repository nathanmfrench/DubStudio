import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Platform, Alert, TextInput, Linking, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ListItem } from '../components/ListItem';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { facebookService } from '../services/FacebookService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

interface VideoSelection {
  uri: string;
  type: string;
  name: string;
  duration: number;
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
  const [selectedVideo, setSelectedVideo] = useState<VideoSelection | null>(null);
  const [caption, setCaption] = useState('');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const navigation = useNavigation<NavigationProps>();
  const [languageSearch, setLanguageSearch] = useState('');
  const [translateCaption, setTranslateCaption] = useState(true);
  const [autoGenerateSubtitles, setAutoGenerateSubtitles] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const loadAccounts = async () => {
    try {
      console.log('Loading connected accounts...');
      const saved = await AsyncStorage.getItem('connectedAccounts');
      console.log('Saved accounts:', saved);
      if (saved) {
        const accounts = JSON.parse(saved);
        console.log('Parsed accounts:', accounts);
        setConnectedAccounts(accounts);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      console.log('Screen focused, loading accounts...');
      loadAccounts();
    }, [])
  );

  const pickVideo = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('Media library permission status:', permission);
      
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
        mediaTypes: "videos",
        allowsEditing: true,
        quality: 1,
        videoMaxDuration: MAX_DURATION,
      });

      console.log('Image picker result:', result);

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
    }
  };

  const handleUpload = async () => {
    if (!selectedVideo) return;
    setIsUploading(true);
    // Upload logic here
    setIsUploading(false);
  };

  const handleLanguageToggle = (langCode: string) => {
    setSelectedLanguages(prev => 
      prev.includes(langCode) 
        ? prev.filter(code => code !== langCode)
        : [...prev, langCode]
    );
  };

  const filteredLanguages = AVAILABLE_LANGUAGES
    .filter(lang => lang.name.toLowerCase().includes(languageSearch.toLowerCase()))
    .sort((a, b) => {
      const aSelected = selectedLanguages.includes(a.code);
      const bSelected = selectedLanguages.includes(b.code);
      
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      
      return a.name.localeCompare(b.name);
    });

  const renderLanguageSelector = () => (
    <View style={styles.languageSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Target Languages</Text>
        <Text style={styles.languageCount}>
          {selectedLanguages.length} selected
        </Text>
      </View>
      
      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={16} color="#6B7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search languages..."
          value={languageSearch}
          onChangeText={setLanguageSearch}
          placeholderTextColor="#9CA3AF"
        />
        {languageSearch !== '' && (
          <TouchableOpacity 
            onPress={() => setLanguageSearch('')}
            style={styles.clearButton}
          >
            <MaterialCommunityIcons name="close-circle" size={16} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.languageList}
      >
        {filteredLanguages.map(lang => (
          <TouchableOpacity
            key={lang.code}
            style={[
              styles.languageChip,
              selectedLanguages.includes(lang.code) && styles.languageChipSelected
            ]}
            onPress={() => handleLanguageToggle(lang.code)}
          >
            <Text style={[
              styles.languageChipText,
              selectedLanguages.includes(lang.code) && styles.languageChipTextSelected
            ]}>
              {lang.name}
            </Text>
          </TouchableOpacity>
        ))}
        {filteredLanguages.length === 0 && (
          <Text style={styles.noResultsText}>No languages found</Text>
        )}
      </ScrollView>
    </View>
  );

  const renderUploadArea = () => (
    <TouchableOpacity 
      style={styles.uploadArea} 
      onPress={pickVideo}
      activeOpacity={0.7}
    >
      {selectedVideo ? (
        <>
          {selectedVideo.thumbnailUri ? (
            <Image
              source={{ uri: selectedVideo.thumbnailUri }}
              style={styles.thumbnail}
            />
          ) : (
            <View style={styles.placeholderThumbnail}>
              <MaterialCommunityIcons name="video" size={48} color="#2171C1" />
            </View>
          )}
          <Text style={styles.videoName}>{selectedVideo.name}</Text>
          <Text style={styles.videoDetails}>
            {Math.round(selectedVideo.duration)}s • {formatFileSize(selectedVideo.size)}
          </Text>
          <TouchableOpacity
            style={styles.changeButton}
            onPress={pickVideo}
          >
            <Text style={styles.changeButtonText}>Change Video</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <MaterialCommunityIcons name="cloud-upload" size={48} color="#2171C1" />
          <Text style={styles.uploadText}>Tap to select a video</Text>
          <Text style={styles.uploadSubtext}>MP4 format, max {MAX_DURATION} seconds</Text>
        </>
      )}
    </TouchableOpacity>
  );

  const handleConnectFacebook = async () => {
    setIsLoading(true);
    try {
      if (!facebookService.isInitialized()) {
        facebookService.initialize();
      }

      const loginResult = await facebookService.login();
      
      // Handle user cancellation
      if (!loginResult || !loginResult.accessToken) {
        setIsLoading(false);
        return; // Silently return without showing an error
      }

      const pages = await facebookService.getPages();

      if (!pages || pages.length === 0) {
        Alert.alert(
          'No Facebook Pages Found',
          'You need to have a Facebook Page to connect Instagram business accounts. Would you like to create one?',
          [
            {
              text: 'Create Page',
              onPress: () => Linking.openURL('https://www.facebook.com/pages/create'),
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        return;
      }

      const instagramAccounts = await Promise.all(
        pages.map(async (page) => {
          try {
            const instagramAccount = await facebookService.getInstagramBusinessAccount(page.id);
            return { pageId: page.id, pageName: page.name, instagramAccount };
          } catch (error) {
            console.error(`Error fetching Instagram account for page ${page.name}:`, error);
            return { pageId: page.id, pageName: page.name, instagramAccount: null };
          }
        })
      );

      const connectedAccounts = instagramAccounts.filter(acc => acc.instagramAccount);

      if (connectedAccounts.length === 0) {
        Alert.alert(
          'No Instagram Business Accounts',
          'Would you like to connect an Instagram account to one of your Facebook pages?',
          [
            {
              text: 'Connect Instagram',
              onPress: () => Linking.openURL('https://business.facebook.com/settings/instagram'),
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        return;
      }

      const updatedAccounts = connectedAccounts.map(acc => ({
        platform: 'instagram' as const,
        username: acc.instagramAccount?.username || '',
        isConnected: true,
        accessToken: loginResult.accessToken,
        userId: acc.instagramAccount?.id || '',
        pageId: acc.pageId,
        pageName: acc.pageName,
      }));

      setConnectedAccounts(updatedAccounts);
      
      // Store accounts in AsyncStorage for persistence
      await AsyncStorage.setItem('connectedAccounts', JSON.stringify(updatedAccounts));

      Alert.alert(
        'Success',
        `Connected ${updatedAccounts.length} Instagram business account${updatedAccounts.length > 1 ? 's' : ''}.`
      );

    } catch (error) {
      console.error('Connection error:', error);
      // Only show alert for non-cancellation errors
      if (error instanceof Error && !error.message.includes('cancelled')) {
        Alert.alert('Error', 'Failed to connect accounts. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Upload</Text>
        </View>
        
        {!selectedVideo ? (
          <View style={styles.centerContainer}>
            {renderUploadArea()}
          </View>
        ) : (
          <>
            <ScrollView style={styles.content}>

              {renderUploadArea()}

              {renderLanguageSelector()}

              <View style={styles.captionContainer}>
                <View style={styles.captionHeader}>
                  <Text style={styles.sectionTitle}>Caption</Text>
                  <View style={styles.translateToggle}>
                    <Text style={styles.toggleLabel}>Translate</Text>
                    <Switch
                      value={translateCaption}
                      onValueChange={setTranslateCaption}
                      trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
                      thumbColor={translateCaption ? '#2171C1' : '#9CA3AF'}
                    />
                  </View>
                </View>
                <TextInput
                  style={styles.captionInput}
                  placeholder="Write a caption..."
                  value={caption}
                  onChangeText={setCaption}
                  multiline
                  maxLength={2200}
                />
                {translateCaption && (
                  <View style={styles.captionHint}>
                    <MaterialCommunityIcons name="translate" size={16} color="#6B7280" />
                    <Text style={styles.hintText}>
                      Your caption will be translated into: {selectedLanguages.length > 0 
                        ? selectedLanguages.map(code => 
                            AVAILABLE_LANGUAGES.find(lang => lang.code === code)?.name
                          ).join(', ')
                        : 'No languages selected'}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.subtitlesContainer}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Subtitles</Text>
                  <View style={styles.translateToggle}>
                    <Text style={styles.toggleLabel}>Auto-Generate</Text>
                    <Switch
                      value={autoGenerateSubtitles}
                      onValueChange={setAutoGenerateSubtitles}
                      trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
                      thumbColor={autoGenerateSubtitles ? '#2171C1' : '#9CA3AF'}
                    />
                  </View>
                </View>
                
                <View style={styles.subtitlesButtonContainer}>
                  <Button
                    title="Subtitle Editor"
                    onPress={() => console.log('clicked subtitle editor button')}
                    variant="secondary"
                  />
                </View>
              </View>

              <View style={styles.accountsSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Post to Accounts</Text>
                  <TouchableOpacity onPress={handleConnectFacebook}>
                    <Text style={styles.addAccountText}>Add Account</Text>
                  </TouchableOpacity>
                </View>
                
                {connectedAccounts.length > 0 ? (
                  <View style={styles.accountsList}>
                    {connectedAccounts.map((account, index) => (
                      <View key={account.userId || index} style={styles.accountItem}>
                        <ListItem
                          accountName={account.username}
                          subtitle={`Connected via ${account.pageName}`}
                          status="connected"
                        />
                      </View>
                    ))}
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.noAccountsButton}
                    onPress={handleConnectFacebook}
                  >
                    <MaterialCommunityIcons name="account-plus" size={24} color="#2171C1" />
                    <Text style={styles.noAccountsText}>Connect an account to post</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>

            <View style={styles.footer}>
              <Button
                title={isUploading ? "Uploading..." : "Upload Video"}
                onPress={handleUpload}
                loading={isUploading}
                disabled={connectedAccounts.length === 0 || selectedLanguages.length === 0}
              />
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2171C1',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  uploadArea: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    minHeight: 200,
    width: '100%',
    maxWidth: 400,
  },
  thumbnail: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    marginBottom: 12,
  },
  placeholderThumbnail: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginTop: 12,
  },
  uploadSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  videoName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  videoDetails: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  changeButton: {
    marginTop: 12,
    padding: 8,
  },
  changeButtonText: {
    color: '#2171C1',
    fontSize: 14,
    fontWeight: '500',
  },
  captionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  captionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  captionInput: {
    fontSize: 16,
    color: '#1F2937',
    minHeight: 100,
    textAlignVertical: 'top',
    padding: 0,
  },
  accountsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addAccountText: {
    color: '#2171C1',
    fontSize: 14,
    fontWeight: '500',
  },
  accountsList: {
    gap: 12,
  },
  accountItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    overflow: 'hidden',
  },
  noAccountsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    gap: 8,
  },
  noAccountsText: {
    color: '#2171C1',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  languageSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  languageList: {
    paddingVertical: 8,
    gap: 8,
  },
  languageChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  languageChipSelected: {
    backgroundColor: '#2171C1',
  },
  languageChipText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  languageChipTextSelected: {
    color: '#FFFFFF',
  },
  languageCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    marginTop: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    paddingHorizontal: 8,
    paddingVertical: 0,
    height: 20,
  },
  clearButton: {
    padding: 2,
  },
  noResultsText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  captionHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  hintText: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  translateToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  subtitlesContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  subtitlesButtonContainer: {
    gap: 12,
    marginTop: 12,
  },
}); 