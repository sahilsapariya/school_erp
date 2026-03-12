import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../design-system/theme';

interface StatusBadgeProps {
  status: 'success' | 'warning' | 'danger' | 'info';
  label: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const getBackgroundColor = () => {
    switch (status) {
      case 'success':
        return theme.colors.success + '20'; // 20% opacity
      case 'warning':
        return theme.colors.warning + '20';
      case 'danger':
        return theme.colors.danger + '20';
      default:
        return theme.colors.primary[100];
    }
  };

  const getTextColor = () => {
    switch (status) {
      case 'success':
        return theme.colors.success;
      case 'warning':
        return theme.colors.warning;
      case 'danger':
        return theme.colors.danger;
      default:
        return theme.colors.primary[500];
    }
  };

  return (
    <View style={[styles.badge, { backgroundColor: getBackgroundColor() }]}>
      <Text style={[styles.text, { color: getTextColor() }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: theme.spacing.s,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
    alignSelf: 'flex-start',
  },
  text: {
    ...theme.typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});
