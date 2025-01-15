import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { TextInput } from '../components/TextInput';
import { VideoThumbnail } from '../components/VideoThumbnail';
import { ListItem } from '../components/ListItem';
import { Feedback } from '../components/Feedback';
import { Modal } from '../components/Modal';

export function ComponentsPreview() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [search, setSearch] = useState('');
  const [username, setUsername] = useState('dubstudio');
  const [centerModalVisible, setCenterModalVisible] = useState(false);
  const [bottomModalVisible, setBottomModalVisible] = useState(false);
  const [fullModalVisible, setFullModalVisible] = useState(false);

  const handlePress = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Components Preview</Text>
        
        <SectionTitle title="Primary Buttons" />
        <View style={styles.section}>
          <View style={styles.buttonContainer}>
            <Button
              title="Large Primary Button"
              size="large"
              onPress={handlePress}
              loading={loading}
              fullWidth
            />
          </View>
          <View style={styles.buttonContainer}>
            <Button
              title="Medium Primary Button"
              onPress={handlePress}
              loading={loading}
            />
          </View>
          <View style={styles.buttonContainer}>
            <Button
              title="Small Primary Button"
              size="small"
              onPress={handlePress}
              loading={loading}
            />
          </View>
        </View>

        <SectionTitle title="Secondary Buttons" />
        <View style={styles.section}>
          <View style={styles.buttonContainer}>
            <Button
              title="Large Secondary Button"
              variant="secondary"
              size="large"
              onPress={() => {}}
              fullWidth
            />
          </View>
          <View style={styles.buttonContainer}>
            <Button
              title="Medium Secondary Button"
              variant="secondary"
              onPress={() => {}}
            />
          </View>
          <View style={styles.buttonContainer}>
            <Button
              title="Small Secondary Button"
              variant="secondary"
              size="small"
              onPress={() => {}}
            />
          </View>
        </View>

        <SectionTitle title="Text Buttons" />
        <View style={styles.section}>
          <View style={styles.buttonContainer}>
            <Button
              title="Large Text Button"
              variant="text"
              size="large"
              onPress={() => {}}
            />
          </View>
          <View style={styles.buttonContainer}>
            <Button
              title="Medium Text Button"
              variant="text"
              onPress={() => {}}
            />
          </View>
          <View style={styles.buttonContainer}>
            <Button
              title="Small Text Button"
              variant="text"
              size="small"
              onPress={() => {}}
            />
          </View>
        </View>

        <SectionTitle title="Disabled State" />
        <View style={styles.section}>
          <View style={styles.buttonContainer}>
            <Button
              title="Disabled Primary"
              disabled
              onPress={() => {}}
              fullWidth
            />
          </View>
          <View style={styles.buttonContainer}>
            <Button
              title="Disabled Secondary"
              variant="secondary"
              disabled
              onPress={() => {}}
              fullWidth
            />
          </View>
          <View style={styles.buttonContainer}>
            <Button
              title="Disabled Text"
              variant="text"
              disabled
              onPress={() => {}}
            />
          </View>
        </View>

        <SectionTitle title="Inputs" />
        <View style={styles.section}>
          <View style={styles.inputContainer}>
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              keyboardType="email-address"
              leftIcon="email"
            />
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
              leftIcon="lock"
            />
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              label="Search Videos"
              value={search}
              onChangeText={setSearch}
              placeholder="Search your videos..."
              leftIcon="magnify"
            />
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              label="TikTok Username"
              value={username}
              onChangeText={setUsername}
              placeholder="Enter your TikTok username"
              leftIcon="at"
              error="This field is required"
            />
          </View>
        </View>

        <SectionTitle title="Media" />
        <View style={styles.section}>
          <View style={styles.videoContainer}>
            <VideoThumbnail
              title="Original Video - How to make authentic Italian pasta"
              thumbnailUrl="https://picsum.photos/800/450"
              duration="3:45"
              status="original"
              onPress={() => {}}
            />
          </View>
          <View style={styles.videoContainer}>
            <VideoThumbnail
              title="Processing - Dubbing to Japanese"
              thumbnailUrl="https://picsum.photos/800/450?random=1"
              duration="2:30"
              status="processing"
              onPress={() => {}}
            />
          </View>
          <View style={styles.videoContainer}>
            <VideoThumbnail
              title="Completed - Italian Recipe (Hindi Version)"
              thumbnailUrl="https://picsum.photos/800/450?random=2"
              duration="3:45"
              status="dubbed"
              onPress={() => {}}
            />
          </View>
          <View style={styles.videoContainer}>
            <VideoThumbnail
              title="Failed - Audio quality too low"
              thumbnailUrl="https://picsum.photos/800/450?random=3"
              duration="1:15"
              status="error"
              onPress={() => {}}
            />
          </View>
        </View>

        <SectionTitle title="Feedback" />
        <View style={styles.section}>
          <View style={styles.feedbackContainer}>
            <Feedback
              type="success"
              message="Video uploaded successfully"
              description="Your video is now being processed for dubbing"
            />
          </View>
          <View style={styles.feedbackContainer}>
            <Feedback
              type="error"
              message="Upload failed"
              description="Please check your internet connection and try again"
            />
          </View>
          <View style={styles.feedbackContainer}>
            <Feedback
              type="info"
              message="Processing video"
              description="This might take a few minutes"
            />
          </View>
          <View style={styles.feedbackContainer}>
            <Feedback
              type="loading"
              message="Generating audio translations"
              description="Please don't close the app"
            />
          </View>
        </View>

        <SectionTitle title="Lists" />
        <View style={styles.section}>
          <View style={styles.listContainer}>
            <ListItem
              platform="tiktok"
              accountName="@cookingmaster"
              subtitle="Primary Account"
              status="connected"
              language="Hindi"
              onPress={() => {}}
            />
          </View>
          <View style={styles.listContainer}>
            <ListItem
              platform="instagram"
              accountName="@foodie_recipes"
              subtitle="Connecting..."
              status="pending"
              onPress={() => {}}
            />
          </View>
          <View style={styles.listContainer}>
            <ListItem
              platform="youtube"
              accountName="Cooking Channel"
              status="connected"
              language="Japanese"
              onPress={() => {}}
            />
          </View>
          <View style={styles.listContainer}>
            <ListItem
              platform="facebook"
              accountName="Recipe Page"
              subtitle="Authentication failed"
              status="error"
              onPress={() => {}}
            />
          </View>
        </View>

        <SectionTitle title="Modals" />
        <View style={styles.section}>
          <View style={styles.buttonContainer}>
            <Button
              title="Open Center Modal"
              onPress={() => setCenterModalVisible(true)}
            />
          </View>
          <View style={styles.buttonContainer}>
            <Button
              title="Open Bottom Sheet"
              onPress={() => setBottomModalVisible(true)}
            />
          </View>
          <View style={styles.buttonContainer}>
            <Button
              title="Open Full Modal"
              onPress={() => setFullModalVisible(true)}
            />
          </View>

          <Modal
            visible={centerModalVisible}
            onClose={() => setCenterModalVisible(false)}
            title="Confirmation"
            size="small"
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalText}>
                Are you sure you want to delete this video?
              </Text>
              <View style={styles.modalButtons}>
                <Button
                  title="Delete"
                  onPress={() => setCenterModalVisible(false)}
                />
                <View style={{ width: 12 }} />
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={() => setCenterModalVisible(false)}
                />
              </View>
            </View>
          </Modal>

          <Modal
            visible={bottomModalVisible}
            onClose={() => setBottomModalVisible(false)}
            title="Select Language"
            position="bottom"
            size="full"
          >
            <View style={styles.modalContent}>
              <ListItem
                platform="tiktok"
                accountName="Hindi"
                subtitle="India"
                status="connected"
                onPress={() => setBottomModalVisible(false)}
              />
              <View style={styles.modalDivider} />
              <ListItem
                platform="tiktok"
                accountName="Japanese"
                subtitle="Japan"
                status="connected"
                onPress={() => setBottomModalVisible(false)}
              />
              <View style={styles.modalDivider} />
              <ListItem
                platform="tiktok"
                accountName="Korean"
                subtitle="South Korea"
                status="disconnected"
                onPress={() => setBottomModalVisible(false)}
              />
            </View>
          </Modal>

          <Modal
            visible={fullModalVisible}
            onClose={() => setFullModalVisible(false)}
            title="Video Preview"
            size="large"
          >
            <View style={styles.modalContent}>
              <VideoThumbnail
                title="Original Video - How to make authentic Italian pasta"
                thumbnailUrl="https://picsum.photos/800/450"
                duration="3:45"
                status="original"
                onPress={() => {}}
              />
              <View style={styles.modalDivider} />
              <Feedback
                type="info"
                message="Processing video"
                description="This might take a few minutes"
              />
            </View>
          </Modal>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#2171C1',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 16,
    color: '#2171C1',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonContainer: {
    marginBottom: 12,
    alignItems: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  videoContainer: {
    marginBottom: 16,
  },
  listContainer: {
    marginBottom: 12,
  },
  feedbackContainer: {
    marginBottom: 12,
  },
  modalContent: {
    minWidth: '100%',
  },
  modalText: {
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 24,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
}); 