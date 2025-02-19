import React from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';

interface Position {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PositionPickerProps {
  value: Position;
  onChange: (position: Position) => void;
}

const GRID_SIZE = 3;
const DEFAULT_WIDTH = 100;
const DEFAULT_HEIGHT = 100;

export const PositionPicker: React.FC<PositionPickerProps> = ({
  value,
  onChange,
}) => {
  const handlePress = (row: number, col: number) => {
    const x = (col * 100) / (GRID_SIZE - 1);
    const y = (row * 100) / (GRID_SIZE - 1);
    onChange({
      x,
      y,
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
    });
  };

  const isSelected = (row: number, col: number) => {
    const x = (col * 100) / (GRID_SIZE - 1);
    const y = (row * 100) / (GRID_SIZE - 1);
    return Math.abs(value.x - x) < 10 && Math.abs(value.y - y) < 10;
  };

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {Array.from({ length: GRID_SIZE }).map((_, row) => (
          <View key={row} style={styles.row}>
            {Array.from({ length: GRID_SIZE }).map((_, col) => (
              <TouchableOpacity
                key={col}
                style={[
                  styles.cell,
                  isSelected(row, col) && styles.selectedCell,
                ]}
                onPress={() => handlePress(row, col)}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  grid: {
    width: 200,
    height: 200,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    gap: 16,
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  selectedCell: {
    borderColor: '#007AFF',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
});
