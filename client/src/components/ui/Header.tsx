import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { theme } from '../../design-system/theme';
import { Icons } from '../../design-system/icons';

interface HeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
  onBack?: () => void;
  style?: ViewStyle;
  compact?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  rightAction,
  onBack,
  style,
  compact = false,
}) => {
  return (
    <View style={[styles.container, compact && styles.compact, style]}>
      <View style={styles.left}>
        {onBack && (
          <TouchableOpacity
            onPress={onBack}
            style={styles.backButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icons.ArrowLeft size={22} color={theme.colors.text[900]} />
          </TouchableOpacity>
        )}
        <View style={styles.titleBlock}>
          <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
          ) : null}
        </View>
      </View>
      {rightAction ? <View style={styles.right}>{rightAction}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.m,
    backgroundColor: theme.colors.background,
  },
  compact: {
    paddingVertical: theme.spacing.sm,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing.s,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.m,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text[900],
  },
  titleCompact: {
    ...theme.typography.h2,
  },
  subtitle: {
    ...theme.typography.caption,
    color: theme.colors.text[500],
    marginTop: 2,
  },
  right: {
    marginLeft: theme.spacing.m,
    flexShrink: 0,
  },
});
