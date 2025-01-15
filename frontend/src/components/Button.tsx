import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
  Platform,
} from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'text';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  fullWidth?: boolean;
}

export function Button({
  onPress,
  title,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = false,
}: ButtonProps) {
  const getButtonHeight = (size: ButtonSize) => {
    switch (size) {
      case 'small':
        return 36;
      case 'large':
        return 56;
      default:
        return 48;
    }
  };

  const getFontSize = (size: ButtonSize) => {
    switch (size) {
      case 'small':
        return 14;
      case 'large':
        return 18;
      default:
        return 16;
    }
  };

  const buttonStyles = [
    styles.button,
    { height: getButtonHeight(size) },
    variant === 'text' && styles.textButton,
    fullWidth && styles.fullWidth,
    disabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    { fontSize: getFontSize(size) },
    styles[`${variant}Text`],
    disabled && styles.disabledText,
    textStyle,
  ];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[buttonStyles, variant === 'primary' && styles.primary, variant === 'secondary' && styles.secondary]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? '#FFFFFF' : '#2171C1'}
          size={size === 'small' ? 'small' : 'small'}
        />
      ) : (
        <Text style={textStyles}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  // Primary variant
  primary: {
    backgroundColor: '#2171C1',
  },
  primaryText: {
    color: '#FFFFFF',
  },
  // Secondary variant
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#2171C1',
  },
  secondaryText: {
    color: '#2171C1',
  },
  // Text variant
  textButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 8,
  },
  textText: {
    color: '#2171C1',
  },
  // Disabled state
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.5,
  },
}); 