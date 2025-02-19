import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';

interface SliderProps {
  label: string;
  value: number;
  minimumValue: number;
  maximumValue: number;
  step?: number;
  onValueChange: (value: number) => void;
}

export const CustomSlider: React.FC<SliderProps> = ({
  label,
  value,
  minimumValue,
  maximumValue,
  step = 1,
  onValueChange,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
      <Slider
        style={styles.slider}
        value={value}
        minimumValue={minimumValue}
        maximumValue={maximumValue}
        step={step}
        onValueChange={onValueChange}
        minimumTrackTintColor="#007AFF"
        maximumTrackTintColor="#E5E7EB"
        thumbTintColor="#007AFF"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  value: {
    fontSize: 14,
    color: '#6B7280',
  },
  slider: {
    width: '100%',
    height: 40,
  },
}); 