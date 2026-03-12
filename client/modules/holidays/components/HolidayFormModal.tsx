import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TextInput,
  TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { theme } from '@/src/design-system/theme';
import { Icons } from '@/src/design-system/icons';
import { Holiday, CreateHolidayDTO, HolidayType, HOLIDAY_TYPE_LABELS, DAY_NAMES } from '../types';
import { validateHolidayData } from '../validation/schemas';
import { useAcademicYears } from '@/modules/academics/hooks/useAcademicYears';
import { useAcademicYearContext } from '@/modules/academics/context/AcademicYearContext';
import { PrimaryButton } from '@/src/components/ui/PrimaryButton';

interface HolidayFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CreateHolidayDTO) => Promise<void>;
  initialData?: Holiday | null;
  mode?: 'create' | 'edit';
}

const HOLIDAY_TYPES: HolidayType[] = ['public', 'school', 'regional', 'optional', 'weekly_off'];

type HolidayMode = 'single' | 'range' | 'recurring';

function getDefaultForm() {
  return {
    name: '', description: '', holiday_type: 'school' as HolidayType,
    start_date: '', end_date: '', academic_year_id: '',
    is_recurring: false, recurring_day_of_week: null as number | null,
  };
}

export const HolidayFormModal: React.FC<HolidayFormModalProps> = ({
  visible, onClose, onSubmit, initialData = null, mode = 'create',
}) => {
  const [form, setForm] = useState(getDefaultForm());
  const [holidayMode, setHolidayMode] = useState<HolidayMode>('single');
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { data: academicYears = [] } = useAcademicYears(false);
  const { selectedAcademicYearId } = useAcademicYearContext();

  useEffect(() => {
    if (!visible) return;
    if (mode === 'edit' && initialData) {
      setForm({
        name: initialData.name ?? '',
        description: initialData.description ?? '',
        holiday_type: initialData.holiday_type,
        start_date: initialData.start_date ?? '',
        end_date: initialData.end_date ?? '',
        academic_year_id: initialData.academic_year_id ?? '',
        is_recurring: initialData.is_recurring,
        recurring_day_of_week: initialData.recurring_day_of_week ?? null,
      });
      if (initialData.is_recurring) setHolidayMode('recurring');
      else if (initialData.start_date && initialData.end_date && initialData.start_date !== initialData.end_date) setHolidayMode('range');
      else setHolidayMode('single');
    } else {
      setForm({ ...getDefaultForm(), academic_year_id: selectedAcademicYearId ?? '' });
      setHolidayMode('single');
    }
    setFieldErrors({});
    setSubmitError(null);
  }, [visible, mode, initialData, selectedAcademicYearId]);

  const setField = <K extends keyof ReturnType<typeof getDefaultForm>>(key: K, value: ReturnType<typeof getDefaultForm>[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) setFieldErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
  };

  const handleModeChange = (m: HolidayMode) => {
    setHolidayMode(m);
    setFieldErrors({});
    setSubmitError(null);
    if (m === 'recurring') setForm((prev) => ({ ...prev, is_recurring: true, start_date: '', end_date: '' }));
    else {
      setForm((prev) => ({ ...prev, is_recurring: false, recurring_day_of_week: null }));
      if (m === 'single') setForm((prev) => ({ ...prev, end_date: '' }));
    }
  };

  const buildPayload = (): CreateHolidayDTO => {
    if (holidayMode === 'recurring') {
      return {
        name: form.name.trim(), description: form.description.trim() || undefined,
        holiday_type: form.holiday_type, is_recurring: true,
        recurring_day_of_week: form.recurring_day_of_week!,
        academic_year_id: form.academic_year_id || undefined,
      };
    }
    return {
      name: form.name.trim(), description: form.description.trim() || undefined,
      holiday_type: form.holiday_type, is_recurring: false,
      start_date: form.start_date.trim(),
      end_date: holidayMode === 'range' ? (form.end_date.trim() || undefined) : undefined,
      academic_year_id: form.academic_year_id || undefined,
    };
  };

  const handleSubmit = async () => {
    const payload = buildPayload();
    const validation = validateHolidayData(payload);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setSubmitError('Please fix the errors below.');
      return;
    }
    setLoading(true);
    setSubmitError(null);
    setFieldErrors({});
    try {
      await onSubmit(payload);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to save holiday');
    } finally {
      setLoading(false);
    }
  };

  const MODE_OPTIONS: { key: HolidayMode; label: string }[] = [
    { key: 'single', label: 'Single Day' },
    { key: 'range', label: 'Date Range' },
    { key: 'recurring', label: 'Recurring' },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{mode === 'edit' ? 'Edit Holiday' : 'Add Holiday'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icons.Close size={22} color={theme.colors.text[700]} />
            </TouchableOpacity>
          </View>

          {/* Error banner */}
          {submitError && (
            <View style={styles.errorBanner}>
              <Icons.AlertCircle size={15} color={theme.colors.danger} />
              <Text style={styles.errorBannerText}>{submitError}</Text>
            </View>
          )}

          <ScrollView style={styles.form} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Mode selector */}
            <Text style={styles.sectionLabel}>Type</Text>
            <View style={styles.modeTabs}>
              {MODE_OPTIONS.map((m) => (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.modeTab, holidayMode === m.key && styles.modeTabActive]}
                  onPress={() => handleModeChange(m.key)}
                >
                  <Text style={[styles.modeTabText, holidayMode === m.key && styles.modeTabTextActive]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Name */}
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={[styles.input, fieldErrors.name && styles.inputError]}
              value={form.name}
              onChangeText={(v) => setField('name', v)}
              placeholder="e.g. Diwali, Summer Vacation"
              placeholderTextColor={theme.colors.text[400]}
            />
            {fieldErrors.name && <Text style={styles.fieldError}>{fieldErrors.name}</Text>}

            {/* Single date */}
            {holidayMode === 'single' && (
              <>
                <Text style={styles.label}>Date * (YYYY-MM-DD)</Text>
                <TextInput
                  style={[styles.input, fieldErrors.start_date && styles.inputError]}
                  value={form.start_date}
                  onChangeText={(v) => setField('start_date', v)}
                  placeholder="2026-01-26"
                  placeholderTextColor={theme.colors.text[400]}
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                />
                {fieldErrors.start_date && <Text style={styles.fieldError}>{fieldErrors.start_date}</Text>}
              </>
            )}

            {/* Range dates */}
            {holidayMode === 'range' && (
              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.label}>Start *</Text>
                  <TextInput
                    style={[styles.input, fieldErrors.start_date && styles.inputError]}
                    value={form.start_date}
                    onChangeText={(v) => setField('start_date', v)}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={theme.colors.text[400]}
                    keyboardType="numbers-and-punctuation"
                    maxLength={10}
                  />
                  {fieldErrors.start_date && <Text style={styles.fieldError}>{fieldErrors.start_date}</Text>}
                </View>
                <View style={[styles.col, { marginLeft: theme.spacing.m }]}>
                  <Text style={styles.label}>End *</Text>
                  <TextInput
                    style={[styles.input, fieldErrors.end_date && styles.inputError]}
                    value={form.end_date}
                    onChangeText={(v) => setField('end_date', v)}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={theme.colors.text[400]}
                    keyboardType="numbers-and-punctuation"
                    maxLength={10}
                  />
                  {fieldErrors.end_date && <Text style={styles.fieldError}>{fieldErrors.end_date}</Text>}
                </View>
              </View>
            )}

            {/* Recurring day picker */}
            {holidayMode === 'recurring' && (
              <>
                <Text style={styles.label}>Repeats Every *</Text>
                <View style={styles.dayGrid}>
                  {Object.entries(DAY_NAMES).map(([key, dayName]) => {
                    const dow = Number(key);
                    const active = form.recurring_day_of_week === dow;
                    return (
                      <TouchableOpacity
                        key={dow}
                        style={[styles.dayChip, active && styles.dayChipActive]}
                        onPress={() => {
                          setField('recurring_day_of_week', dow);
                          if (fieldErrors.recurring_day_of_week) setFieldErrors((p) => { const n = { ...p }; delete n.recurring_day_of_week; return n; });
                        }}
                      >
                        <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>
                          {dayName.slice(0, 3)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {fieldErrors.recurring_day_of_week && <Text style={styles.fieldError}>{fieldErrors.recurring_day_of_week}</Text>}
                <View style={styles.infoBox}>
                  <Icons.Info size={13} color={theme.colors.text[500]} />
                  <Text style={styles.infoText}>
                    Recurring holidays apply as weekly-off days across all weeks.
                  </Text>
                </View>
              </>
            )}

            {/* Category */}
            <Text style={styles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow}>
              {HOLIDAY_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeChip, form.holiday_type === t && styles.typeChipActive]}
                  onPress={() => setField('holiday_type', t)}
                >
                  <Text style={[styles.typeChipText, form.holiday_type === t && styles.typeChipTextActive]}>
                    {HOLIDAY_TYPE_LABELS[t]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Academic Year */}
            {academicYears.length > 0 && (
              <>
                <Text style={styles.label}>Academic Year</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow}>
                  <TouchableOpacity
                    style={[styles.typeChip, !form.academic_year_id && styles.typeChipActive]}
                    onPress={() => setField('academic_year_id', '')}
                  >
                    <Text style={[styles.typeChipText, !form.academic_year_id && styles.typeChipTextActive]}>All Years</Text>
                  </TouchableOpacity>
                  {(academicYears as any[]).map((ay) => (
                    <TouchableOpacity
                      key={ay.id}
                      style={[styles.typeChip, form.academic_year_id === ay.id && styles.typeChipActive]}
                      onPress={() => setField('academic_year_id', ay.id)}
                    >
                      <Text style={[styles.typeChipText, form.academic_year_id === ay.id && styles.typeChipTextActive]}>
                        {ay.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {/* Description */}
            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea, fieldErrors.description && styles.inputError]}
              value={form.description}
              onChangeText={(v) => setField('description', v)}
              placeholder="Additional details…"
              placeholderTextColor={theme.colors.text[400]}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={{ height: theme.spacing.xl }} />
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <PrimaryButton
              title={loading ? (mode === 'edit' ? 'Saving…' : 'Adding…') : (mode === 'edit' ? 'Save Changes' : 'Add Holiday')}
              onPress={handleSubmit}
              loading={loading}
              style={styles.submitBtn}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xxl,
    borderTopRightRadius: theme.radius.xxl,
    height: '90%',
    padding: theme.spacing.l,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.m,
  },
  title: { ...theme.typography.h2, color: theme.colors.text[900] },
  closeBtn: {
    width: 36, height: 36, borderRadius: theme.radius.m,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center', justifyContent: 'center',
  },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs,
    backgroundColor: theme.colors.dangerLight, padding: theme.spacing.s,
    borderRadius: theme.radius.m, marginBottom: theme.spacing.s,
    borderWidth: 1, borderColor: theme.colors.danger + '30',
  },
  errorBannerText: { ...theme.typography.bodySmall, color: theme.colors.danger, flex: 1 },
  form: { flex: 1 },
  sectionLabel: { ...theme.typography.overline, color: theme.colors.text[500], marginBottom: theme.spacing.s },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.l,
    padding: 3,
    marginBottom: theme.spacing.l,
  },
  modeTab: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: theme.spacing.s, borderRadius: theme.radius.m,
  },
  modeTabActive: { backgroundColor: theme.colors.primary[500] },
  modeTabText: { ...theme.typography.caption, fontWeight: '600', color: theme.colors.text[500] },
  modeTabTextActive: { color: '#fff' },
  label: { ...theme.typography.label, color: theme.colors.text[700], marginBottom: theme.spacing.xs, marginTop: theme.spacing.m },
  input: {
    borderWidth: 1.5, borderColor: theme.colors.border,
    borderRadius: theme.radius.l, paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.sm, ...theme.typography.body,
    color: theme.colors.text[900], backgroundColor: theme.colors.surface,
  },
  inputError: { borderColor: theme.colors.danger },
  textArea: { minHeight: 80, paddingTop: theme.spacing.sm, textAlignVertical: 'top' },
  fieldError: { ...theme.typography.caption, color: theme.colors.danger, marginTop: 3 },
  row: { flexDirection: 'row' },
  col: { flex: 1 },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.s, marginBottom: theme.spacing.xs },
  dayChip: {
    paddingVertical: theme.spacing.s, paddingHorizontal: theme.spacing.m,
    borderRadius: theme.radius.m, borderWidth: 1, borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  dayChipActive: { borderColor: theme.colors.primary[500], backgroundColor: theme.colors.primary[500] },
  dayChipText: { ...theme.typography.caption, fontWeight: '600', color: theme.colors.text[700] },
  dayChipTextActive: { color: '#fff' },
  typeRow: { marginBottom: theme.spacing.xs },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing.s,
    paddingHorizontal: theme.spacing.m, marginRight: theme.spacing.s,
    borderRadius: theme.radius.m, borderWidth: 1, borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  typeChipActive: { borderColor: theme.colors.primary[500], backgroundColor: theme.colors.primary[500] },
  typeChipText: { ...theme.typography.caption, fontWeight: '600', color: theme.colors.text[700] },
  typeChipTextActive: { color: '#fff' },
  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.xs,
    backgroundColor: theme.colors.infoLight, padding: theme.spacing.s,
    borderRadius: theme.radius.m, marginTop: theme.spacing.xs,
    borderWidth: 1, borderColor: theme.colors.info + '30',
  },
  infoText: { ...theme.typography.caption, color: theme.colors.text[700], flex: 1, lineHeight: 18 },
  footer: {
    flexDirection: 'row', paddingTop: theme.spacing.m,
    borderTopWidth: 1, borderTopColor: theme.colors.border,
    gap: theme.spacing.m, alignItems: 'center',
  },
  cancelBtn: { paddingVertical: theme.spacing.m, paddingHorizontal: theme.spacing.m },
  cancelText: { ...theme.typography.body, color: theme.colors.text[500], fontWeight: '600' },
  submitBtn: { flex: 1 },
});
