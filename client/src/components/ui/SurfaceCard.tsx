import React from 'react';
import { View, StyleSheet, ViewStyle, Text } from 'react-native';
import { theme } from '../../design-system/theme';

interface SurfaceCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  title?: string;
  rightAction?: React.ReactNode;
  padded?: boolean;
}

export const SurfaceCard: React.FC<SurfaceCardProps> = ({ children, style, title, rightAction, padded = true }) => {
  return (
    <View style={[styles.card, style]}>
      {(title || rightAction) ? (
        <View style={styles.titleRow}>
          {title ? <Text style={styles.cardTitle}>{title}</Text> : <View />}
          {rightAction ?? null}
        </View>
      ) : null}
      <View style={padded ? undefined : styles.noPad}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.m,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  noPad: {
    marginHorizontal: -theme.spacing.m,
    marginBottom: -theme.spacing.m,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.m,
  },
  cardTitle: {
    ...theme.typography.overline,
    color: theme.colors.text[500],
  },
});
