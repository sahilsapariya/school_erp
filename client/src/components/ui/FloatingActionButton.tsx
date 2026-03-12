import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../design-system/theme';
import { Icons } from '../../design-system/icons';

interface FloatingActionButtonProps {
  onPress: () => void;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onPress,
  icon,
  style,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { bottom: Math.max(insets.bottom + theme.spacing.m, theme.spacing.xl) },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {icon ?? <Icons.Add size={26} color="white" />}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: theme.spacing.m,
    width: 56,
    height: 56,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.lg,
  },
});
