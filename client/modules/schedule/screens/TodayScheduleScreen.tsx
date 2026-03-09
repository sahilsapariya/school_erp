import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/common/constants/colors";
import { Spacing, Layout } from "@/common/constants/spacing";
import { useSchedule } from "../hooks/useSchedule";
import { ScheduleSlot } from "../types";
import { usePermissions } from "@/modules/permissions/hooks/usePermissions";
import { isTeacher, isStudent } from "@/common/constants/navigation";
import { teacherService } from "@/modules/teachers/services/teacherService";
import { Teacher } from "@/modules/teachers/types";
import * as PERMS from "@/modules/permissions/constants/permissions";

const ACTIVITY_PRESETS = [
  "Sports Day",
  "Assembly",
  "Library Session",
  "Field Trip",
  "Cultural Programme",
  "Exam Preparation",
  "Free Period",
  "Movie / Documentary",
];

export default function TodayScheduleScreen() {
  const router = useRouter();
  const { slots, loading, error, fetchTodaysSchedule, upsertOverride, removeOverride } = useSchedule();
  const { permissions, hasPermission } = usePermissions();

  const teacherView = isTeacher(permissions);
  const studentView = isStudent(permissions);
  const canManage = hasPermission(PERMS.TIMETABLE_MANAGE);

  // Override modal state
  const [overrideModalSlot, setOverrideModalSlot] = useState<ScheduleSlot | null>(null);
  const [overrideMode, setOverrideMode] = useState<"substitute" | "activity" | "cancelled" | null>(null);
  const [substituteTeachers, setSubstituteTeachers] = useState<Teacher[]>([]);
  const [selectedSubTeacher, setSelectedSubTeacher] = useState<Teacher | null>(null);
  const [activityLabel, setActivityLabel] = useState("");
  const [overrideNote, setOverrideNote] = useState("");
  const [overrideSaving, setOverrideSaving] = useState(false);
  const [teacherSearchQuery, setTeacherSearchQuery] = useState("");

  useEffect(() => {
    fetchTodaysSchedule();
  }, [fetchTodaysSchedule]);

  const filteredTeachers = substituteTeachers.filter((t) =>
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
    // Pre-fill from existing override
    if (slot.override) {
      setOverrideMode(slot.override.override_type);
      setActivityLabel(slot.override.activity_label ?? "");
      setOverrideNote(slot.override.note ?? "");
    }
    // Load teachers for substitution
    try {
      const teachers = await teacherService.getTeachers({ status: "active" });
      // Exclude original teacher
      setSubstituteTeachers(teachers.filter((t) => t.id !== slot.teacher_id));
    } catch {
      setSubstituteTeachers([]);
    }
  };

  const handleSaveOverride = async () => {
    if (!overrideModalSlot || !overrideMode) return;
    if (overrideMode === "substitute" && !selectedSubTeacher) {
      Alert.alert("Select Teacher", "Please select a substitute teacher.");
      return;
    }
    if (overrideMode === "activity" && !activityLabel.trim()) {
      Alert.alert("Enter Activity", "Please enter or select an activity name.");
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
      setOverrideModalSlot(null);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not save override");
    } finally {
      setOverrideSaving(false);
    }
  };

  const handleRemoveOverride = async (slot: ScheduleSlot) => {
    Alert.alert(
      "Restore Original Class?",
      "This will remove the override and restore the original scheduled class.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore",
          style: "destructive",
          onPress: async () => {
            try {
              await removeOverride(slot.slot_id);
            } catch (e: any) {
              Alert.alert("Error", e.message || "Could not remove override");
            }
          },
        },
      ]
    );
  };

  const getCardTheme = (slot: ScheduleSlot) => {
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
    const theme = getCardTheme(item);
    const isCancelled = theme === "cancelled";
    const isActivity = theme === "activity";
    const isSubstitute = theme === "substitute";
    const isWarning = theme === "warning";

    const cardStyle = [
      styles.card,
      isWarning && styles.cardWarning,
      isCancelled && styles.cardCancelled,
      isActivity && styles.cardActivity,
      isSubstitute && styles.cardSubstitute,
    ];

    return (
      <View style={cardStyle}>
        {/* Status badge */}
        {(isWarning || isCancelled || isActivity || isSubstitute) && (
          <View style={[
            styles.statusBadge,
            isWarning && styles.badgeWarning,
            isCancelled && styles.badgeCancelled,
            isActivity && styles.badgeActivity,
            isSubstitute && styles.badgeSubstitute,
          ]}>
            <Ionicons
              name={
                isCancelled ? "close-circle-outline"
                  : isActivity ? "fitness-outline"
                  : isSubstitute ? "swap-horizontal-outline"
                  : "alert-circle-outline"
              }
              size={13}
              color={
                isCancelled ? Colors.error
                  : isActivity ? "#7C3AED"
                  : isSubstitute ? "#0891b2"
                  : Colors.warning
              }
            />
            <Text style={[
              styles.statusBadgeText,
              isWarning && { color: Colors.warning },
              isCancelled && { color: Colors.error },
              isActivity && { color: "#7C3AED" },
              isSubstitute && { color: "#0891b2" },
            ]}>
              {isCancelled ? "Cancelled"
                : isActivity ? (item.override?.activity_label ?? "Activity")
                : isSubstitute ? `Substitute: ${item.override?.substitute_teacher_name ?? "Assigned"}`
                : item.teacher_on_leave ? "Teacher on Leave"
                : "Teacher Unavailable"}
            </Text>
          </View>
        )}

        <View style={styles.cardTimeBadge}>
          <Ionicons name="time-outline" size={16} color={isCancelled ? Colors.error : Colors.primary} />
          <Text style={[styles.cardTime, isCancelled && { color: Colors.error }]}>
            {item.start_time || "—"} – {item.end_time || "—"}
            {"  ·  "}P{item.period_number}
          </Text>
        </View>

        <View style={styles.cardContent}>
          <Text style={[styles.cardSubject, isCancelled && styles.textStrikethrough]}>
            {isCancelled ? (item.subject_name || "—") : isActivity ? (item.override?.activity_label ?? item.subject_name ?? "—") : (item.subject_name || "—")}
          </Text>
          {item.class_name && (
            <View style={styles.cardRow}>
              <Ionicons name="school-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.cardDetail}>{item.class_name}</Text>
            </View>
          )}
          <View style={styles.cardRow}>
            <Ionicons name="person-outline" size={14} color={isWarning || isCancelled ? Colors.error : Colors.textSecondary} />
            <Text style={[styles.cardDetail, (isWarning || isCancelled) && { color: Colors.error }]}>
              {isSubstitute
                ? item.override?.substitute_teacher_name ?? item.teacher_name ?? "—"
                : item.teacher_name || "—"}
              {(item.teacher_on_leave || item.teacher_unavailable) && !isSubstitute && !isCancelled && !isActivity
                ? " (unavailable)"
                : ""}
            </Text>
          </View>
          {item.override?.note && (
            <View style={styles.cardRow}>
              <Ionicons name="document-text-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.cardDetail}>{item.override.note}</Text>
            </View>
          )}
        </View>

        {/* Admin action row */}
        {canManage && (
          <View style={styles.actionRow}>
            {item.override ? (
              <TouchableOpacity
                style={styles.actionBtnSecondary}
                onPress={() => handleRemoveOverride(item)}
              >
                <Ionicons name="refresh-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.actionBtnSecondaryText}>Restore Original</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[styles.actionBtn, isWarning && styles.actionBtnUrgent]}
              onPress={() => openOverrideModal(item)}
            >
              <Ionicons name="settings-outline" size={14} color="#fff" />
              <Text style={styles.actionBtnText}>
                {item.override ? "Edit Override" : isWarning ? "Assign Coverage" : "Override"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.backRow}>
          <TouchableOpacity style={styles.backIcon} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Today&apos;s Schedule</Text>
            <Text style={styles.headerSubtitle}>
              {teacherView ? "Your teaching schedule"
                : studentView ? "Your classes today"
                : "Today's lectures"}
            </Text>
          </View>
          <TouchableOpacity onPress={fetchTodaysSchedule} style={styles.refreshBtn}>
            <Ionicons name="refresh-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Coverage summary banner */}
      {canManage && !loading && slots.some((s) => s.needs_coverage && !s.override) && (
        <View style={styles.coverageBanner}>
          <Ionicons name="warning-outline" size={18} color={Colors.warning} />
          <Text style={styles.coverageBannerText}>
            {slots.filter((s) => s.needs_coverage && !s.override).length} class(es) need teacher coverage today
          </Text>
        </View>
      )}

      {loading && slots.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchTodaysSchedule}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={slots}
          keyExtractor={(item, i) => item.slot_id ?? String(i)}
          renderItem={renderSlotCard}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchTodaysSchedule} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={64} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>{getEmptyMessage()}</Text>
            </View>
          }
        />
      )}

      {/* Override Modal */}
      <Modal visible={!!overrideModalSlot} animationType="slide" presentationStyle="formSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Override Class</Text>
            <TouchableOpacity onPress={() => setOverrideModalSlot(null)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          {overrideModalSlot && (
            <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
              {/* Slot info */}
              <View style={styles.overrideSlotInfo}>
                <Text style={styles.overrideSlotSubject}>{overrideModalSlot.subject_name || "—"}</Text>
                <Text style={styles.overrideSlotMeta}>
                  {overrideModalSlot.class_name} · P{overrideModalSlot.period_number} · {overrideModalSlot.start_time}–{overrideModalSlot.end_time}
                </Text>
                {overrideModalSlot.needs_coverage && (
                  <View style={styles.needsCoverageBadge}>
                    <Ionicons name="alert-circle-outline" size={14} color={Colors.error} />
                    <Text style={styles.needsCoverageText}>
                      {overrideModalSlot.teacher_on_leave ? "Teacher on approved leave" : "Teacher marked unavailable"}
                    </Text>
                  </View>
                )}
              </View>

              {/* Override type selector */}
              <Text style={styles.overrideSectionTitle}>Select Override Type</Text>
              <View style={styles.overrideTypeBtns}>
                <TouchableOpacity
                  style={[styles.overrideTypeBtn, overrideMode === "substitute" && styles.overrideTypeBtnActive]}
                  onPress={() => setOverrideMode("substitute")}
                >
                  <Ionicons name="swap-horizontal-outline" size={20} color={overrideMode === "substitute" ? "#fff" : Colors.primary} />
                  <Text style={[styles.overrideTypeBtnText, overrideMode === "substitute" && styles.overrideTypeBtnTextActive]}>
                    Substitute
                  </Text>
                  <Text style={[styles.overrideTypeBtnSub, overrideMode === "substitute" && { color: "rgba(255,255,255,0.8)" }]}>
                    Assign another teacher
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.overrideTypeBtn, overrideMode === "activity" && styles.overrideTypeBtnActivityActive]}
                  onPress={() => setOverrideMode("activity")}
                >
                  <Ionicons name="fitness-outline" size={20} color={overrideMode === "activity" ? "#fff" : "#7C3AED"} />
                  <Text style={[styles.overrideTypeBtnText, overrideMode === "activity" && styles.overrideTypeBtnTextActive]}>
                    Activity
                  </Text>
                  <Text style={[styles.overrideTypeBtnSub, overrideMode === "activity" && { color: "rgba(255,255,255,0.8)" }]}>
                    Replace with activity
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.overrideTypeBtn, overrideMode === "cancelled" && styles.overrideTypeBtnCancelledActive]}
                  onPress={() => setOverrideMode("cancelled")}
                >
                  <Ionicons name="close-circle-outline" size={20} color={overrideMode === "cancelled" ? "#fff" : Colors.error} />
                  <Text style={[styles.overrideTypeBtnText, overrideMode === "cancelled" && styles.overrideTypeBtnTextActive]}>
                    Cancel
                  </Text>
                  <Text style={[styles.overrideTypeBtnSub, overrideMode === "cancelled" && { color: "rgba(255,255,255,0.8)" }]}>
                    Cancel this class
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Substitute teacher picker */}
              {overrideMode === "substitute" && (
                <View style={styles.overrideSection}>
                  <Text style={styles.overrideSectionTitle}>Select Substitute Teacher</Text>
                  <TextInput
                    style={styles.searchInput}
                    value={teacherSearchQuery}
                    onChangeText={setTeacherSearchQuery}
                    placeholder="Search by name or employee ID…"
                    clearButtonMode="while-editing"
                  />
                  {filteredTeachers.length === 0 ? (
                    <Text style={styles.noTeachersText}>No active teachers found</Text>
                  ) : (
                    filteredTeachers.map((t) => (
                      <TouchableOpacity
                        key={t.id}
                        style={[
                          styles.teacherRow,
                          selectedSubTeacher?.id === t.id && styles.teacherRowSelected,
                        ]}
                        onPress={() => setSelectedSubTeacher(t)}
                      >
                        <View style={styles.teacherAvatar}>
                          <Text style={styles.teacherAvatarText}>{t.name?.[0]?.toUpperCase() ?? "T"}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.teacherName}>{t.name}</Text>
                          <Text style={styles.teacherMeta}>{t.employee_id}{t.designation ? ` · ${t.designation}` : ""}</Text>
                        </View>
                        {selectedSubTeacher?.id === t.id && (
                          <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}

              {/* Activity label */}
              {overrideMode === "activity" && (
                <View style={styles.overrideSection}>
                  <Text style={styles.overrideSectionTitle}>Activity Name</Text>
                  <TextInput
                    style={styles.searchInput}
                    value={activityLabel}
                    onChangeText={setActivityLabel}
                    placeholder="e.g. Sports Day, Assembly…"
                  />
                  <Text style={styles.presetsLabel}>Quick select:</Text>
                  <View style={styles.presetsRow}>
                    {ACTIVITY_PRESETS.map((a) => (
                      <TouchableOpacity
                        key={a}
                        style={[styles.presetChip, activityLabel === a && styles.presetChipActive]}
                        onPress={() => setActivityLabel(a)}
                      >
                        <Text style={[styles.presetChipText, activityLabel === a && styles.presetChipTextActive]}>
                          {a}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Cancellation info */}
              {overrideMode === "cancelled" && (
                <View style={styles.overrideSection}>
                  <View style={[styles.needsCoverageBadge, { backgroundColor: Colors.error + "15" }]}>
                    <Ionicons name="information-circle-outline" size={16} color={Colors.error} />
                    <Text style={[styles.needsCoverageText, { color: Colors.error }]}>
                      Students will see this class as cancelled in their schedule.
                    </Text>
                  </View>
                </View>
              )}

              {/* Optional note */}
              {overrideMode && (
                <View style={styles.overrideSection}>
                  <Text style={styles.overrideSectionTitle}>Note (optional)</Text>
                  <TextInput
                    style={[styles.searchInput, { minHeight: 60 }]}
                    value={overrideNote}
                    onChangeText={setOverrideNote}
                    placeholder="Additional info for students / staff…"
                    multiline
                  />
                </View>
              )}

              {overrideMode && (
                <TouchableOpacity
                  style={[styles.saveOverrideBtn, overrideSaving && { opacity: 0.6 }]}
                  onPress={handleSaveOverride}
                  disabled={overrideSaving}
                >
                  {overrideSaving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={18} color="#fff" />
                      <Text style={styles.saveOverrideBtnText}>Save Override</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: Spacing.xl },
  header: { padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  backRow: { flexDirection: "row", alignItems: "center" },
  backIcon: { padding: Spacing.sm, marginRight: Spacing.sm },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: Colors.text },
  headerSubtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  refreshBtn: { padding: Spacing.sm },

  coverageBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.warning + "18",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.warning + "30",
  },
  coverageBannerText: { fontSize: 13, color: Colors.warning, fontWeight: "500" },

  listContent: { padding: Spacing.lg, paddingBottom: Spacing.xl },

  card: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cardWarning: {
    borderColor: Colors.warning + "60",
    backgroundColor: Colors.warning + "08",
  },
  cardCancelled: {
    borderColor: Colors.error + "50",
    backgroundColor: Colors.error + "07",
    opacity: 0.85,
  },
  cardActivity: {
    borderColor: "#7C3AED" + "40",
    backgroundColor: "#7C3AED" + "08",
  },
  cardSubstitute: {
    borderColor: "#0891b2" + "50",
    backgroundColor: "#0891b2" + "07",
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginBottom: Spacing.sm,
  },
  badgeWarning: { backgroundColor: Colors.warning + "20" },
  badgeCancelled: { backgroundColor: Colors.error + "18" },
  badgeActivity: { backgroundColor: "#7C3AED" + "18" },
  badgeSubstitute: { backgroundColor: "#0891b2" + "18" },
  statusBadgeText: { fontSize: 12, fontWeight: "600" },

  cardTimeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  cardTime: { fontSize: 14, fontWeight: "600", color: Colors.primary },
  cardContent: { gap: 6 },
  cardSubject: { fontSize: 17, fontWeight: "600", color: Colors.text },
  textStrikethrough: { textDecorationLine: "line-through", color: Colors.textSecondary },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardDetail: { fontSize: 14, color: Colors.textSecondary, flex: 1 },

  actionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    justifyContent: "flex-end",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Layout.borderRadius.sm,
  },
  actionBtnUrgent: { backgroundColor: Colors.warning },
  actionBtnText: { color: "#fff", fontWeight: "600", fontSize: 12 },
  actionBtnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Layout.borderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  actionBtnSecondaryText: { color: Colors.textSecondary, fontWeight: "500", fontSize: 12 },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.xxl,
  },
  emptyText: { fontSize: 16, color: Colors.textSecondary, textAlign: "center", marginTop: Spacing.lg, lineHeight: 24 },
  errorText: { fontSize: 16, color: Colors.error, textAlign: "center", marginBottom: Spacing.lg },
  retryBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Layout.borderRadius.md,
  },
  retryBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },

  // Override Modal
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalTitle: { fontSize: 18, fontWeight: "600", color: Colors.text },
  modalBody: { padding: Spacing.lg, paddingBottom: Spacing.xxl },

  overrideSlotInfo: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: 4,
  },
  overrideSlotSubject: { fontSize: 17, fontWeight: "700", color: Colors.text },
  overrideSlotMeta: { fontSize: 13, color: Colors.textSecondary },
  needsCoverageBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    backgroundColor: Colors.error + "12",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  needsCoverageText: { fontSize: 12, color: Colors.error, flex: 1 },

  overrideSectionTitle: { fontSize: 14, fontWeight: "600", color: Colors.text, marginBottom: Spacing.sm },
  overrideSection: { marginBottom: Spacing.lg },

  overrideTypeBtns: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.lg },
  overrideTypeBtn: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: "center",
    gap: 4,
  },
  overrideTypeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  overrideTypeBtnActivityActive: { backgroundColor: "#7C3AED", borderColor: "#7C3AED" },
  overrideTypeBtnCancelledActive: { backgroundColor: Colors.error, borderColor: Colors.error },
  overrideTypeBtnText: { fontSize: 13, fontWeight: "600", color: Colors.text },
  overrideTypeBtnTextActive: { color: "#fff" },
  overrideTypeBtnSub: { fontSize: 10, color: Colors.textSecondary, textAlign: "center" },

  searchInput: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: Layout.borderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 14,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },

  noTeachersText: { fontSize: 13, color: Colors.textSecondary, textAlign: "center", padding: Spacing.md },

  teacherRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.sm,
  },
  teacherRowSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary + "0A" },
  teacherAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  teacherAvatarText: { fontSize: 15, fontWeight: "700", color: Colors.primary },
  teacherName: { fontSize: 14, fontWeight: "600", color: Colors.text },
  teacherMeta: { fontSize: 12, color: Colors.textSecondary },

  presetsLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: Spacing.sm },
  presetsRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  presetChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.backgroundSecondary,
  },
  presetChipActive: { borderColor: "#7C3AED", backgroundColor: "#7C3AED" + "18" },
  presetChipText: { fontSize: 12, color: Colors.textSecondary },
  presetChipTextActive: { color: "#7C3AED", fontWeight: "600" },

  saveOverrideBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: Layout.borderRadius.md,
    marginTop: Spacing.sm,
  },
  saveOverrideBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
