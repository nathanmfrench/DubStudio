import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface TierBadgeProps {
  tier: string;
}

export const TierBadge = ({ tier }: TierBadgeProps) => {
  const { colors, isDarkMode } = useTheme();
  
  return (
    <View style={[
      styles.tierBadge,
      {
        backgroundColor: isDarkMode ? 'rgba(96, 165, 250, 0.1)' : '#EFF6FF',
        borderColor: colors.primary
      }
    ]}>
      <Text style={[styles.tierBadgeText, { color: colors.primary }]}>{tier}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  tierBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
}); 