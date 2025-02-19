import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface FontPickerProps {
  value: string;
  onChange: (font: string) => void;
  fonts: string[];
}

export const FontPicker: React.FC<FontPickerProps> = ({
  value,
  onChange,
  fonts,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.fonts}>
        {fonts.map((font) => (
          <TouchableOpacity
            key={font}
            style={[
              styles.fontButton,
              value === font && styles.selectedFont,
            ]}
            onPress={() => onChange(font)}
          >
            <Text style={[
              styles.fontText,
              value === font && styles.selectedFontText,
              { fontFamily: font }
            ]}>
              {font}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  fonts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fontButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  selectedFont: {
    borderColor: '#007AFF',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  fontText: {
    fontSize: 14,
    color: '#374151',
  },
  selectedFontText: {
    color: '#007AFF',
    fontWeight: '600',
  },
}); 