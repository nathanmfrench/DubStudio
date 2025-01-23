import * as Font from 'expo-font';
import { AntDesign, Entypo, Feather, FontAwesome, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

export const loadFonts = async () => {
  try {
    console.log('Starting font loading...');
    
    await Font.loadAsync({
      ...AntDesign.font,
      ...Entypo.font,
      ...Feather.font,
      ...FontAwesome.font,
      ...MaterialIcons.font,
      ...MaterialCommunityIcons.font
    });

    console.log('Fonts loaded successfully');
    return true;
  } catch (error) {
    console.error('Error loading fonts:', error);
    return false;
  }
}; 