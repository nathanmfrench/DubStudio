import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface TierBadgeProps {
  tier: string;
}

export const TierBadge = ({ tier }: TierBadgeProps) => (
  <View style={styles.tierBadge}>
    <Text style={styles.tierBadgeText}>{tier}</Text>
  </View>
);

const styles = StyleSheet.create({
  tierBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  tierBadgeText: {
    fontSize: 12,
    color: '#2171C1',
    fontWeight: '500',
  },
}); 