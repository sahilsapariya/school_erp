import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/common/constants/colors';
import { Spacing, Layout } from '@/common/constants/spacing';
import { Holiday, HOLIDAY_TYPE_LABELS, HOLIDAY_TYPE_COLORS } from '../types';

interface HolidayListItemProps {
  holiday: Holiday;
  onEdit?: (holiday: Holiday) => void;
  onDelete?: (holiday: Holiday) => void;
  canManage?: boolean;
}

function formatDateRange(h: Holiday): string {
  if (h.is_recurring) {
    return `Every ${h.recurring_day_name}`;
  }
  if (!h.start_date) return '';
  if (h.is_single_day || !h.end_date || h.start_date === h.end_date) {
    return formatDate(h.start_date);
  }
  return `${formatDate(h.start_date)} – ${formatDate(h.end_date)}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export const HolidayListItem: React.FC<HolidayListItemProps> = ({
  holiday,
  onEdit,
  onDelete,
  canManage = false,
}) => {
  const typeColor = HOLIDAY_TYPE_COLORS[holiday.holiday_type] ?? Colors.text;
  const typeLabel = HOLIDAY_TYPE_LABELS[holiday.holiday_type] ?? holiday.holiday_type;
  const dateRange = formatDateRange(holiday);

  return (
    <View style={styles.container}>
      {/* Left accent bar */}
      <View style={[styles.accentBar, { backgroundColor: typeColor }]} />

      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={styles.titleRow}>
            {holiday.is_recurring && (
              <Ionicons name="repeat" size={14} color={Colors.textSecondary} style={styles.recurIcon} />
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
                  <Ionicons name="pencil-outline" size={16} color={Colors.textSecondary} />
                </TouchableOpacity>
              )}
              {onDelete && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => onDelete(holiday)}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={16} color={Colors.error} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <View style={styles.metaRow}>
          {/* Type badge */}
          <View style={[styles.badge, { borderColor: typeColor + '50', backgroundColor: typeColor + '15' }]}>
            <Text style={[styles.badgeText, { color: typeColor }]}>{typeLabel}</Text>
          </View>

          {/* Date */}
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={13} color={Colors.textSecondary} />
            <Text style={styles.dateText}>{dateRange}</Text>
          </View>

          {/* Duration badge for multi-day */}
          {!holiday.is_recurring && holiday.duration_days > 1 && (
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>{holiday.duration_days}d</Text>
            </View>
          )}
        </View>

        {/* Sunday collision warning */}
        {holiday.falls_on_sunday && (
          <View style={styles.warningRow}>
            <Ionicons name="warning-outline" size={13} color={Colors.warning} />
            <Text style={styles.warningText}>Falls on Sunday (weekly off)</Text>
          </View>
        )}

        {/* Description */}
        {!!holiday.description && (
          <Text style={styles.description} numberOfLines={2}>{holiday.description}</Text>
        )}

        {/* Academic year */}
        {!!holiday.academic_year_name && (
          <Text style={styles.academicYear}>
            <Ionicons name="school-outline" size={11} color={Colors.textTertiary} /> {holiday.academic_year_name}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  accentBar: {
    width: 4,
  },
  body: {
    flex: 1,
    padding: Spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  recurIcon: {
    marginRight: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionBtn: {
    padding: Spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Layout.borderRadius.sm,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dateText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  durationBadge: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  durationText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.xs,
  },
  warningText: {
    fontSize: 12,
    color: Colors.warning,
  },
  description: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  academicYear: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 2,
  },
});
