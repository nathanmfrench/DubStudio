import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { ColorPicker } from '../ColorPicker';
import { Slider } from '../Slider';
import { FontPicker } from '../FontPicker';
import { PositionPicker } from '../PositionPicker';
import { SubtitleStyle } from '../../types/video';

interface SubtitleStylerProps {
  style: SubtitleStyle;
  onChange: (style: SubtitleStyle) => void;
  onPreview: () => void;
}

export const SubtitleStyler: React.FC<SubtitleStylerProps> = ({
  style,
  onChange,
  onPreview
}) => {
  return (
    <View style={styles.container}>
      {/* Font Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Font</Text>
        <FontPicker
          value={style.fontType}
          onChange={(font) => onChange({ ...style, fontType: font })}
          fonts={['Arial', 'Helvetica', 'Times New Roman', 'Courier New']}
        />
        <Slider
          label="Size"
          value={style.fontSize || 24}
          minimumValue={12}
          maximumValue={72}
          onValueChange={(size) => onChange({ ...style, fontSize: size })}
        />
      </View>

      {/* Color Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Colors</Text>
        <ColorPicker
          label="Font Color"
          value={style.fontColor || '#FFFFFF'}
          onChange={(color) => onChange({ ...style, fontColor: color })}
        />
        <ColorPicker
          label="Background"
          value={style.backgroundColor || '#000000'}
          onChange={(color) => onChange({ ...style, backgroundColor: color })}
        />
        <Slider
          label="Background Opacity"
          value={style.opacity || 0.8}
          minimumValue={0}
          maximumValue={1}
          step={0.1}
          onValueChange={(opacity) => onChange({ ...style, opacity: opacity })}
        />
      </View>

      {/* Position Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Position</Text>
        <PositionPicker
          value={style.position || { x: 50, y: 90 }}
          onChange={(position) => onChange({ ...style, position: position })}
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
          onValueChange={(outline) => onChange({ ...style, outline: outline })}
        />
      </View>

      <TouchableOpacity style={styles.previewButton} onPress={onPreview}>
        <Text style={styles.previewButtonText}>Preview</Text>
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
