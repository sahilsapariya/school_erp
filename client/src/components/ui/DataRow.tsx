import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { theme } from '../../design-system/theme';
import { Icons } from '../../design-system/icons';

interface DataRowProps {
  title: string;
  subtitle?: string;
  description?: string;
  leftIcon?: React.ReactNode;
  rightComponent?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  noBorder?: boolean;
}

export const DataRow: React.FC<DataRowProps> = ({
  title,
  subtitle,
  description,
  leftIcon,
  rightComponent,
  onPress,
  style,
  noBorder = false,
}) => {
  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      style={[styles.container, !noBorder && styles.border, style]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.left}>
        {leftIcon && <View style={styles.icon}>{leftIcon}</View>}
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
          ) : null}
          {description ? (
            <Text style={styles.description} numberOfLines={2}>{description}</Text>
          ) : null}
        </View>
      </View>
      <View style={styles.right}>
        {rightComponent}
        {onPress && !rightComponent ? (
          <Icons.ChevronRight size={18} color={theme.colors.text[400]} />
        ) : null}
      </View>
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  border: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: theme.spacing.sm,
    width: 42,
    height: 42,
    borderRadius: theme.radius.l,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textContainer: {
    flex: 1,
    paddingRight: theme.spacing.s,
  },
  title: {
    ...theme.typography.body,
    fontWeight: '500',
    color: theme.colors.text[900],
  },
  subtitle: {
    ...theme.typography.caption,
    color: theme.colors.text[500],
    marginTop: 2,
  },
  description: {
    ...theme.typography.caption,
    color: theme.colors.text[500],
    marginTop: 2,
    lineHeight: 16,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    flexShrink: 0,
  },
});
