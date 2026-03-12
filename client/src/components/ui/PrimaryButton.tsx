import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { theme } from '../../design-system/theme';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  leftIcon?: React.ReactNode;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  size = 'lg',
  style,
  leftIcon,
}) => {
  const buttonStyle = [
    styles.button,
    styles[variant],
    styles[`size_${size}`],
    (disabled || loading) && styles.disabled,
    style,
  ];

  const textStyle = [styles.text, styles[`${variant}Text`], styles[`text_${size}`]];

  const indicatorColor =
    variant === 'primary' || variant === 'danger'
      ? 'white'
      : theme.colors.primary[500];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={indicatorColor} size="small" />
      ) : (
        <>
          {leftIcon}
          <Text style={textStyle}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.l,
    gap: theme.spacing.s,
  },
  primary: {
    backgroundColor: theme.colors.primary[500],
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: theme.colors.primary[500],
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: theme.colors.danger,
  },
  disabled: {
    opacity: 0.5,
  },
  size_sm: {
    height: 38,
    paddingHorizontal: theme.spacing.m,
  },
  size_md: {
    height: 46,
    paddingHorizontal: theme.spacing.l,
  },
  size_lg: {
    height: 54,
    paddingHorizontal: theme.spacing.l,
  },
  text: {
    fontWeight: '600',
  },
  primaryText: {
    color: 'white',
    ...theme.typography.label,
    fontWeight: '600',
  },
  outlineText: {
    color: theme.colors.primary[500],
    ...theme.typography.label,
    fontWeight: '600',
  },
  ghostText: {
    color: theme.colors.primary[500],
    ...theme.typography.label,
    fontWeight: '600',
  },
  dangerText: {
    color: 'white',
    ...theme.typography.label,
    fontWeight: '600',
  },
  text_sm: {
    fontSize: 13,
  },
  text_md: {
    fontSize: 14,
  },
  text_lg: {
    fontSize: 15,
  },
});
