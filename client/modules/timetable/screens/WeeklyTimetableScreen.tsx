import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Modal,
  Switch,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTimetable } from "../hooks/useTimetable";
import { usePermissions } from "@/modules/permissions/hooks/usePermissions";
import * as PERMS from "@/modules/permissions/constants/permissions";
import { classService } from "@/modules/classes/services/classService";
import { TimetableSlot, SlotConflict } from "../types";
import { GenerateResult } from "../services/timetableService";
import { SlotModal } from "../components/SlotModal";
import { ScreenContainer } from "@/src/components/ui/ScreenContainer";
import { Header } from "@/src/components/ui/Header";
import { LoadingState } from "@/src/components/ui/LoadingState";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { PrimaryButton } from "@/src/components/ui/PrimaryButton";
import { ConfirmationDialog } from "@/src/components/ui/ConfirmationDialog";
import { useToast } from "@/src/components/ui/Toast";
import { theme } from "@/src/design-system/theme";
import { Icons } from "@/src/design-system/icons";

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
    slots, config, loading, error,
    fetchSlots, fetchConfig, updateConfig,
    createSlot, updateSlot, deleteSlot,
    moveSlot, swapSlots, generateTimetable,
  } = useTimetable(classId);
  const { hasPermission } = usePermissions();
  const toast = useToast();

  const canCreate = hasPermission(PERMS.TIMETABLE_CREATE) || hasPermission(PERMS.TIMETABLE_MANAGE);
  const canUpdate = hasPermission(PERMS.TIMETABLE_UPDATE) || hasPermission(PERMS.TIMETABLE_MANAGE);
  const canDelete = hasPermission(PERMS.TIMETABLE_DELETE) || hasPermission(PERMS.TIMETABLE_MANAGE);
  const canManage = hasPermission(PERMS.TIMETABLE_MANAGE);

  const [className, setClassName] = useState<string>("");
  const [slotModalVisible, setSlotModalVisible] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);
  const [addCell, setAddCell] = useState<{ day: number; period: number } | null>(null);

  const [selectedSlot, setSelectedSlot] = useState<TimetableSlot | null>(null);
  const [moveLoading, setMoveLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<TimetableSlot | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [swapTarget, setSwapTarget] = useState<{ source: TimetableSlot; dest: TimetableSlot } | null>(null);
  const [swapping, setSwapping] = useState(false);

  const [overwriteConfirmVisible, setOverwriteConfirmVisible] = useState(false);
  const [genModalVisible, setGenModalVisible] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<GenerateResult | null>(null);

  const [configSaving, setConfigSaving] = useState(false);
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

  useEffect(() => {
    if (classId) {
      classService.getClassDetail(classId)
        .then((c) => setClassName(`${c.name}-${c.section}`))
        .catch(() => setClassName("Class"));
    }
  }, [classId]);

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

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSlot(deleteTarget.id);
      if (selectedSlot?.id === deleteTarget.id) exitMoveMode();
      toast.success("Slot removed");
    } catch (err: any) {
      toast.error("Delete failed", err.message || "Failed to delete slot");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleSelectForMove = (slot: TimetableSlot) => {
    if (selectedSlot?.id === slot.id) exitMoveMode();
    else setSelectedSlot(slot);
  };

  const handleMoveToEmpty = async (day: number, period: number) => {
    if (!selectedSlot || moveLoading) return;
    setMoveLoading(true);
    try {
      const result = await moveSlot(selectedSlot.id, day, period);
      if (result.conflicts && result.conflicts.length > 0) {
        toast.warning("Cannot Move Slot", formatConflicts(result.conflicts));
      } else {
        exitMoveMode();
        toast.success("Slot moved");
      }
    } catch (err: any) {
      toast.error("Move failed", err.message || "Could not move slot");
    } finally {
      setMoveLoading(false);
    }
  };

  const handleSwapConfirm = async () => {
    if (!swapTarget) return;
    setSwapping(true);
    try {
      const result = await swapSlots(swapTarget.source.id, swapTarget.dest.id);
      if (result.conflicts && result.conflicts.length > 0) {
        toast.warning("Cannot Swap Slots", formatConflicts(result.conflicts));
      } else {
        exitMoveMode();
        toast.success("Slots swapped");
      }
    } catch (err: any) {
      toast.error("Swap failed", err.message || "Could not swap slots");
    } finally {
      setSwapping(false);
      setSwapTarget(null);
    }
  };

  const handleCellPress = (dayIndex: number, period: number, slot: TimetableSlot | undefined) => {
    if (selectedSlot) {
      if (slot) {
        if (selectedSlot.id === slot.id) { exitMoveMode(); return; }
        setSwapTarget({ source: selectedSlot, dest: slot });
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
      setDeleteTarget(slot);
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
    } catch (err: any) { throw err; }
  };

  const handleCloseModal = () => {
    setSlotModalVisible(false);
    setEditingSlot(null);
    setAddCell(null);
  };

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
      toast.success("Configuration saved");
    } catch (e: any) {
      toast.error("Save failed", e.message || "Could not save config");
    } finally {
      setConfigSaving(false);
    }
  };

  const handleGenerate = () => {
    if (overwrite && slots.length > 0) {
      setOverwriteConfirmVisible(true);
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
      toast.error("Generation failed", e.message || "Make sure subject loads and teacher expertise are configured.");
      setGenModalVisible(false);
    } finally {
      setGenerating(false);
    }
  };

  const cellWidth = (Dimensions.get("window").width - theme.spacing.m * 2 - 44) / 7;

  if (!classId) {
    return (
      <ScreenContainer>
        <Header title="Timetable" onBack={() => router.back()} compact />
        <EmptyState
          icon={<Icons.AlertCircle size={32} color={theme.colors.danger} />}
          title="Class not found"
          description="Could not determine the class for this timetable."
          action={{ label: "Go Back", onPress: () => router.back() }}
        />
      </ScreenContainer>
    );
  }

  if (loading && slots.length === 0) {
    return (
      <ScreenContainer>
        <Header title={className || "Timetable"} onBack={() => router.back()} compact />
        <LoadingState message="Loading timetable..." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Header
        title={className || "Timetable"}
        onBack={() => router.back()}
        compact
        rightAction={
          canManage ? (
            <TouchableOpacity
              style={styles.generateBtn}
              onPress={() => { setOverwrite(false); setGenResult(null); setGenModalVisible(true); fetchConfig(); }}
            >
              <Icons.AlertCircle size={14} color="#fff" />
              <Text style={styles.generateBtnText}>Generate</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      {selectedSlot && (
        <View style={styles.moveBanner}>
          <View style={styles.moveBannerContent}>
            <Icons.Refresh size={16} color="#fff" />
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
          <ActivityIndicator size="small" color={theme.colors.primary[500]} />
          <Text style={styles.moveLoadingText}>Processing...</Text>
        </View>
      )}

      {error ? (
        <EmptyState
          icon={<Icons.AlertCircle size={32} color={theme.colors.danger} />}
          title="Could not load timetable"
          description={error}
          action={{ label: "Retry", onPress: fetchSlots }}
        />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ paddingHorizontal: theme.spacing.m, paddingBottom: theme.spacing.xl }}>
          <ScrollView showsVerticalScrollIndicator style={{ maxHeight: 500 }}>
            <View style={styles.grid}>
              {/* Header row */}
              <View style={styles.headerRow}>
                <View style={[styles.cell, styles.periodHeader, { width: 44 }]}>
                  <Text style={styles.periodHeaderText}>#</Text>
                </View>
                {DAYS.map((day) => (
                  <View key={day} style={[styles.cell, styles.dayHeader, { width: Math.max(cellWidth, 56) }]}>
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
                    const isSelected = !!(selectedSlot && slot && selectedSlot.id === slot.id);
                    const isTarget = !!(selectedSlot && !isSelected);

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
                                <Icons.Refresh size={8} color="#fff" />
                              </View>
                            )}
                            <Text style={[styles.slotSubject, isSelected && { color: theme.colors.primary[500] }]} numberOfLines={1}>
                              {slot.subject_name || "—"}
                            </Text>
                            <Text style={styles.slotTeacher} numberOfLines={1}>{slot.teacher_name || "—"}</Text>
                            <Text style={styles.slotTime} numberOfLines={1}>{slot.start_time}–{slot.end_time}</Text>
                            {isTarget && !isEmpty && <Text style={styles.swapHint}>Tap to swap</Text>}
                          </View>
                        ) : (
                          <View style={styles.emptyContent}>
                            {selectedSlot ? (
                              <Icons.ChevronRight size={20} color={theme.colors.primary[400]} />
                            ) : canCreate ? (
                              <Icons.Add size={22} color={theme.colors.text[300]} />
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
        <ScreenContainer>
          <Header
            title="Generate Timetable"
            compact
            rightAction={
              <TouchableOpacity onPress={() => setGenModalVisible(false)} style={{ padding: 6 }}>
                <Icons.Close size={22} color={theme.colors.text[500]} />
              </TouchableOpacity>
            }
          />

          {genResult ? (
            <ScrollView contentContainerStyle={{ padding: theme.spacing.m, paddingBottom: 60 }}>
              <View style={styles.resultSummary}>
                {genResult.conflicts.length === 0
                  ? <Icons.CheckMark size={48} color={theme.colors.success} />
                  : <Icons.AlertCircle size={48} color={theme.colors.warning} />}
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
                  <View style={[styles.statBox, { borderColor: genResult.conflicts.length > 0 ? theme.colors.warning : theme.colors.success }]}>
                    <Text style={[styles.statValue, { color: genResult.conflicts.length > 0 ? theme.colors.warning : theme.colors.success }]}>
                      {genResult.conflicts.length}
                    </Text>
                    <Text style={styles.statLabel}>Conflicts</Text>
                  </View>
                </View>
              </View>

              {genResult.conflicts.length > 0 && (
                <View style={styles.conflictsSection}>
                  <Text style={styles.conflictsTitle}>Unresolved Conflicts</Text>
                  <Text style={styles.conflictsHint}>Check teacher expertise, availability, and workload rules.</Text>
                  {genResult.conflicts.map((c, i) => (
                    <View key={i} style={styles.conflictRow}>
                      <Icons.AlertCircle size={14} color={theme.colors.warning} />
                      <Text style={styles.conflictText}>{c.reason}</Text>
                    </View>
                  ))}
                </View>
              )}

              <PrimaryButton title="Done" onPress={() => setGenModalVisible(false)} style={{ marginTop: theme.spacing.l }} />
            </ScrollView>
          ) : (
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
              <ScrollView contentContainerStyle={{ padding: theme.spacing.m, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
                <Text style={styles.configSectionTitle}>Timetable Configuration</Text>
                <Text style={styles.configSectionHint}>Configure schedule settings. These are saved and reused.</Text>

                {[
                  { key: "general_class_duration_minutes", label: "Class duration (min)", sub: "Standard period length", placeholder: "45", maxLen: 3 },
                  { key: "first_class_duration_minutes", label: "First class duration (min)", sub: "Usually longer (assembly etc.)", placeholder: "50", maxLen: 3 },
                  { key: "gap_between_classes_minutes", label: "Gap between classes (min)", sub: "Transition/passing time", placeholder: "5", maxLen: 2 },
                  { key: "periods_per_day", label: "Periods per day", sub: "Max teaching periods", placeholder: "8", maxLen: 2 },
                ].map((field) => (
                  <View key={field.key} style={styles.configRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.configLabel}>{field.label}</Text>
                      <Text style={styles.configSubLabel}>{field.sub}</Text>
                    </View>
                    <TextInput
                      style={styles.configInput}
                      value={rawConfig[field.key as keyof typeof rawConfig]}
                      onChangeText={(v) => setRawConfig((c) => ({ ...c, [field.key]: v.replace(/[^0-9]/g, "") }))}
                      keyboardType="number-pad"
                      placeholder={field.placeholder}
                      placeholderTextColor={theme.colors.text[400]}
                      maxLength={field.maxLen}
                    />
                  </View>
                ))}

                <View style={styles.configRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.configLabel}>School start time</Text>
                    <Text style={styles.configSubLabel}>First period begins at</Text>
                  </View>
                  <TouchableOpacity style={styles.timePickerBtn} onPress={openTimePicker}>
                    <Icons.Clock size={14} color={theme.colors.primary[500]} />
                    <Text style={styles.timePickerBtnText}>{rawConfig.school_start_time}</Text>
                  </TouchableOpacity>
                </View>

                <PrimaryButton
                  label="Save Configuration"
                  onPress={handleSaveConfig}
                  loading={configSaving}
                  variant="outline"
                  style={{ marginBottom: theme.spacing.m }}
                />

                <View style={styles.infoBox}>
                  <Icons.AlertCircle size={18} color={theme.colors.primary[500]} />
                  <Text style={styles.infoText}>
                    The generator fills the timetable using subject loads, teacher expertise, availability, leaves, and workload rules. First period each day is prioritized for the class teacher.
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
                    trackColor={{ true: theme.colors.danger, false: theme.colors.border }}
                    thumbColor={overwrite ? theme.colors.danger : theme.colors.text[400]}
                  />
                </View>

                {overwrite && (
                  <View style={styles.warningBox}>
                    <Icons.AlertCircle size={16} color={theme.colors.danger} />
                    <Text style={styles.warningText}>
                      This will delete all {slots.length} existing slot{slots.length !== 1 ? "s" : ""} for this class.
                    </Text>
                  </View>
                )}

                <PrimaryButton
                  label="Generate Timetable"
                  onPress={handleGenerate}
                  loading={generating}
                  style={{ marginTop: theme.spacing.m }}
                />
              </ScrollView>
            </KeyboardAvoidingView>
          )}
        </ScreenContainer>
      </Modal>

      {/* Time Picker Modal */}
      <Modal visible={timePickerVisible} transparent animationType="fade">
        <View style={styles.timePickerOverlay}>
          <View style={styles.timePickerContainer}>
            <Text style={styles.timePickerTitle}>Select School Start Time</Text>
            <View style={styles.timePickerCols}>
              {[
                { label: "Hour", value: timePickerHour, onChange: setTimePickerHour, max: 24 },
                { label: "Min", value: timePickerMinute, onChange: (v: number) => setTimePickerMinute(v), max: 60, step: 5 },
              ].map((col, idx) => (
                <React.Fragment key={col.label}>
                  {idx === 1 && <Text style={styles.timePickerColon}>:</Text>}
                  <View style={styles.timePickerCol}>
                    <Text style={styles.timePickerColLabel}>{col.label}</Text>
                    <TouchableOpacity style={styles.timePickerArrow} onPress={() => col.onChange(((col.value + (col.step ?? 1)) % col.max) as any)}>
                      <Icons.ChevronRight size={20} color={theme.colors.primary[500]} style={{ transform: [{ rotate: "-90deg" }] }} />
                    </TouchableOpacity>
                    <Text style={styles.timePickerValue}>{String(col.value).padStart(2, "0")}</Text>
                    <TouchableOpacity style={styles.timePickerArrow} onPress={() => col.onChange(((col.value - (col.step ?? 1) + col.max) % col.max) as any)}>
                      <Icons.ChevronRight size={20} color={theme.colors.primary[500]} style={{ transform: [{ rotate: "90deg" }] }} />
                    </TouchableOpacity>
                  </View>
                </React.Fragment>
              ))}
            </View>
            <View style={styles.timePickerActions}>
              <TouchableOpacity style={styles.timePickerCancel} onPress={() => setTimePickerVisible(false)}>
                <Text style={styles.timePickerCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.timePickerConfirm} onPress={confirmTimePicker}>
                <Text style={styles.timePickerConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete slot dialog */}
      <ConfirmationDialog
        visible={!!deleteTarget}
        title="Delete Slot"
        message={deleteTarget ? `Remove ${deleteTarget.subject_name || "Subject"} from this slot?` : ""}
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
        destructive
      />

      {/* Swap slots dialog */}
      <ConfirmationDialog
        visible={!!swapTarget}
        title="Swap Slots"
        message={swapTarget
          ? `Swap ${swapTarget.source.subject_name || "Slot"} (${DAY_NAMES[swapTarget.source.day_of_week]} P${swapTarget.source.period_number}) with ${swapTarget.dest.subject_name || "Slot"} (${DAY_NAMES[swapTarget.dest.day_of_week]} P${swapTarget.dest.period_number})?`
          : ""}
        confirmLabel="Swap"
        onConfirm={handleSwapConfirm}
        onCancel={() => setSwapTarget(null)}
        loading={swapping}
      />

      {/* Overwrite confirmation */}
      <ConfirmationDialog
        visible={overwriteConfirmVisible}
        title="Overwrite Existing Timetable?"
        message="This will delete all existing slots for this class and regenerate from scratch. Are you sure?"
        confirmLabel="Yes, Overwrite"
        onConfirm={() => { setOverwriteConfirmVisible(false); runGenerate(); }}
        onCancel={() => setOverwriteConfirmVisible(false)}
        destructive
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: theme.spacing.s,
    paddingVertical: 6,
    borderRadius: theme.radius.s,
  },
  generateBtnText: { color: "#fff", fontWeight: "600", fontSize: 12 },

  moveBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.xs,
  },
  moveBannerContent: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs, flex: 1 },
  moveBannerText: { color: "#fff", ...theme.typography.bodySmall, fontWeight: "600", flex: 1 },
  moveBannerCancel: {
    paddingHorizontal: theme.spacing.s,
    paddingVertical: 4,
    borderRadius: theme.radius.s,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  moveBannerCancelText: { color: "#fff", fontWeight: "600", fontSize: 12 },
  moveLoadingBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.primary[50],
  },
  moveLoadingText: { ...theme.typography.bodySmall, color: theme.colors.primary[500], fontWeight: "500" },

  grid: { minWidth: "100%" },
  headerRow: { flexDirection: "row", borderBottomWidth: 2, borderBottomColor: theme.colors.border },
  dataRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  cell: { padding: theme.spacing.xs, justifyContent: "center", alignItems: "center" },
  periodHeader: { backgroundColor: theme.colors.backgroundSecondary },
  periodHeaderText: { fontSize: 11, fontWeight: "700", color: theme.colors.text[500] },
  dayHeader: { backgroundColor: theme.colors.backgroundSecondary },
  dayHeaderText: { fontSize: 11, fontWeight: "600", color: theme.colors.text[700] },
  periodCell: { backgroundColor: theme.colors.backgroundSecondary },
  periodText: { fontSize: 12, fontWeight: "600", color: theme.colors.text[500] },
  slotCell: { backgroundColor: theme.colors.surface, alignItems: "flex-start", minHeight: 72 },
  emptyCell: { backgroundColor: theme.colors.backgroundSecondary },
  selectedCell: {
    backgroundColor: theme.colors.primary[50],
    borderWidth: 2,
    borderColor: theme.colors.primary[500],
  },
  targetEmptyCell: {
    backgroundColor: theme.colors.primary[50],
    borderWidth: 1,
    borderColor: theme.colors.primary[300],
    borderStyle: "dashed",
  },
  targetFilledCell: {
    borderWidth: 1,
    borderColor: theme.colors.warning + "60",
    borderStyle: "dashed",
  },
  selectedBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: theme.colors.primary[500],
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  swapHint: { fontSize: 9, color: theme.colors.warning, fontWeight: "600", marginTop: 2 },
  slotContent: { flex: 1, width: "100%" },
  slotSubject: { fontSize: 12, fontWeight: "600", color: theme.colors.text[900] },
  slotTeacher: { fontSize: 10, color: theme.colors.text[500], marginTop: 2 },
  slotTime: { fontSize: 9, color: theme.colors.text[400], marginTop: 2 },
  emptyContent: { flex: 1, justifyContent: "center", alignItems: "center", width: "100%" },

  // Generate modal
  resultSummary: { alignItems: "center", paddingVertical: theme.spacing.l, gap: theme.spacing.s },
  resultTitle: { ...theme.typography.h3, color: theme.colors.text[900], textAlign: "center" },
  resultStats: { flexDirection: "row", gap: theme.spacing.s, marginTop: theme.spacing.xs },
  statBox: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.m,
    paddingVertical: theme.spacing.s,
    paddingHorizontal: theme.spacing.m,
    minWidth: 80,
  },
  statValue: { ...theme.typography.h2, color: theme.colors.text[900] },
  statLabel: { ...theme.typography.bodySmall, color: theme.colors.text[400], marginTop: 2 },
  conflictsSection: {
    marginTop: theme.spacing.m,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.m,
  },
  conflictsTitle: { ...theme.typography.body, fontWeight: "600", color: theme.colors.text[900], marginBottom: theme.spacing.xs },
  conflictsHint: { ...theme.typography.bodySmall, color: theme.colors.text[400], marginBottom: theme.spacing.s, lineHeight: 18 },
  conflictRow: {
    flexDirection: "row",
    gap: theme.spacing.xs,
    alignItems: "flex-start",
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  conflictText: { flex: 1, ...theme.typography.bodySmall, color: theme.colors.text[500], lineHeight: 18 },

  configSectionTitle: { ...theme.typography.body, fontWeight: "600", color: theme.colors.text[900], marginBottom: 2 },
  configSectionHint: { ...theme.typography.bodySmall, color: theme.colors.text[400], marginBottom: theme.spacing.m },
  configRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.xs,
    gap: theme.spacing.m,
  },
  configLabel: { ...theme.typography.body, color: theme.colors.text[700], fontWeight: "500" },
  configSubLabel: { fontSize: 11, color: theme.colors.text[400], marginTop: 1 },
  configInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.s,
    paddingHorizontal: theme.spacing.s,
    paddingVertical: 6,
    ...theme.typography.body,
    color: theme.colors.text[900],
    minWidth: 80,
    textAlign: "center",
    backgroundColor: theme.colors.surface,
  },
  timePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: theme.colors.primary[500],
    borderRadius: theme.radius.s,
    paddingHorizontal: theme.spacing.s,
    paddingVertical: 6,
    minWidth: 90,
    justifyContent: "center",
  },
  timePickerBtnText: { ...theme.typography.body, fontWeight: "600", color: theme.colors.primary[500] },
  infoBox: {
    flexDirection: "row",
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.primary[50],
    borderRadius: theme.radius.m,
    padding: theme.spacing.s,
    marginBottom: theme.spacing.m,
    alignItems: "flex-start",
  },
  infoText: { flex: 1, ...theme.typography.bodySmall, color: theme.colors.text[700], lineHeight: 20 },
  overwriteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.s,
    paddingVertical: theme.spacing.s,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.s,
  },
  overwriteLabel: { ...theme.typography.body, fontWeight: "500", color: theme.colors.text[900] },
  overwriteHint: { ...theme.typography.bodySmall, color: theme.colors.text[400], marginTop: 2, lineHeight: 18 },
  warningBox: {
    flexDirection: "row",
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.danger + "12",
    borderRadius: theme.radius.m,
    padding: theme.spacing.s,
    marginBottom: theme.spacing.s,
    alignItems: "center",
  },
  warningText: { flex: 1, ...theme.typography.bodySmall, color: theme.colors.danger },

  // Time picker
  timePickerOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: "center",
    alignItems: "center",
  },
  timePickerContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.l,
    padding: theme.spacing.l,
    width: 280,
    alignItems: "center",
  },
  timePickerTitle: { ...theme.typography.body, fontWeight: "600", color: theme.colors.text[900], marginBottom: theme.spacing.m },
  timePickerCols: { flexDirection: "row", alignItems: "center", gap: theme.spacing.s, marginBottom: theme.spacing.l },
  timePickerCol: { alignItems: "center", gap: theme.spacing.xs },
  timePickerColLabel: { fontSize: 11, color: theme.colors.text[400], fontWeight: "500" },
  timePickerArrow: { padding: theme.spacing.xs },
  timePickerValue: { fontSize: 40, fontWeight: "700", color: theme.colors.text[900], minWidth: 60, textAlign: "center" },
  timePickerColon: { fontSize: 36, fontWeight: "700", color: theme.colors.text[900], marginTop: 20 },
  timePickerActions: { flexDirection: "row", gap: theme.spacing.s, width: "100%" },
  timePickerCancel: {
    flex: 1,
    paddingVertical: theme.spacing.s,
    borderRadius: theme.radius.m,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
  },
  timePickerCancelText: { color: theme.colors.text[500], fontWeight: "600" },
  timePickerConfirm: {
    flex: 1,
    paddingVertical: theme.spacing.s,
    borderRadius: theme.radius.m,
    backgroundColor: theme.colors.primary[500],
    alignItems: "center",
  },
  timePickerConfirmText: { color: "#fff", fontWeight: "600" },
});
