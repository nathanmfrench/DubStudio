import React, { useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ColorPicker } from './ColorPicker';
import { CustomSlider as Slider } from './Slider';
import { FontPicker } from './FontPicker';
import { PositionPicker } from './PositionPicker';
import { SubtitleStyle } from 'infrastructure/lambda/src/types/video';
import debounce from 'lodash/debounce';

interface SubtitleStylerProps {
  style: SubtitleStyle;
  onChange: (style: SubtitleStyle) => void;
  onPreview: () => void;
  sourceLanguage: string;
  targetLanguage: string;
  previewText?: string;
}

export const SubtitleStyler: React.FC<SubtitleStylerProps> = ({
  style,
  onChange,
  onPreview,
  sourceLanguage,
  targetLanguage,
  previewText = 'Sample subtitle text'
}) => {
  // Create a debounced version of the preview function
  const debouncedPreview = useCallback(
    debounce(() => {
      onPreview();
    }, 500),
    [onPreview]
  );

  // Call the debounced preview whenever style changes
  useEffect(() => {
    debouncedPreview();
    // Cancel the debounced call when component unmounts
    return () => {
      debouncedPreview.cancel();
    };
  }, [style, debouncedPreview]);

  const handleStyleChange = (newStyle: Partial<SubtitleStyle>) => {
    onChange({ ...style, ...newStyle });
  };

  return (
    <View style={styles.container}>
      {/* Font Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Font</Text>
        <FontPicker
          value={style.fontType || 'Arial'}
          onChange={(font: string) => handleStyleChange({ fontType: font })}
          fonts={['Arial', 'Helvetica', 'Times New Roman', 'Courier New']}
        />
        <Slider
          label="Size"
          value={style.fontSize || 24}
          minimumValue={12}
          maximumValue={72}
          onValueChange={(size: number) => handleStyleChange({ fontSize: size })}
        />
      </View>

      {/* Color Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Colors</Text>
        <ColorPicker
          label="Font Color"
          value={style.fontColor || '#FFFFFF'}
          onChange={(color: string) => handleStyleChange({ fontColor: color })}
        />
        <ColorPicker
          label="Background"
          value={style.backgroundColor || '#000000'}
          onChange={(color: string) => handleStyleChange({ backgroundColor: color })}
        />
        <Slider
          label="Background Opacity"
          value={style.opacity || 0.8}
          minimumValue={0}
          maximumValue={1}
          step={0.1}
          onValueChange={(opacity: number) => handleStyleChange({ opacity })}
        />
      </View>

      {/* Position Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Position</Text>
        <PositionPicker
          value={style.position || { x: 50, y: 90, width: 100, height: 100 }}
          onChange={(position) => handleStyleChange({ position })}
        />
      </View>

      {/* Outline Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Outline</Text>
        <Slider
          label="Width"
          value={style.outline || 1}
          minimumValue={0}
          maximumValue={3}
          step={1}
          onValueChange={(outline: number) => handleStyleChange({ outline })}
        />
      </View>

      <TouchableOpacity style={styles.previewButton} onPress={onPreview}>
        <Text style={styles.previewButtonText}>Update Preview</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  previewButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  previewButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
