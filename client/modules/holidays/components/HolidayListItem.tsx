import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '@/src/design-system/theme';
import { Icons } from '@/src/design-system/icons';
import { Holiday, HOLIDAY_TYPE_LABELS, HOLIDAY_TYPE_COLORS } from '../types';

interface HolidayListItemProps {
  holiday: Holiday;
  onEdit?: (holiday: Holiday) => void;
  onDelete?: (holiday: Holiday) => void;
  canManage?: boolean;
}

function formatDateRange(h: Holiday): string {
  if (h.is_recurring) return `Every ${h.recurring_day_name}`;
  if (!h.start_date) return '';
  if (h.is_single_day || !h.end_date || h.start_date === h.end_date) return formatDate(h.start_date);
  return `${formatDate(h.start_date)} – ${formatDate(h.end_date)}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export const HolidayListItem: React.FC<HolidayListItemProps> = ({
  holiday, onEdit, onDelete, canManage = false,
}) => {
  const typeColor = HOLIDAY_TYPE_COLORS[holiday.holiday_type] ?? theme.colors.text[700];
  const typeLabel = HOLIDAY_TYPE_LABELS[holiday.holiday_type] ?? holiday.holiday_type;
  const dateRange = formatDateRange(holiday);

  return (
    <View style={styles.container}>
      <View style={[styles.accentBar, { backgroundColor: typeColor }]} />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={styles.titleRow}>
            {holiday.is_recurring && (
              <Icons.Refresh size={13} color={theme.colors.text[500]} style={{ marginRight: 4 }} />
            )}
            <Text style={styles.name} numberOfLines={1}>{holiday.name}</Text>
          </View>
          {canManage && (
            <View style={styles.actions}>
              {onEdit && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => onEdit(holiday)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
                >
                  <Icons.Edit size={15} color={theme.colors.text[500]} />
                </TouchableOpacity>
              )}
              {onDelete && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => onDelete(holiday)}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                >
                  <Icons.Delete size={15} color={theme.colors.danger} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <View style={styles.metaRow}>
          <View style={[styles.badge, { borderColor: typeColor + '50', backgroundColor: typeColor + '15' }]}>
            <Text style={[styles.badgeText, { color: typeColor }]}>{typeLabel}</Text>
          </View>
          <View style={styles.dateRow}>
            <Icons.Calendar size={12} color={theme.colors.text[500]} />
            <Text style={styles.dateText}>{dateRange}</Text>
          </View>
          {!holiday.is_recurring && holiday.duration_days > 1 && (
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>{holiday.duration_days}d</Text>
            </View>
          )}
        </View>

        {holiday.falls_on_sunday && (
          <View style={styles.warningRow}>
            <Icons.AlertCircle size={12} color={theme.colors.warning} />
            <Text style={styles.warningText}>Falls on Sunday (weekly off)</Text>
          </View>
        )}
        {!!holiday.description && (
          <Text style={styles.description} numberOfLines={2}>{holiday.description}</Text>
        )}
        {!!holiday.academic_year_name && (
          <Text style={styles.academicYear}>{holiday.academic_year_name}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.l,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.s,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  accentBar: { width: 4 },
  body: { flex: 1, padding: theme.spacing.m },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.xs,
  },
  titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: theme.spacing.s },
  name: { ...theme.typography.body, fontWeight: '600', color: theme.colors.text[900], flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  actionBtn: { padding: theme.spacing.xs },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: theme.radius.s,
    borderWidth: 1,
  },
  badgeText: { ...theme.typography.caption, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  dateText: { ...theme.typography.bodySmall, color: theme.colors.text[500] },
  durationBadge: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  durationText: { ...theme.typography.caption, fontWeight: '700', color: theme.colors.text[500] },
  warningRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: theme.spacing.xs },
  warningText: { ...theme.typography.caption, color: theme.colors.warning },
  description: { ...theme.typography.bodySmall, color: theme.colors.text[500], marginBottom: 2 },
  academicYear: { ...theme.typography.caption, color: theme.colors.text[400], marginTop: 2 },
});
