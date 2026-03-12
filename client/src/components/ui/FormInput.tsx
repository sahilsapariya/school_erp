import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
  Animated,
} from 'react-native';
import { theme } from '../../design-system/theme';
import { Icons } from '../../design-system/icons';

interface FormInputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  showPasswordToggle?: boolean;
}

export const FormInput: React.FC<FormInputProps> = ({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  showPasswordToggle,
  secureTextEntry,
  style,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(borderAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: false,
    }).start();
    rest.onFocus?.({} as any);
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.timing(borderAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
    rest.onBlur?.({} as any);
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [error ? theme.colors.danger : theme.colors.border, theme.colors.primary[500]],
  });

  const isPassword = secureTextEntry || showPasswordToggle;

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Animated.View style={[styles.inputContainer, { borderColor }, error && styles.errorBorder]}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          style={[styles.input, leftIcon && styles.inputWithLeft, isPassword && styles.inputWithRight, style]}
          placeholderTextColor={theme.colors.text[400]}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={secureTextEntry && !showPassword}
          {...rest}
        />
        {showPasswordToggle ? (
          <TouchableOpacity
            style={styles.rightIcon}
            onPress={() => setShowPassword((v) => !v)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {showPassword ? (
              <Icons.EyeOff size={20} color={theme.colors.text[400]} />
            ) : (
              <Icons.Eye size={20} color={theme.colors.text[400]} />
            )}
          </TouchableOpacity>
        ) : rightIcon ? (
          <View style={styles.rightIcon}>{rightIcon}</View>
        ) : null}
      </Animated.View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hintText}>{hint}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: theme.spacing.m,
  },
  label: {
    ...theme.typography.label,
    color: theme.colors.text[700],
    marginBottom: theme.spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderRadius: theme.radius.l,
    minHeight: 52,
  },
  input: {
    flex: 1,
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.sm,
    ...theme.typography.body,
    color: theme.colors.text[900],
  },
  inputWithLeft: {
    paddingLeft: theme.spacing.xs,
  },
  inputWithRight: {
    paddingRight: theme.spacing.xs,
  },
  leftIcon: {
    paddingLeft: theme.spacing.m,
    paddingRight: theme.spacing.s,
  },
  rightIcon: {
    paddingRight: theme.spacing.m,
    paddingLeft: theme.spacing.s,
  },
  errorBorder: {
    borderColor: theme.colors.danger,
  },
  errorText: {
    ...theme.typography.caption,
    color: theme.colors.danger,
    marginTop: theme.spacing.xs,
  },
  hintText: {
    ...theme.typography.caption,
    color: theme.colors.text[500],
    marginTop: theme.spacing.xs,
  },
});
