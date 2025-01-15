import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal as RNModal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ViewStyle,
  StyleProp,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ModalPosition = 'center' | 'bottom';
type ModalSize = 'small' | 'medium' | 'large' | 'full';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  position?: ModalPosition;
  size?: ModalSize;
  showCloseButton?: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Modal({
  visible,
  onClose,
  title,
  position = 'center',
  size = 'medium',
  showCloseButton = true,
  children,
  style,
}: ModalProps) {
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const getModalWidth = () => {
    switch (size) {
      case 'small':
        return Math.min(300, windowWidth - 32);
      case 'medium':
        return Math.min(400, windowWidth - 32);
      case 'large':
        return Math.min(600, windowWidth - 32);
      case 'full':
        return windowWidth;
      default:
        return Math.min(400, windowWidth - 32);
    }
  };

  const modalStyle = [
    styles.modal,
    position === 'bottom' && styles.bottomModal,
    size === 'full' && styles.fullModal,
    position === 'bottom' && { paddingBottom: insets.bottom },
    { width: getModalWidth() },
    style,
  ];

  return (
    <RNModal
      visible={visible}
      onRequestClose={onClose}
      transparent
      animationType={position === 'bottom' ? 'slide' : 'fade'}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
            <View style={modalStyle}>
              {(title || showCloseButton) && (
                <View style={styles.header}>
                  {title && <Text style={styles.title}>{title}</Text>}
                  {showCloseButton && (
                    <TouchableOpacity
                      onPress={onClose}
                      style={styles.closeButton}
                      hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                    >
                      <MaterialCommunityIcons
                        name="close"
                        size={24}
                        color="#6B7280"
                      />
                    </TouchableOpacity>
                  )}
                </View>
              )}
              <View style={styles.content}>{children}</View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  bottomModal: {
    position: 'absolute',
    bottom: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  fullModal: {
    minHeight: '50%',
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  closeButton: {
    marginLeft: 16,
  },
  content: {
    padding: 16,
  },
}); 