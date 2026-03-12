import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SectionList, RefreshControl, TouchableOpacity,
} from 'react-native';
import { usePermissions } from '@/modules/permissions/hooks/usePermissions';
import { useAcademicYearContext } from '@/modules/academics/context/AcademicYearContext';
import * as PERMS from '@/modules/permissions/constants/permissions';
import { useHolidays } from '../hooks/useHolidays';
import { HolidayListItem } from '../components/HolidayListItem';
import { HolidayFormModal } from '../components/HolidayFormModal';
import { Holiday, CreateHolidayDTO } from '../types';
import { ScreenContainer } from '@/src/components/ui/ScreenContainer';
import { Header } from '@/src/components/ui/Header';
import { SearchBar } from '@/src/components/ui/SearchBar';
import { LoadingState } from '@/src/components/ui/LoadingState';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { FloatingActionButton } from '@/src/components/ui/FloatingActionButton';
import { ConfirmationDialog } from '@/src/components/ui/ConfirmationDialog';
import { useToast } from '@/src/components/ui/Toast';
import { useDebounce } from '@/src/hooks/useDebounce';
import { theme } from '@/src/design-system/theme';
import { Icons } from '@/src/design-system/icons';

type FilterTab = 'all' | 'upcoming' | 'recurring';

export default function HolidaysScreen() {
  const { hasAnyPermission, hasPermission } = usePermissions();
  const { selectedAcademicYearId } = useAcademicYearContext();
  const toast = useToast();
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

  const [modalVisible, setModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<Holiday | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Holiday | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(() => {
    fetchHolidays({
      search: debouncedSearch || undefined,
      academic_year_id: selectedAcademicYearId || undefined,
    });
    fetchRecurring();
  }, [debouncedSearch, selectedAcademicYearId]);

  useEffect(() => { loadData(); }, [loadData]);

  const sections = (() => {
    const list: { title: string; data: Holiday[] }[] = [];
    if (activeTab === 'all' || activeTab === 'upcoming') {
      const today = new Date().toISOString().split('T')[0];
      const filtered = activeTab === 'upcoming'
        ? holidays.filter((h) => h.start_date && h.start_date >= today)
        : holidays;
      if (filtered.length) list.push({ title: 'Holidays', data: filtered });
    }
    if (activeTab === 'all' || activeTab === 'recurring') {
      if (recurringHolidays.length) list.push({ title: 'Weekly Off Days', data: recurringHolidays });
    }
    return list;
  })();

  const handleAdd = () => { setEditTarget(null); setModalVisible(true); };
  const handleEdit = (h: Holiday) => { setEditTarget(h); setModalVisible(true); };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteHoliday(deleteTarget.id, deleteTarget.is_recurring);
      toast.success('Holiday deleted', `"${deleteTarget.name}" has been removed.`);
    } catch (err: any) {
      toast.error('Delete failed', err.message || 'Failed to delete holiday');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleSubmit = async (data: CreateHolidayDTO) => {
    try {
      if (editTarget) {
        const updated = await updateHoliday(editTarget.id, data);
        if ((updated as any).warning) {
          toast.warning('Holiday Updated', (updated as any).warning);
        } else {
          toast.success('Holiday updated successfully');
        }
      } else {
        const created = await createHoliday(data);
        if ((created as any).warning) {
          toast.warning('Holiday Added', (created as any).warning);
        } else {
          toast.success('Holiday added successfully');
        }
      }
      setModalVisible(false);
    } catch (err: any) {
      throw err;
    }
  };

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'recurring', label: 'Recurring' },
  ];

  if (loading && !holidays.length && !recurringHolidays.length) {
    return (
      <ScreenContainer>
        <Header title="Holidays" subtitle="School calendar & weekly off" />
        <LoadingState message="Loading holidays..." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Header
        title="Holidays"
        subtitle="School calendar & weekly off"
        rightAction={
          canManage ? (
            <TouchableOpacity style={styles.addBtn} onPress={handleAdd} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icons.Add size={22} color={theme.colors.primary[500]} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search holidays…"
        style={styles.searchBar}
      />

      {/* Filter tabs */}
      <View style={styles.tabRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary chips */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryChip}>
          <Icons.Calendar size={13} color={theme.colors.text[500]} />
          <Text style={styles.summaryCount}>{holidays.length}</Text>
          <Text style={styles.summaryLabel}>Holidays</Text>
        </View>
        <View style={styles.summaryChip}>
          <Icons.Refresh size={13} color={theme.colors.text[500]} />
          <Text style={styles.summaryCount}>{recurringHolidays.length}</Text>
          <Text style={styles.summaryLabel}>Weekly Off</Text>
        </View>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Icons.AlertCircle size={15} color={theme.colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <HolidayListItem
            holiday={item}
            canManage={canManage || canDelete}
            onEdit={canManage ? handleEdit : undefined}
            onDelete={canDelete ? (h) => setDeleteTarget(h) : undefined}
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
          <RefreshControl refreshing={loading} onRefresh={loadData} tintColor={theme.colors.primary[500]} />
        }
        ListEmptyComponent={
          <EmptyState
            icon={<Icons.Calendar size={32} color={theme.colors.primary[300]} />}
            title={search ? 'No holidays found' : 'No holidays scheduled'}
            description={canManage ? 'Tap + to add a holiday or weekly-off day.' : 'No holidays have been scheduled yet.'}
            action={canManage ? { label: 'Add Holiday', onPress: handleAdd } : undefined}
          />
        }
        stickySectionHeadersEnabled={false}
      />

      {canManage && <FloatingActionButton onPress={handleAdd} />}

      <HolidayFormModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleSubmit}
        initialData={editTarget}
        mode={editTarget ? 'edit' : 'create'}
      />

      <ConfirmationDialog
        visible={!!deleteTarget}
        title="Delete Holiday"
        message={deleteTarget ? `Remove "${deleteTarget.name}"${deleteTarget.is_recurring ? ` (recurring – every ${deleteTarget.recurring_day_name})` : ''}?` : ''}
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
        destructive
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  searchBar: { marginHorizontal: theme.spacing.m, marginBottom: theme.spacing.s },
  addBtn: {
    width: 36, height: 36, borderRadius: theme.radius.m,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: theme.colors.primary[200],
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.m,
    paddingBottom: theme.spacing.s,
    gap: theme.spacing.s,
  },
  tab: {
    paddingVertical: theme.spacing.xs + 2, paddingHorizontal: theme.spacing.m,
    borderRadius: theme.radius.full, borderWidth: 1, borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  tabActive: { backgroundColor: theme.colors.primary[500], borderColor: theme.colors.primary[500] },
  tabText: { ...theme.typography.caption, fontWeight: '600', color: theme.colors.text[500] },
  tabTextActive: { color: '#fff' },
  summaryRow: {
    flexDirection: 'row', paddingHorizontal: theme.spacing.m,
    gap: theme.spacing.s, marginBottom: theme.spacing.s,
  },
  summaryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: theme.colors.backgroundSecondary, paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.s, borderRadius: theme.radius.m,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  summaryCount: { ...theme.typography.caption, fontWeight: '700', color: theme.colors.text[900] },
  summaryLabel: { ...theme.typography.caption, color: theme.colors.text[500] },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs,
    backgroundColor: theme.colors.dangerLight, margin: theme.spacing.m,
    padding: theme.spacing.s, borderRadius: theme.radius.m,
    borderWidth: 1, borderColor: theme.colors.danger + '30',
  },
  errorText: { ...theme.typography.bodySmall, color: theme.colors.danger, flex: 1 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: theme.spacing.s, marginTop: theme.spacing.s,
  },
  sectionTitle: { ...theme.typography.overline, color: theme.colors.text[700] },
  sectionCount: {
    marginLeft: theme.spacing.s, backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: 7, paddingVertical: 1, borderRadius: 10,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  sectionCountText: { ...theme.typography.caption, fontWeight: '700', color: theme.colors.text[500] },
  listContent: { padding: theme.spacing.m, paddingTop: 0, flexGrow: 1, paddingBottom: 80 },
});
