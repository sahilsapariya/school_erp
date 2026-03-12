import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SectionList, ActivityIndicator,
  SafeAreaView, RefreshControl, TouchableOpacity, Alert, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/common/constants/colors';
import { Spacing, Layout } from '@/common/constants/spacing';
import { usePermissions } from '@/modules/permissions/hooks/usePermissions';
import { useAcademicYearContext } from '@/modules/academics/context/AcademicYearContext';
import * as PERMS from '@/modules/permissions/constants/permissions';
import { useHolidays } from '../hooks/useHolidays';
import { HolidayListItem } from '../components/HolidayListItem';
import { HolidayFormModal } from '../components/HolidayFormModal';
import { Holiday, CreateHolidayDTO } from '../types';

type FilterTab = 'all' | 'upcoming' | 'recurring';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function HolidaysScreen() {
  const { hasAnyPermission, hasPermission } = usePermissions();
  const { selectedAcademicYearId } = useAcademicYearContext();
  const {
    holidays, recurringHolidays, loading, error,
    fetchHolidays, fetchRecurring,
    createHoliday, updateHoliday, deleteHoliday,
  } = useHolidays();

  const canManage = hasAnyPermission([PERMS.HOLIDAY_MANAGE, PERMS.HOLIDAY_CREATE]);
  const canDelete = hasAnyPermission([PERMS.HOLIDAY_MANAGE, PERMS.HOLIDAY_DELETE]);

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [typeFilter, setTypeFilter] = useState<string>('');

  const [modalVisible, setModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<Holiday | null>(null);

  const loadData = useCallback(() => {
    fetchHolidays({
      search: debouncedSearch || undefined,
      holiday_type: typeFilter || undefined,
      academic_year_id: selectedAcademicYearId || undefined,
    });
    fetchRecurring();
  }, [debouncedSearch, typeFilter, selectedAcademicYearId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Section data ──────────────────────────────────────────────────────────
  const sections = (() => {
    const list: { title: string; data: Holiday[] }[] = [];

    if (activeTab === 'all' || activeTab === 'upcoming') {
      const today = new Date().toISOString().split('T')[0];
      const validHolidays = holidays.filter((h): h is Holiday => !!h?.id);
      const filtered = activeTab === 'upcoming'
        ? validHolidays.filter((h) => h.start_date && h.start_date >= today)
        : validHolidays;
      if (filtered.length) list.push({ title: 'Holidays', data: filtered });
    }

    if (activeTab === 'all' || activeTab === 'recurring') {
      const validRecurring = recurringHolidays.filter((h): h is Holiday => !!h?.id);
      if (validRecurring.length) list.push({ title: 'Weekly Off Days', data: validRecurring });
    }

    return list;
  })();

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleAdd = () => { setEditTarget(null); setModalVisible(true); };
  const handleEdit = (h: Holiday) => { setEditTarget(h); setModalVisible(true); };

  const handleDelete = (h: Holiday) => {
    Alert.alert(
      'Delete Holiday',
      `Remove "${h.name}"${h.is_recurring ? ` (recurring – every ${h.recurring_day_name})` : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteHoliday(h.id, h.is_recurring);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete holiday');
            }
          },
        },
      ]
    );
  };

  const handleSubmit = async (data: CreateHolidayDTO) => {
    try {
      if (editTarget) {
        const updated = await updateHoliday(editTarget.id, data);
        if ((updated as any).warning) {
          Alert.alert('Holiday Updated', (updated as any).warning);
        }
      } else {
        const created = await createHoliday(data);
        if ((created as any).warning) {
          Alert.alert('Holiday Added', (created as any).warning);
        }
      }
      setModalVisible(false);
    } catch (err: any) {
      throw err;
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading && !holidays.length && !recurringHolidays.length) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader canManage={canManage} onAdd={handleAdd} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader canManage={canManage} onAdd={handleAdd} />

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={Colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search holidays…"
          placeholderTextColor={Colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter tabs */}
      <View style={styles.tabRow}>
        {(['all', 'upcoming', 'recurring'] as FilterTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Error state */}
      {!!error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={16} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Summary counts */}
      {!error && (
        <View style={styles.summaryRow}>
          <SummaryChip icon="calendar-outline" count={holidays.length} label="Holidays" />
          <SummaryChip icon="repeat-outline" count={recurringHolidays.length} label="Weekly Off" />
        </View>
      )}

      {/* List */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item?.id ?? Math.random().toString()}
        renderItem={({ item }) => (
          <HolidayListItem
            holiday={item}
            canManage={canManage || canDelete}
            onEdit={canManage ? handleEdit : undefined}
            onDelete={canDelete ? handleDelete : undefined}
          />
        )}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCount}>
              <Text style={styles.sectionCountText}>{section.data.length}</Text>
            </View>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadData} tintColor={Colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="calendar-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>No holidays found</Text>
            <Text style={styles.emptySubtitle}>
              {canManage ? 'Tap + to add a holiday or weekly-off day.' : 'No holidays scheduled yet.'}
            </Text>
          </View>
        }
        stickySectionHeadersEnabled={false}
      />

      {/* Form Modal */}
      <HolidayFormModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleSubmit}
        initialData={editTarget}
        mode={editTarget ? 'edit' : 'create'}
      />
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ScreenHeader({ canManage, onAdd }: { canManage: boolean; onAdd: () => void }) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.headerTitle}>Holidays</Text>
        <Text style={styles.headerSubtitle}>School calendar & weekly off</Text>
      </View>
      {canManage && (
        <TouchableOpacity style={styles.addBtn} onPress={onAdd}>
          <Ionicons name="add" size={22} color={Colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function SummaryChip({ icon, count, label }: { icon: any; count: number; label: string }) {
  return (
    <View style={styles.summaryChip}>
      <Ionicons name={icon} size={14} color={Colors.textSecondary} />
      <Text style={styles.summaryCount}>{count}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.text },
  headerSubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 1 },
  addBtn: {
    padding: Spacing.sm,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Layout.borderRadius.md,
    paddingHorizontal: Spacing.md,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  searchIcon: { marginRight: Spacing.sm },
  searchInput: { flex: 1, fontSize: 15, color: Colors.text, paddingVertical: Spacing.sm },
  // Filter tabs
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  tab: {
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: Layout.borderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.backgroundSecondary,
  },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: Colors.background },
  // Summary
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.backgroundSecondary,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Layout.borderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  summaryCount: { fontSize: 13, fontWeight: '700', color: Colors.text },
  summaryLabel: { fontSize: 12, color: Colors.textSecondary },
  // Section
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionCount: {
    marginLeft: Spacing.sm,
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  sectionCountText: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary },
  listContent: { padding: Spacing.md, paddingTop: 0, flexGrow: 1 },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: '#FFF0F0', margin: Spacing.md,
    padding: Spacing.sm, borderRadius: Layout.borderRadius.sm,
    borderWidth: 1, borderColor: Colors.error + '30',
  },
  errorText: { fontSize: 13, color: Colors.error, flex: 1 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: Colors.textSecondary, marginTop: Spacing.md },
  emptySubtitle: { fontSize: 14, color: Colors.textTertiary, textAlign: 'center', marginTop: Spacing.sm },
});
