import React, { useEffect, useState } from 'react';
import { loadFonts } from './src/utils/loadFonts';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Amplify } from 'aws-amplify';
import * as awsconfig from './src/config/aws-config';
import { UploadScreen } from './src/screens/UploadScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { MaterialIcons } from '@expo/vector-icons';

// @ts-ignore - Ignoring AWS config type mismatch as it's configured correctly
Amplify.configure(awsconfig);

type RootTabParamList = {
  Upload: undefined;
  Profile: undefined;
};

type TabBarIconProps = {
  focused: boolean;
  color: string;
  size: number;
};

type RouteProps = {
  name: keyof RootTabParamList;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

type IconName = keyof typeof MaterialIcons.glyphMap;

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    const loadAppFonts = async () => {
      const success = await loadFonts();
      setFontsLoaded(success);
    };
    loadAppFonts();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }: { route: RouteProps }) => ({
          tabBarIcon: ({ focused, color, size }: TabBarIconProps) => {
            let iconName: IconName = 'add-circle-outline';

            if (route.name === 'Upload') {
              iconName = 'add-circle-outline';
            } else if (route.name === 'Profile') {
              iconName = 'person';
            }

            return <MaterialIcons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Upload" component={UploadScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
} 