import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Dimensions,
  Modal,
  Switch,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/common/constants/colors";
import { Spacing, Layout } from "@/common/constants/spacing";
import { useTimetable } from "../hooks/useTimetable";
import { usePermissions } from "@/modules/permissions/hooks/usePermissions";
import * as PERMS from "@/modules/permissions/constants/permissions";
import { classService } from "@/modules/classes/services/classService";
import { TimetableSlot, SlotConflict } from "../types";
import { GenerateResult } from "../services/timetableService";
import { SlotModal } from "../components/SlotModal";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DEFAULT_PERIODS = 8;

function formatConflicts(conflicts: SlotConflict[]): string {
  return conflicts.map((c) => `• ${c.message}`).join("\n");
}

export default function WeeklyTimetableScreen() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const router = useRouter();
  const {
    slots,
    config,
    loading,
    error,
    fetchSlots,
    fetchConfig,
    updateConfig,
    createSlot,
    updateSlot,
    deleteSlot,
    moveSlot,
    swapSlots,
    generateTimetable,
  } = useTimetable(classId);
  const { hasPermission } = usePermissions();

  const canCreate = hasPermission(PERMS.TIMETABLE_CREATE) || hasPermission(PERMS.TIMETABLE_MANAGE);
  const canUpdate = hasPermission(PERMS.TIMETABLE_UPDATE) || hasPermission(PERMS.TIMETABLE_MANAGE);
  const canDelete = hasPermission(PERMS.TIMETABLE_DELETE) || hasPermission(PERMS.TIMETABLE_MANAGE);
  const canManage = hasPermission(PERMS.TIMETABLE_MANAGE);

  const [className, setClassName] = useState<string>("");
  const [slotModalVisible, setSlotModalVisible] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);
  const [addCell, setAddCell] = useState<{ day: number; period: number } | null>(null);

  // Move/swap mode: long-press selects a slot, then tap target to move/swap
  const [selectedSlot, setSelectedSlot] = useState<TimetableSlot | null>(null);
  const [moveLoading, setMoveLoading] = useState(false);

  // Generate timetable state
  const [genModalVisible, setGenModalVisible] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<GenerateResult | null>(null);

  React.useEffect(() => {
    if (classId) {
      classService.getClassDetail(classId).then((c) => setClassName(`${c.name}-${c.section}`)).catch(() => setClassName("Class"));
    }
  }, [classId]);

  const slotsMap = useMemo(() => {
    const map = new Map<string, TimetableSlot>();
    slots.forEach((s) => map.set(`${s.day_of_week}-${s.period_number}`, s));
    return map;
  }, [slots]);

  const maxPeriod = useMemo(() => {
    if (slots.length === 0) return DEFAULT_PERIODS;
    return Math.max(...slots.map((s) => s.period_number), DEFAULT_PERIODS);
  }, [slots]);

  const exitMoveMode = () => setSelectedSlot(null);

  const handleAddSlot = (day: number, period: number) => {
    setAddCell({ day, period });
    setEditingSlot(null);
    setSlotModalVisible(true);
  };

  const handleEditSlot = (slot: TimetableSlot) => {
    setEditingSlot(slot);
    setAddCell(null);
    setSlotModalVisible(true);
  };

  const handleDeleteSlot = (slot: TimetableSlot) => {
    Alert.alert(
      "Delete Slot",
      `Remove ${slot.subject_name || "Subject"} from this slot?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteSlot(slot.id);
              if (selectedSlot?.id === slot.id) exitMoveMode();
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to delete slot");
            }
          },
        },
      ]
    );
  };

  const handleSelectForMove = (slot: TimetableSlot) => {
    if (selectedSlot?.id === slot.id) {
      exitMoveMode();
    } else {
      setSelectedSlot(slot);
    }
  };

  const handleMoveToEmpty = async (day: number, period: number) => {
    if (!selectedSlot || moveLoading) return;
    setMoveLoading(true);
    try {
      const result = await moveSlot(selectedSlot.id, day, period);
      if (result.conflicts && result.conflicts.length > 0) {
        Alert.alert(
          "Cannot Move Slot",
          formatConflicts(result.conflicts),
        );
      } else {
        exitMoveMode();
      }
    } catch (err: any) {
      Alert.alert("Move Failed", err.message || "Could not move slot");
    } finally {
      setMoveLoading(false);
    }
  };

  const handleSwapWith = async (targetSlot: TimetableSlot) => {
    if (!selectedSlot || moveLoading) return;
    if (selectedSlot.id === targetSlot.id) {
      exitMoveMode();
      return;
    }

    const srcLabel = `${selectedSlot.subject_name || "Slot"} (${DAY_NAMES[selectedSlot.day_of_week]} P${selectedSlot.period_number})`;
    const destLabel = `${targetSlot.subject_name || "Slot"} (${DAY_NAMES[targetSlot.day_of_week]} P${targetSlot.period_number})`;

    Alert.alert(
      "Swap Slots",
      `Swap ${srcLabel} with ${destLabel}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Swap",
          onPress: async () => {
            setMoveLoading(true);
            try {
              const result = await swapSlots(selectedSlot.id, targetSlot.id);
              if (result.conflicts && result.conflicts.length > 0) {
                Alert.alert(
                  "Cannot Swap Slots",
                  formatConflicts(result.conflicts),
                );
              } else {
                exitMoveMode();
              }
            } catch (err: any) {
              Alert.alert("Swap Failed", err.message || "Could not swap slots");
            } finally {
              setMoveLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCellPress = (dayIndex: number, period: number, slot: TimetableSlot | undefined) => {
    if (selectedSlot) {
      if (slot) {
        handleSwapWith(slot);
      } else {
        handleMoveToEmpty(dayIndex, period);
      }
      return;
    }

    if (slot && canUpdate) handleEditSlot(slot);
    else if (!slot && canCreate) handleAddSlot(dayIndex, period);
  };

  const handleCellLongPress = (slot: TimetableSlot | undefined) => {
    if (!slot) return;
    if (selectedSlot) {
      handleDeleteSlot(slot);
    } else if (canUpdate) {
      handleSelectForMove(slot);
    }
  };

  const handleSlotSubmit = async (data: {
    subject_id: string;
    teacher_id: string;
    day_of_week: number;
    period_number: number;
    start_time: string;
    end_time: string;
    room?: string;
  }) => {
    if (!classId) return;
    try {
      if (editingSlot) {
        await updateSlot(editingSlot.id, data);
      } else {
        await createSlot({ class_id: classId, ...data });
      }
      setSlotModalVisible(false);
      setEditingSlot(null);
      setAddCell(null);
    } catch (err: any) {
      throw err;
    }
  };

  const handleCloseModal = () => {
    setSlotModalVisible(false);
    setEditingSlot(null);
    setAddCell(null);
  };

  const [configSaving, setConfigSaving] = useState(false);
  // Store as strings so user can fully clear input before retyping
  const [rawConfig, setRawConfig] = useState({
    general_class_duration_minutes: "45",
    first_class_duration_minutes: "50",
    gap_between_classes_minutes: "5",
    periods_per_day: "8",
    school_start_time: "08:00",
  });
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [timePickerHour, setTimePickerHour] = useState(8);
  const [timePickerMinute, setTimePickerMinute] = useState(0);

  const handleOpenGenModal = () => {
    setOverwrite(false);
    setGenResult(null);
    setGenModalVisible(true);
    fetchConfig();
  };

  useEffect(() => {
    if (config && genModalVisible) {
      setRawConfig({
        general_class_duration_minutes: String(config.general_class_duration_minutes ?? 45),
        first_class_duration_minutes: String(config.first_class_duration_minutes ?? 50),
        gap_between_classes_minutes: String(config.gap_between_classes_minutes ?? 5),
        periods_per_day: String(config.periods_per_day ?? 8),
        school_start_time: config.school_start_time ?? "08:00",
      });
    }
  }, [config, genModalVisible]);

  const openTimePicker = () => {
    const parts = rawConfig.school_start_time.split(":");
    setTimePickerHour(parseInt(parts[0], 10) || 8);
    setTimePickerMinute(parseInt(parts[1], 10) || 0);
    setTimePickerVisible(true);
  };

  const confirmTimePicker = () => {
    const h = String(timePickerHour).padStart(2, "0");
    const m = String(timePickerMinute).padStart(2, "0");
    setRawConfig((c) => ({ ...c, school_start_time: `${h}:${m}` }));
    setTimePickerVisible(false);
  };

  const handleSaveConfig = async () => {
    const parsed = {
      general_class_duration_minutes: parseInt(rawConfig.general_class_duration_minutes, 10) || 45,
      first_class_duration_minutes: parseInt(rawConfig.first_class_duration_minutes, 10) || 50,
      gap_between_classes_minutes: parseInt(rawConfig.gap_between_classes_minutes, 10) || 5,
      periods_per_day: parseInt(rawConfig.periods_per_day, 10) || 8,
      school_start_time: rawConfig.school_start_time || "08:00",
    };
    try {
      setConfigSaving(true);
      await updateConfig(parsed);
      Alert.alert("Saved", "Timetable configuration saved for your school.");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not save config");
    } finally {
      setConfigSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (overwrite && slots.length > 0) {
      Alert.alert(
        "Overwrite Existing Timetable?",
        "This will delete all existing slots for this class and regenerate from scratch. Are you sure?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Yes, Overwrite", style: "destructive", onPress: () => runGenerate() },
        ]
      );
    } else {
      runGenerate();
    }
  };

  const runGenerate = async () => {
    try {
      setGenerating(true);
      const result = await generateTimetable(overwrite);
      setGenResult(result);
    } catch (e: any) {
      Alert.alert("Generation Failed", e.message || "Could not generate timetable. Make sure subject loads and teacher expertise are configured.");
      setGenModalVisible(false);
    } finally {
      setGenerating(false);
    }
  };

  const cellWidth = (Dimensions.get("window").width - Spacing.lg * 2 - 44) / 7;

  if (!classId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Class not found</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {className || "Timetable"}
        </Text>
        {canManage && (
          <TouchableOpacity style={styles.generateBtn} onPress={handleOpenGenModal}>
            <Ionicons name="flash-outline" size={16} color="#fff" />
            <Text style={styles.generateBtnText}>Generate</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Move mode banner */}
      {selectedSlot && (
        <View style={styles.moveBanner}>
          <View style={styles.moveBannerContent}>
            <Ionicons name="move-outline" size={18} color="#fff" />
            <Text style={styles.moveBannerText} numberOfLines={1}>
              Moving: {selectedSlot.subject_name || "Slot"} ({DAY_NAMES[selectedSlot.day_of_week]} P{selectedSlot.period_number})
            </Text>
          </View>
          <TouchableOpacity style={styles.moveBannerCancel} onPress={exitMoveMode}>
            <Text style={styles.moveBannerCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {moveLoading && (
        <View style={styles.moveLoadingBar}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.moveLoadingText}>Processing...</Text>
        </View>
      )}

      {loading && slots.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchSlots}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={styles.scrollContent}
        >
          <ScrollView
            showsVerticalScrollIndicator={true}
            style={styles.verticalScroll}
          >
            <View style={styles.grid}>
              {/* Header row */}
              <View style={styles.headerRow}>
                <View style={[styles.cell, styles.periodHeader, { width: 44 }]}>
                  <Text style={styles.periodHeaderText}>#</Text>
                </View>
                {DAYS.map((day, i) => (
                  <View
                    key={day}
                    style={[styles.cell, styles.dayHeader, { width: Math.max(cellWidth, 56) }]}
                  >
                    <Text style={styles.dayHeaderText}>{day}</Text>
                  </View>
                ))}
              </View>

              {/* Data rows */}
              {Array.from({ length: maxPeriod }, (_, i) => i + 1).map((period) => (
                <View key={period} style={styles.dataRow}>
                  <View style={[styles.cell, styles.periodCell, { width: 44 }]}>
                    <Text style={styles.periodText}>{period}</Text>
                  </View>
                  {DAYS.map((_, dayIndex) => {
                    const slot = slotsMap.get(`${dayIndex}-${period}`);
                    const isEmpty = !slot;
                    const isSelected = selectedSlot && slot && selectedSlot.id === slot.id;
                    const isTarget = selectedSlot && !isSelected;

                    return (
                      <TouchableOpacity
                        key={`${dayIndex}-${period}`}
                        style={[
                          styles.cell,
                          styles.slotCell,
                          { width: Math.max(cellWidth, 56) },
                          isEmpty && styles.emptyCell,
                          isSelected && styles.selectedCell,
                          isTarget && isEmpty && styles.targetEmptyCell,
                          isTarget && !isEmpty && styles.targetFilledCell,
                        ]}
                        onPress={() => handleCellPress(dayIndex, period, slot)}
                        onLongPress={() => handleCellLongPress(slot)}
                        activeOpacity={0.7}
                        disabled={moveLoading}
                      >
                        {slot ? (
                          <View style={styles.slotContent}>
                            {isSelected && (
                              <View style={styles.selectedBadge}>
                                <Ionicons name="move-outline" size={10} color="#fff" />
                              </View>
                            )}
                            <Text style={[styles.slotSubject, isSelected && styles.selectedText]} numberOfLines={1}>
                              {slot.subject_name || "—"}
                            </Text>
                            <Text style={styles.slotTeacher} numberOfLines={1}>
                              {slot.teacher_name || "—"}
                            </Text>
                            <Text style={styles.slotTime} numberOfLines={1}>
                              {slot.start_time}–{slot.end_time}
                            </Text>
                            {isTarget && !isEmpty && (
                              <Text style={styles.swapHint}>Tap to swap</Text>
                            )}
                          </View>
                        ) : (
                          <View style={styles.emptyContent}>
                            {selectedSlot ? (
                              <Ionicons name="arrow-forward-circle-outline" size={22} color={Colors.primary} />
                            ) : canCreate ? (
                              <Ionicons name="add-circle-outline" size={24} color={Colors.textTertiary} />
                            ) : null}
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        </ScrollView>
      )}

      <SlotModal
        visible={slotModalVisible}
        onClose={handleCloseModal}
        onSubmit={handleSlotSubmit}
        classId={classId}
        initialSlot={editingSlot}
        initialDay={editingSlot?.day_of_week ?? addCell?.day ?? 0}
        initialPeriod={editingSlot?.period_number ?? addCell?.period ?? 1}
        mode={editingSlot ? "edit" : "create"}
      />

      {/* Generate Timetable Modal */}
      <Modal visible={genModalVisible} animationType="slide" presentationStyle="formSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Generate Timetable</Text>
            <TouchableOpacity onPress={() => setGenModalVisible(false)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          {genResult ? (
            // Result view
            <ScrollView style={{ padding: Spacing.lg }}>
              <View style={styles.resultSummary}>
                <Ionicons
                  name={genResult.conflicts.length === 0 ? "checkmark-circle" : "warning"}
                  size={48}
                  color={genResult.conflicts.length === 0 ? Colors.success : Colors.warning}
                />
                <Text style={styles.resultTitle}>
                  {genResult.conflicts.length === 0 ? "Generated Successfully!" : "Generated with Conflicts"}
                </Text>
                <View style={styles.resultStats}>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{genResult.slots_created}</Text>
                    <Text style={styles.statLabel}>Slots Created</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{genResult.total_periods_needed}</Text>
                    <Text style={styles.statLabel}>Periods Needed</Text>
                  </View>
                  <View style={[styles.statBox, { borderColor: genResult.conflicts.length > 0 ? Colors.warning : Colors.success }]}>
                    <Text style={[styles.statValue, { color: genResult.conflicts.length > 0 ? Colors.warning : Colors.success }]}>
                      {genResult.conflicts.length}
                    </Text>
                    <Text style={styles.statLabel}>Conflicts</Text>
                  </View>
                </View>
              </View>

              {genResult.conflicts.length > 0 && (
                <View style={styles.conflictsSection}>
                  <Text style={styles.conflictsTitle}>Unresolved Conflicts</Text>
                  <Text style={styles.conflictsHint}>
                    These slots could not be assigned. Check teacher expertise, availability, and workload rules.
                  </Text>
                  {genResult.conflicts.map((c, i) => (
                    <View key={i} style={styles.conflictRow}>
                      <Ionicons name="alert-circle-outline" size={16} color={Colors.warning} />
                      <Text style={styles.conflictText}>{c.reason}</Text>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity style={styles.doneBtn} onPress={() => setGenModalVisible(false)}>
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            // Config + Generate view
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={{ flex: 1 }}
            >
              <ScrollView style={{ padding: Spacing.lg }} keyboardShouldPersistTaps="handled">
                <Text style={styles.configSectionTitle}>Timetable Configuration</Text>
                <Text style={styles.configSectionHint}>
                  Configure schedule settings for your school. These are saved and reused.
                </Text>

                <View style={styles.configRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.configLabel}>Class duration (min)</Text>
                    <Text style={styles.configSubLabel}>Standard period length</Text>
                  </View>
                  <TextInput
                    style={styles.configInput}
                    value={rawConfig.general_class_duration_minutes}
                    onChangeText={(v) =>
                      setRawConfig((c) => ({ ...c, general_class_duration_minutes: v.replace(/[^0-9]/g, "") }))
                    }
                    keyboardType="number-pad"
                    placeholder="45"
                    maxLength={3}
                  />
                </View>
                <View style={styles.configRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.configLabel}>First class duration (min)</Text>
                    <Text style={styles.configSubLabel}>Usually longer (assembly etc.)</Text>
                  </View>
                  <TextInput
                    style={styles.configInput}
                    value={rawConfig.first_class_duration_minutes}
                    onChangeText={(v) =>
                      setRawConfig((c) => ({ ...c, first_class_duration_minutes: v.replace(/[^0-9]/g, "") }))
                    }
                    keyboardType="number-pad"
                    placeholder="50"
                    maxLength={3}
                  />
                </View>
                <View style={styles.configRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.configLabel}>Gap between classes (min)</Text>
                    <Text style={styles.configSubLabel}>Transition/passing time</Text>
                  </View>
                  <TextInput
                    style={styles.configInput}
                    value={rawConfig.gap_between_classes_minutes}
                    onChangeText={(v) =>
                      setRawConfig((c) => ({ ...c, gap_between_classes_minutes: v.replace(/[^0-9]/g, "") }))
                    }
                    keyboardType="number-pad"
                    placeholder="5"
                    maxLength={2}
                  />
                </View>
                <View style={styles.configRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.configLabel}>Periods per day</Text>
                    <Text style={styles.configSubLabel}>Max teaching periods</Text>
                  </View>
                  <TextInput
                    style={styles.configInput}
                    value={rawConfig.periods_per_day}
                    onChangeText={(v) =>
                      setRawConfig((c) => ({ ...c, periods_per_day: v.replace(/[^0-9]/g, "") }))
                    }
                    keyboardType="number-pad"
                    placeholder="8"
                    maxLength={2}
                  />
                </View>
                <View style={styles.configRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.configLabel}>School start time</Text>
                    <Text style={styles.configSubLabel}>First period begins at</Text>
                  </View>
                  <TouchableOpacity style={styles.timePickerBtn} onPress={openTimePicker}>
                    <Ionicons name="time-outline" size={16} color={Colors.primary} />
                    <Text style={styles.timePickerBtnText}>{rawConfig.school_start_time}</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.saveConfigBtn, configSaving && { opacity: 0.6 }]}
                  onPress={handleSaveConfig}
                  disabled={configSaving}
                >
                  {configSaving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveConfigBtnText}>Save Configuration</Text>
                  )}
                </TouchableOpacity>

                <View style={styles.infoBox}>
                  <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
                  <Text style={styles.infoText}>
                    The generator fills the timetable using subject loads, teacher expertise,
                    availability, leaves, and workload rules. First period each day is prioritized
                    for the class teacher. Same teacher can teach multiple subjects to this class.
                  </Text>
                </View>

                <View style={styles.overwriteRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.overwriteLabel}>Overwrite existing slots</Text>
                  <Text style={styles.overwriteHint}>
                    If ON, all current slots are deleted and the full schedule is regenerated. If OFF, only empty slots are filled.
                  </Text>
                </View>
                <Switch
                  value={overwrite}
                  onValueChange={setOverwrite}
                  trackColor={{ true: Colors.error, false: Colors.borderLight }}
                  thumbColor={overwrite ? Colors.error : Colors.textSecondary}
                />
              </View>

              {overwrite && (
                <View style={styles.warningBox}>
                  <Ionicons name="warning-outline" size={18} color={Colors.error} />
                  <Text style={styles.warningText}>
                    This will delete all {slots.length} existing slot{slots.length !== 1 ? "s" : ""} for this class.
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.generateConfirmBtn, generating && styles.generateConfirmBtnDisabled]}
                onPress={handleGenerate}
                disabled={generating}
              >
                {generating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="flash" size={18} color="#fff" />
                    <Text style={styles.generateConfirmBtnText}>Generate Timetable</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
            </KeyboardAvoidingView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Time Picker Modal */}
      <Modal visible={timePickerVisible} transparent animationType="fade">
        <View style={styles.timePickerOverlay}>
          <View style={styles.timePickerContainer}>
            <Text style={styles.timePickerTitle}>Select School Start Time</Text>
            <View style={styles.timePickerCols}>
              <View style={styles.timePickerCol}>
                <Text style={styles.timePickerColLabel}>Hour</Text>
                <TouchableOpacity
                  style={styles.timePickerArrow}
                  onPress={() => setTimePickerHour((h) => (h + 1) % 24)}
                >
                  <Ionicons name="chevron-up" size={22} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.timePickerValue}>
                  {String(timePickerHour).padStart(2, "0")}
                </Text>
                <TouchableOpacity
                  style={styles.timePickerArrow}
                  onPress={() => setTimePickerHour((h) => (h - 1 + 24) % 24)}
                >
                  <Ionicons name="chevron-down" size={22} color={Colors.primary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.timePickerColon}>:</Text>
              <View style={styles.timePickerCol}>
                <Text style={styles.timePickerColLabel}>Min</Text>
                <TouchableOpacity
                  style={styles.timePickerArrow}
                  onPress={() => setTimePickerMinute((m) => (m + 5) % 60)}
                >
                  <Ionicons name="chevron-up" size={22} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.timePickerValue}>
                  {String(timePickerMinute).padStart(2, "0")}
                </Text>
                <TouchableOpacity
                  style={styles.timePickerArrow}
                  onPress={() => setTimePickerMinute((m) => (m - 5 + 60) % 60)}
                >
                  <Ionicons name="chevron-down" size={22} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.timePickerActions}>
              <TouchableOpacity
                style={styles.timePickerCancel}
                onPress={() => setTimePickerVisible(false)}
              >
                <Text style={styles.timePickerCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.timePickerConfirm} onPress={confirmTimePicker}>
                <Text style={styles.timePickerConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: Spacing.xl },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backIcon: { padding: Spacing.sm },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "600", color: Colors.text, marginLeft: Spacing.md },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.sm,
  },
  generateBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  // Modal
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
  configSectionTitle: { fontSize: 16, fontWeight: "600", color: Colors.text, marginBottom: 4 },
  configSectionHint: { fontSize: 12, color: Colors.textSecondary, marginBottom: Spacing.md },
  configRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  configLabel: { fontSize: 14, color: Colors.text, fontWeight: "500" },
  configSubLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  configInput: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: Layout.borderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 14,
    color: Colors.text,
    minWidth: 80,
  },
  saveConfigBtn: {
    backgroundColor: Colors.primary + "99",
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.md,
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  saveConfigBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  timePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Layout.borderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minWidth: 90,
    justifyContent: "center",
  },
  timePickerBtnText: { fontSize: 14, fontWeight: "600", color: Colors.primary },
  timePickerOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: "center",
    alignItems: "center",
  },
  timePickerContainer: {
    backgroundColor: Colors.background,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.xl,
    width: 280,
    alignItems: "center",
  },
  timePickerTitle: { fontSize: 16, fontWeight: "600", color: Colors.text, marginBottom: Spacing.lg },
  timePickerCols: { flexDirection: "row", alignItems: "center", gap: Spacing.md, marginBottom: Spacing.xl },
  timePickerCol: { alignItems: "center", gap: Spacing.sm },
  timePickerColLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: "500" },
  timePickerArrow: { padding: Spacing.sm },
  timePickerValue: { fontSize: 40, fontWeight: "700", color: Colors.text, minWidth: 60, textAlign: "center" },
  timePickerColon: { fontSize: 36, fontWeight: "700", color: Colors.text, marginTop: 20 },
  timePickerActions: { flexDirection: "row", gap: Spacing.md, width: "100%" },
  timePickerCancel: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: "center",
  },
  timePickerCancelText: { color: Colors.textSecondary, fontWeight: "600" },
  timePickerConfirm: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: "center",
  },
  timePickerConfirmText: { color: "#fff", fontWeight: "600" },
  infoBox: {
    flexDirection: "row",
    gap: Spacing.sm,
    backgroundColor: Colors.primary + "12",
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    alignItems: "flex-start",
  },
  infoText: { flex: 1, fontSize: 13, color: Colors.text, lineHeight: 20 },
  overwriteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.md,
  },
  overwriteLabel: { fontSize: 15, fontWeight: "500", color: Colors.text },
  overwriteHint: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, lineHeight: 18 },
  warningBox: {
    flexDirection: "row",
    gap: Spacing.sm,
    backgroundColor: Colors.error + "12",
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    alignItems: "center",
  },
  warningText: { flex: 1, fontSize: 13, color: Colors.error },
  generateConfirmBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: Layout.borderRadius.md,
    marginTop: Spacing.lg,
  },
  generateConfirmBtnDisabled: { opacity: 0.6 },
  generateConfirmBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  // Result view
  resultSummary: { alignItems: "center", paddingVertical: Spacing.xl, gap: Spacing.md },
  resultTitle: { fontSize: 20, fontWeight: "700", color: Colors.text, textAlign: "center" },
  resultStats: { flexDirection: "row", gap: Spacing.md, marginTop: Spacing.sm },
  statBox: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: Layout.borderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    minWidth: 80,
  },
  statValue: { fontSize: 24, fontWeight: "700", color: Colors.text },
  statLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  conflictsSection: {
    marginTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.lg,
  },
  conflictsTitle: { fontSize: 15, fontWeight: "600", color: Colors.text, marginBottom: Spacing.sm },
  conflictsHint: { fontSize: 12, color: Colors.textSecondary, marginBottom: Spacing.md, lineHeight: 18 },
  conflictRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    alignItems: "flex-start",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  conflictText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  doneBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: Layout.borderRadius.md,
    alignItems: "center",
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  doneBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  // Move mode banner
  moveBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  moveBannerContent: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, flex: 1 },
  moveBannerText: { color: "#fff", fontSize: 13, fontWeight: "600", flex: 1 },
  moveBannerCancel: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Layout.borderRadius.sm,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  moveBannerCancelText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  moveLoadingBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.primary + "15",
  },
  moveLoadingText: { fontSize: 12, color: Colors.primary, fontWeight: "500" },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  verticalScroll: { maxHeight: 500 },
  grid: { minWidth: "100%" },
  headerRow: { flexDirection: "row", borderBottomWidth: 2, borderBottomColor: Colors.border },
  dataRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  cell: { padding: Spacing.sm, justifyContent: "center", alignItems: "center" },
  periodHeader: { backgroundColor: Colors.backgroundSecondary },
  periodHeaderText: { fontSize: 12, fontWeight: "700", color: Colors.textSecondary },
  dayHeader: { backgroundColor: Colors.backgroundSecondary },
  dayHeaderText: { fontSize: 12, fontWeight: "600", color: Colors.text },
  periodCell: { backgroundColor: Colors.backgroundSecondary },
  periodText: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
  slotCell: { backgroundColor: Colors.background, alignItems: "flex-start", minHeight: 72 },
  emptyCell: { backgroundColor: Colors.backgroundTertiary },
  selectedCell: {
    backgroundColor: Colors.primary + "20",
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: "solid",
  },
  targetEmptyCell: {
    backgroundColor: Colors.primary + "08",
    borderWidth: 1,
    borderColor: Colors.primary + "40",
    borderStyle: "dashed",
  },
  targetFilledCell: {
    borderWidth: 1,
    borderColor: Colors.warning + "60",
    borderStyle: "dashed",
  },
  selectedBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedText: { color: Colors.primary },
  swapHint: { fontSize: 9, color: Colors.warning, fontWeight: "600", marginTop: 2 },
  slotContent: { flex: 1, width: "100%" },
  slotSubject: { fontSize: 13, fontWeight: "600", color: Colors.text },
  slotTeacher: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  slotTime: { fontSize: 10, color: Colors.textTertiary, marginTop: 2 },
  emptyContent: { flex: 1, justifyContent: "center", alignItems: "center", width: "100%" },
  errorText: { fontSize: 16, color: Colors.error, textAlign: "center", marginBottom: Spacing.lg },
  backBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Layout.borderRadius.md,
  },
  backBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  retryBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Layout.borderRadius.md,
  },
  retryBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
});
