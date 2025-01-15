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

interface VideoSelection {
  uri: string;
  duration: number;
  type: string;
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

const AVAILABLE_LANGUAGES = [
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
];

const MAX_DURATION = 90; // 90 seconds max for Instagram Reels

const LANGUAGE_SUFFIXES = {
  es: 'espanol',
  fr: 'francais',
  de: 'deutsch',
  it: 'italiano',
  pt: 'portugues',
  hi: 'hindi',
  ja: 'nihongo',
  ko: 'hangugeo',
  zh: 'zhongwen',
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
                '#FFFFFF',
                '#F8FAFC',
                '#000000',
              ]}
              style={[StyleSheet.absoluteFill, styles.circleGradient]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <MaterialCommunityIcons 
              name="video-plus" 
              size={48} 
              color="#2171C1" 
              style={styles.uploadIcon}
            />
            <View style={styles.textButtonContainer}>
              <CurvedPath />
              <Text style={styles.uploadText}>Select a video to upload</Text>
              <Button
                title="Choose from Gallery"
                leftIcon="image-multiple"
                onPress={pickVideo}
                style={styles.button}
              />
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

  const renderCaptionDetails = () => (
    <View style={styles.content}>
      <View style={styles.detailsContainer}>
        <ScrollView style={styles.scrollContent}>
          <View style={styles.videoPreview}>
            <Image 
              source={{ uri: selectedVideo?.uri }} 
              style={styles.smallThumbnail}
              resizeMode="cover"
            />
          </View>
          
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
            title="Upload"
            leftIcon="cloud-upload"
            onPress={() => {}}
            style={styles.actionButton}
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
    color: '#6B7280',
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
  videoPreview: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallThumbnail: {
    width: 80,
    height: 45,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 12,
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
}); 