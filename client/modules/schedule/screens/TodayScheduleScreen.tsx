import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useSchedule } from "../hooks/useSchedule";
import { ScheduleSlot } from "../types";
import { usePermissions } from "@/modules/permissions/hooks/usePermissions";
import { isTeacher, isStudent } from "@/common/constants/navigation";
import { teacherService } from "@/modules/teachers/services/teacherService";
import { Teacher } from "@/modules/teachers/types";
import * as PERMS from "@/modules/permissions/constants/permissions";
import { ScreenContainer } from "@/src/components/ui/ScreenContainer";
import { Header } from "@/src/components/ui/Header";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { LoadingState } from "@/src/components/ui/LoadingState";
import { PrimaryButton } from "@/src/components/ui/PrimaryButton";
import { ConfirmationDialog } from "@/src/components/ui/ConfirmationDialog";
import { useToast } from "@/src/components/ui/Toast";
import { theme } from "@/src/design-system/theme";
import { Icons } from "@/src/design-system/icons";

const ACTIVITY_PRESETS = [
  "Sports Day", "Assembly", "Library Session", "Field Trip",
  "Cultural Programme", "Exam Preparation", "Free Period", "Movie / Documentary",
];

type OverrideMode = "substitute" | "activity" | "cancelled";
type CardTheme = "normal" | "warning" | "cancelled" | "activity" | "substitute";

const CARD_COLORS: Record<CardTheme, { border: string; bg: string }> = {
  normal:     { border: theme.colors.border, bg: theme.colors.surface },
  warning:    { border: theme.colors.warning + "60", bg: theme.colors.warning + "08" },
  cancelled:  { border: theme.colors.danger + "50", bg: theme.colors.danger + "07" },
  activity:   { border: "#7C3AED40", bg: "#7C3AED08" },
  substitute: { border: "#0891b250", bg: "#0891b207" },
};

const BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  warning:    { bg: theme.colors.warning + "20", text: theme.colors.warning },
  cancelled:  { bg: theme.colors.danger + "18",  text: theme.colors.danger  },
  activity:   { bg: "#7C3AED18", text: "#7C3AED" },
  substitute: { bg: "#0891b218", text: "#0891b2" },
};

export default function TodayScheduleScreen() {
  const router = useRouter();
  const { slots, loading, error, fetchTodaysSchedule, upsertOverride, removeOverride } = useSchedule();
  const { permissions, hasPermission } = usePermissions();
  const toast = useToast();

  const teacherView = isTeacher(permissions);
  const studentView = isStudent(permissions);
  const canManage = hasPermission(PERMS.TIMETABLE_MANAGE);

  const [overrideModalSlot, setOverrideModalSlot] = useState<ScheduleSlot | null>(null);
  const [overrideMode, setOverrideMode] = useState<OverrideMode | null>(null);
  const [substituteTeachers, setSubstituteTeachers] = useState<Teacher[]>([]);
  const [selectedSubTeacher, setSelectedSubTeacher] = useState<Teacher | null>(null);
  const [activityLabel, setActivityLabel] = useState("");
  const [overrideNote, setOverrideNote] = useState("");
  const [overrideSaving, setOverrideSaving] = useState(false);
  const [teacherSearchQuery, setTeacherSearchQuery] = useState("");
  const [restoreTarget, setRestoreTarget] = useState<ScheduleSlot | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => { fetchTodaysSchedule(); }, [fetchTodaysSchedule]);

  const filteredTeachers = substituteTeachers.filter(
    (t) =>
      t.name?.toLowerCase().includes(teacherSearchQuery.toLowerCase()) ||
      t.employee_id?.toLowerCase().includes(teacherSearchQuery.toLowerCase())
  );

  const openOverrideModal = async (slot: ScheduleSlot) => {
    setOverrideModalSlot(slot);
    setOverrideMode(null);
    setSelectedSubTeacher(null);
    setActivityLabel("");
    setOverrideNote("");
    setTeacherSearchQuery("");
    if (slot.override) {
      setOverrideMode(slot.override.override_type as OverrideMode);
      setActivityLabel(slot.override.activity_label ?? "");
      setOverrideNote(slot.override.note ?? "");
    }
    try {
      const teachers = await teacherService.getTeachers({ status: "active" });
      setSubstituteTeachers(teachers.filter((t) => t.id !== slot.teacher_id));
    } catch {
      setSubstituteTeachers([]);
    }
  };

  const handleSaveOverride = async () => {
    if (!overrideModalSlot || !overrideMode) return;
    if (overrideMode === "substitute" && !selectedSubTeacher) {
      toast.warning("Select Teacher", "Please select a substitute teacher.");
      return;
    }
    if (overrideMode === "activity" && !activityLabel.trim()) {
      toast.warning("Enter Activity", "Please enter or select an activity name.");
      return;
    }
    try {
      setOverrideSaving(true);
      await upsertOverride({
        slot_id: overrideModalSlot.slot_id,
        override_type: overrideMode,
        substitute_teacher_id: overrideMode === "substitute" ? selectedSubTeacher?.id : undefined,
        activity_label: overrideMode === "activity" ? activityLabel.trim() : undefined,
        note: overrideNote.trim() || undefined,
      });
      toast.success("Override saved");
      setOverrideModalSlot(null);
    } catch (e: any) {
      toast.error("Save failed", e.message || "Could not save override");
    } finally {
      setOverrideSaving(false);
    }
  };

  const handleRestoreConfirm = async () => {
    if (!restoreTarget) return;
    setRestoring(true);
    try {
      await removeOverride(restoreTarget.slot_id);
      toast.success("Original class restored");
    } catch (e: any) {
      toast.error("Restore failed", e.message || "Could not remove override");
    } finally {
      setRestoring(false);
      setRestoreTarget(null);
    }
  };

  const getCardTheme = (slot: ScheduleSlot): CardTheme => {
    if (slot.override?.override_type === "cancelled") return "cancelled";
    if (slot.override?.override_type === "activity") return "activity";
    if (slot.override?.override_type === "substitute") return "substitute";
    if (slot.needs_coverage) return "warning";
    return "normal";
  };

  const getEmptyMessage = () => {
    if (teacherView) return "No classes to teach today.\nEnjoy your free time!";
    if (studentView) return "No classes scheduled for today.\nCheck back tomorrow!";
    return "No schedule available.";
  };

  const renderSlotCard = ({ item }: { item: ScheduleSlot }) => {
    const ct = getCardTheme(item);
    const isCancelled = ct === "cancelled";
    const isActivity = ct === "activity";
    const isSubstitute = ct === "substitute";
    const isWarning = ct === "warning";
    const colors = CARD_COLORS[ct];
    let badgeKey = isWarning ? "warning" : isCancelled ? "cancelled" : isActivity ? "activity" : isSubstitute ? "substitute" : null;
    const badgeColors = badgeKey ? BADGE_COLORS[badgeKey] : null;

    const badgeLabel = isCancelled ? "Cancelled"
      : isActivity ? (item.override?.activity_label ?? "Activity")
      : isSubstitute ? `Sub: ${item.override?.substitute_teacher_name ?? "Assigned"}`
      : item.teacher_on_leave ? "Teacher on Leave"
      : "Teacher Unavailable";

    const BadgeIcon = isCancelled ? Icons.Close : isActivity ? Icons.AlertCircle : isSubstitute ? Icons.Refresh : Icons.AlertCircle;

    return (
      <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.bg }]}>
        {badgeColors && (
          <View style={[styles.statusBadge, { backgroundColor: badgeColors.bg }]}>
            <BadgeIcon size={12} color={badgeColors.text} />
            <Text style={[styles.statusBadgeText, { color: badgeColors.text }]}>{badgeLabel}</Text>
          </View>
        )}

        <View style={styles.cardTimeBadge}>
          <Icons.Clock size={15} color={isCancelled ? theme.colors.danger : theme.colors.primary[500]} />
          <Text style={[styles.cardTime, isCancelled && { color: theme.colors.danger }]}>
            {item.start_time || "—"} – {item.end_time || "—"}  ·  P{item.period_number}
          </Text>
        </View>

        <View style={styles.cardContent}>
          <Text style={[styles.cardSubject, isCancelled && styles.textStrikethrough]}>
            {isActivity ? (item.override?.activity_label ?? item.subject_name ?? "—") : (item.subject_name || "—")}
          </Text>
          {item.class_name && (
            <View style={styles.cardRow}>
              <Icons.Class size={13} color={theme.colors.text[400]} />
              <Text style={styles.cardDetail}>{item.class_name}</Text>
            </View>
          )}
          <View style={styles.cardRow}>
            <Icons.User size={13} color={(isWarning || isCancelled) ? theme.colors.danger : theme.colors.text[400]} />
            <Text style={[styles.cardDetail, (isWarning || isCancelled) && { color: theme.colors.danger }]}>
              {isSubstitute
                ? item.override?.substitute_teacher_name ?? item.teacher_name ?? "—"
                : item.teacher_name || "—"}
              {(item.teacher_on_leave || item.teacher_unavailable) && !isSubstitute && !isCancelled && !isActivity ? " (unavailable)" : ""}
            </Text>
          </View>
          {item.override?.note && (
            <View style={styles.cardRow}>
              <Icons.FileText size={13} color={theme.colors.text[400]} />
              <Text style={styles.cardDetail}>{item.override.note}</Text>
            </View>
          )}
        </View>

        {canManage && (
          <View style={styles.actionRow}>
            {item.override && (
              <TouchableOpacity style={styles.actionBtnSecondary} onPress={() => setRestoreTarget(item)}>
                <Icons.Refresh size={13} color={theme.colors.text[500]} />
                <Text style={styles.actionBtnSecondaryText}>Restore</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionBtn, isWarning && { backgroundColor: theme.colors.warning }]}
              onPress={() => openOverrideModal(item)}
            >
              <Icons.Edit size={13} color="#fff" />
              <Text style={styles.actionBtnText}>
                {item.override ? "Edit Override" : isWarning ? "Assign Coverage" : "Override"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const coverageCount = slots.filter((s) => s.needs_coverage && !s.override).length;

  if (loading && slots.length === 0) {
    return (
      <ScreenContainer>
        <Header title="Today's Schedule" onBack={() => router.back()} compact />
        <LoadingState message="Loading schedule..." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Header
        title="Today's Schedule"
        subtitle={teacherView ? "Your teaching schedule" : studentView ? "Your classes today" : "Today's lectures"}
        onBack={() => router.back()}
        compact
        rightAction={
          <TouchableOpacity onPress={fetchTodaysSchedule} style={{ padding: 6 }}>
            <Icons.Refresh size={20} color={theme.colors.primary[500]} />
          </TouchableOpacity>
        }
      />

      {canManage && !loading && coverageCount > 0 && (
        <View style={styles.coverageBanner}>
          <Icons.AlertCircle size={16} color={theme.colors.warning} />
          <Text style={styles.coverageBannerText}>{coverageCount} class(es) need teacher coverage today</Text>
        </View>
      )}

      {error ? (
        <EmptyState
          icon={<Icons.AlertCircle size={32} color={theme.colors.danger} />}
          title="Could not load schedule"
          description={error}
          action={{ label: "Retry", onPress: fetchTodaysSchedule }}
        />
      ) : (
        <FlatList
          data={slots}
          keyExtractor={(item, i) => item.slot_id ?? String(i)}
          renderItem={renderSlotCard}
          contentContainerStyle={{ padding: theme.spacing.m, paddingBottom: theme.spacing.xxl }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchTodaysSchedule} tintColor={theme.colors.primary[500]} />}
          ListEmptyComponent={
            <EmptyState
              icon={<Icons.Calendar size={40} color={theme.colors.primary[200]} />}
              title="No schedule"
              description={getEmptyMessage()}
            />
          }
        />
      )}

      {/* Override Modal */}
      <Modal visible={!!overrideModalSlot} animationType="slide" presentationStyle="formSheet">
        <ScreenContainer>
          <Header
            title="Override Class"
            compact
            rightAction={
              <TouchableOpacity onPress={() => setOverrideModalSlot(null)} style={{ padding: 6 }}>
                <Icons.Close size={22} color={theme.colors.text[500]} />
              </TouchableOpacity>
            }
          />
          {overrideModalSlot && (
            <ScrollView contentContainerStyle={{ padding: theme.spacing.m, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
              {/* Slot info card */}
              <View style={styles.slotInfoCard}>
                <Text style={styles.slotSubject}>{overrideModalSlot.subject_name || "—"}</Text>
                <Text style={styles.slotMeta}>
                  {overrideModalSlot.class_name} · P{overrideModalSlot.period_number} · {overrideModalSlot.start_time}–{overrideModalSlot.end_time}
                </Text>
                {overrideModalSlot.needs_coverage && (
                  <View style={styles.needsCoverageBadge}>
                    <Icons.AlertCircle size={13} color={theme.colors.danger} />
                    <Text style={styles.needsCoverageText}>
                      {overrideModalSlot.teacher_on_leave ? "Teacher on approved leave" : "Teacher marked unavailable"}
                    </Text>
                  </View>
                )}
              </View>

              {/* Override type selector */}
              <Text style={styles.sectionTitle}>Select Override Type</Text>
              <View style={styles.overrideTypeBtns}>
                {(["substitute", "activity", "cancelled"] as OverrideMode[]).map((mode) => {
                  const active = overrideMode === mode;
                  const colors = {
                    substitute: { active: theme.colors.primary[500], icon: theme.colors.primary[500] },
                    activity:   { active: "#7C3AED", icon: "#7C3AED" },
                    cancelled:  { active: theme.colors.danger, icon: theme.colors.danger },
                  }[mode];
                  const labels = { substitute: ["Substitute", "Assign a teacher"], activity: ["Activity", "Replace with activity"], cancelled: ["Cancel", "Cancel this class"] }[mode];
                  return (
                    <TouchableOpacity
                      key={mode}
                      style={[styles.overrideTypeBtn, active && { backgroundColor: colors.active, borderColor: colors.active }]}
                      onPress={() => setOverrideMode(mode)}
                    >
                      {mode === "substitute" && <Icons.User size={18} color={active ? "#fff" : colors.icon} />}
                      {mode === "activity" && <Icons.AlertCircle size={18} color={active ? "#fff" : colors.icon} />}
                      {mode === "cancelled" && <Icons.Close size={18} color={active ? "#fff" : colors.icon} />}
                      <Text style={[styles.overrideTypeBtnText, active && { color: "#fff" }]}>{labels[0]}</Text>
                      <Text style={[styles.overrideTypeBtnSub, active && { color: "rgba(255,255,255,0.8)" }]}>{labels[1]}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Substitute teacher picker */}
              {overrideMode === "substitute" && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Select Substitute Teacher</Text>
                  <TextInput
                    style={styles.textInput}
                    value={teacherSearchQuery}
                    onChangeText={setTeacherSearchQuery}
                    placeholder="Search by name or employee ID…"
                    placeholderTextColor={theme.colors.text[400]}
                    clearButtonMode="while-editing"
                  />
                  {filteredTeachers.length === 0 ? (
                    <Text style={styles.emptyHint}>No active teachers found</Text>
                  ) : (
                    filteredTeachers.map((t) => (
                      <TouchableOpacity
                        key={t.id}
                        style={[styles.teacherRow, selectedSubTeacher?.id === t.id && styles.teacherRowSelected]}
                        onPress={() => setSelectedSubTeacher(t)}
                      >
                        <View style={styles.teacherAvatar}>
                          <Text style={styles.teacherAvatarText}>{t.name?.[0]?.toUpperCase() ?? "T"}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.teacherName}>{t.name}</Text>
                          <Text style={styles.teacherMeta}>{t.employee_id}{t.designation ? ` · ${t.designation}` : ""}</Text>
                        </View>
                        {selectedSubTeacher?.id === t.id && <Icons.CheckMark size={18} color={theme.colors.primary[500]} />}
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}

              {/* Activity name */}
              {overrideMode === "activity" && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Activity Name</Text>
                  <TextInput
                    style={styles.textInput}
                    value={activityLabel}
                    onChangeText={setActivityLabel}
                    placeholder="e.g. Sports Day, Assembly…"
                    placeholderTextColor={theme.colors.text[400]}
                  />
                  <Text style={styles.presetsLabel}>Quick select:</Text>
                  <View style={styles.presetsRow}>
                    {ACTIVITY_PRESETS.map((a) => (
                      <TouchableOpacity
                        key={a}
                        style={[styles.presetChip, activityLabel === a && styles.presetChipActive]}
                        onPress={() => setActivityLabel(a)}
                      >
                        <Text style={[styles.presetChipText, activityLabel === a && styles.presetChipTextActive]}>{a}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Cancellation info */}
              {overrideMode === "cancelled" && (
                <View style={[styles.needsCoverageBadge, { marginBottom: theme.spacing.m, backgroundColor: theme.colors.danger + "12" }]}>
                  <Icons.AlertCircle size={14} color={theme.colors.danger} />
                  <Text style={[styles.needsCoverageText, { color: theme.colors.danger }]}>
                    Students will see this class as cancelled in their schedule.
                  </Text>
                </View>
              )}

              {/* Optional note */}
              {overrideMode && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Note (optional)</Text>
                  <TextInput
                    style={[styles.textInput, { minHeight: 70 }]}
                    value={overrideNote}
                    onChangeText={setOverrideNote}
                    placeholder="Additional info for students / staff…"
                    placeholderTextColor={theme.colors.text[400]}
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              )}

              {overrideMode && (
                <PrimaryButton
                  title="Save Override"
                  onPress={handleSaveOverride}
                  loading={overrideSaving}
                  leftIcon={<Icons.CheckMark size={18} color="#fff" />}
                  style={{ marginTop: theme.spacing.s }}
                />
              )}
            </ScrollView>
          )}
        </ScreenContainer>
      </Modal>

      <ConfirmationDialog
        visible={!!restoreTarget}
        title="Restore Original Class?"
        message="This will remove the override and restore the original scheduled class."
        confirmLabel="Restore"
        onConfirm={handleRestoreConfirm}
        onCancel={() => setRestoreTarget(null)}
        loading={restoring}
        destructive
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  coverageBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.s,
    backgroundColor: theme.colors.warning + "18",
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.warning + "30",
  },
  coverageBannerText: { ...theme.typography.bodySmall, color: theme.colors.warning, fontWeight: "500" },

  card: {
    borderRadius: theme.radius.l,
    padding: theme.spacing.m,
    marginBottom: theme.spacing.s,
    borderWidth: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginBottom: theme.spacing.xs,
  },
  statusBadgeText: { ...theme.typography.bodySmall, fontWeight: "600" },

  cardTimeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: theme.spacing.s,
    paddingBottom: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  cardTime: { ...theme.typography.bodySmall, fontWeight: "600", color: theme.colors.primary[500] },
  cardContent: { gap: 5 },
  cardSubject: { ...theme.typography.body, fontWeight: "600", color: theme.colors.text[900] },
  textStrikethrough: { textDecorationLine: "line-through", color: theme.colors.text[400] },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  cardDetail: { ...theme.typography.bodySmall, color: theme.colors.text[500], flex: 1 },

  actionRow: {
    flexDirection: "row",
    gap: theme.spacing.s,
    marginTop: theme.spacing.s,
    paddingTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    justifyContent: "flex-end",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: theme.spacing.s,
    paddingVertical: 6,
    borderRadius: theme.radius.s,
  },
  actionBtnText: { color: "#fff", fontWeight: "600", fontSize: 12 },
  actionBtnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: theme.spacing.s,
    paddingVertical: 6,
    borderRadius: theme.radius.s,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionBtnSecondaryText: { color: theme.colors.text[500], fontWeight: "500", fontSize: 12 },

  // Modal styles
  slotInfoCard: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.m,
    padding: theme.spacing.m,
    marginBottom: theme.spacing.m,
    gap: 4,
  },
  slotSubject: { ...theme.typography.h3, color: theme.colors.text[900] },
  slotMeta: { ...theme.typography.bodySmall, color: theme.colors.text[500] },
  needsCoverageBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    backgroundColor: theme.colors.danger + "12",
    borderRadius: theme.radius.s,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  needsCoverageText: { ...theme.typography.bodySmall, color: theme.colors.danger, flex: 1 },

  sectionTitle: { ...theme.typography.label, color: theme.colors.text[700], marginBottom: theme.spacing.xs },
  section: { marginBottom: theme.spacing.m },

  overrideTypeBtns: { flexDirection: "row", gap: theme.spacing.xs, marginBottom: theme.spacing.m },
  overrideTypeBtn: {
    flex: 1,
    padding: theme.spacing.s,
    borderRadius: theme.radius.m,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    gap: 4,
  },
  overrideTypeBtnText: { ...theme.typography.bodySmall, fontWeight: "600", color: theme.colors.text[700] },
  overrideTypeBtnSub: { fontSize: 10, color: theme.colors.text[400], textAlign: "center" },

  textInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.m,
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.s,
    ...theme.typography.body,
    color: theme.colors.text[900],
    marginBottom: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
  },

  emptyHint: { ...theme.typography.body, color: theme.colors.text[400], textAlign: "center", padding: theme.spacing.m },

  teacherRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.s,
    padding: theme.spacing.s,
    borderRadius: theme.radius.m,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.xs,
  },
  teacherRowSelected: { borderColor: theme.colors.primary[500], backgroundColor: theme.colors.primary[50] },
  teacherAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary[100],
    alignItems: "center",
    justifyContent: "center",
  },
  teacherAvatarText: { ...theme.typography.body, fontWeight: "700", color: theme.colors.primary[500] },
  teacherName: { ...theme.typography.body, fontWeight: "600", color: theme.colors.text[900] },
  teacherMeta: { ...theme.typography.bodySmall, color: theme.colors.text[400] },

  presetsLabel: { ...theme.typography.bodySmall, color: theme.colors.text[400], marginBottom: theme.spacing.xs },
  presetsRow: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.xs },
  presetChip: {
    paddingHorizontal: theme.spacing.s,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  presetChipActive: { borderColor: "#7C3AED", backgroundColor: "#7C3AED18" },
  presetChipText: { ...theme.typography.bodySmall, color: theme.colors.text[500] },
  presetChipTextActive: { color: "#7C3AED", fontWeight: "600" },
});
