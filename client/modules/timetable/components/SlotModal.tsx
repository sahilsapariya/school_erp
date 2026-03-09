import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/common/constants/colors";
import { Spacing, Layout } from "@/common/constants/spacing";
import { subjectService } from "@/modules/subjects/services/subjectService";
import { teacherService } from "@/modules/teachers/services/teacherService";
import { Subject } from "@/modules/subjects/types";
import { Teacher } from "@/modules/teachers/types";
import { TimetableSlot } from "../types";

const DAYS = [
  { value: 0, label: "Monday" },
  { value: 1, label: "Tuesday" },
  { value: 2, label: "Wednesday" },
  { value: 3, label: "Thursday" },
  { value: 4, label: "Friday" },
  { value: 5, label: "Saturday" },
  { value: 6, label: "Sunday" },
];

interface SlotModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    subject_id: string;
    teacher_id: string;
    day_of_week: number;
    period_number: number;
    start_time: string;
    end_time: string;
    room?: string;
  }) => Promise<void>;
  classId: string;
  initialSlot: TimetableSlot | null;
  initialDay: number;
  initialPeriod: number;
  mode: "create" | "edit";
}

export function SlotModal({
  visible,
  onClose,
  onSubmit,
  classId,
  initialSlot,
  initialDay,
  initialPeriod,
  mode,
}: SlotModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [teachersLoading, setTeachersLoading] = useState(false);

  const [subjectId, setSubjectId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState(initialDay);
  const [periodNumber, setPeriodNumber] = useState(initialPeriod);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("09:45");
  const [room, setRoom] = useState("");

  useEffect(() => {
    if (visible) {
      setDayOfWeek(initialDay);
      setPeriodNumber(initialPeriod);
      if (initialSlot) {
        setSubjectId(initialSlot.subject_id);
        setTeacherId(initialSlot.teacher_id);
        setStartTime(initialSlot.start_time || "09:00");
        setEndTime(initialSlot.end_time || "09:45");
        setRoom(initialSlot.room || "");
      } else {
        setSubjectId("");
        setTeacherId("");
        setStartTime("09:00");
        setEndTime("09:45");
        setRoom("");
      }
      setError(null);
    }
  }, [visible, initialSlot, initialDay, initialPeriod]);

  useEffect(() => {
    if (visible) {
      setSubjectsLoading(true);
      subjectService
        .getSubjects()
        .then(setSubjects)
        .catch(() => setSubjects([]))
        .finally(() => setSubjectsLoading(false));
      setTeachersLoading(true);
      teacherService
        .getTeachers()
        .then(setTeachers)
        .catch(() => setTeachers([]))
        .finally(() => setTeachersLoading(false));
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!subjectId.trim()) {
      setError("Please select a subject");
      return;
    }
    if (!teacherId.trim()) {
      setError("Please select a teacher");
      return;
    }
    const timeRe = /^\d{1,2}:\d{2}(:\d{2})?$/;
    if (!timeRe.test(startTime.trim())) {
      setError("Start time must be HH:MM or HH:MM:SS");
      return;
    }
    if (!timeRe.test(endTime.trim())) {
      setError("End time must be HH:MM or HH:MM:SS");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        subject_id: subjectId,
        teacher_id: teacherId,
        day_of_week: dayOfWeek,
        period_number: periodNumber,
        start_time: startTime.trim(),
        end_time: endTime.trim(),
        room: room.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save slot");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {mode === "edit" ? "Edit Slot" : "Add Slot"}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Subject *</Text>
            {subjectsLoading ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
                {subjects.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.chip, subjectId === s.id && styles.chipActive]}
                    onPress={() => setSubjectId(s.id)}
                  >
                    <Text style={[styles.chipText, subjectId === s.id && styles.chipTextActive]}>
                      {s.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Teacher *</Text>
            {teachersLoading ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
                {teachers.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.chip, teacherId === t.id && styles.chipActive]}
                    onPress={() => setTeacherId(t.id)}
                  >
                    <Text style={[styles.chipText, teacherId === t.id && styles.chipTextActive]}>
                      {t.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          <View style={styles.row}>
            <View style={[styles.fieldContainer, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Day</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
                {DAYS.map((d) => (
                  <TouchableOpacity
                    key={d.value}
                    style={[styles.chipSmall, dayOfWeek === d.value && styles.chipActive]}
                    onPress={() => setDayOfWeek(d.value)}
                  >
                    <Text style={[styles.chipTextSmall, dayOfWeek === d.value && styles.chipTextActive]}>
                      {d.label.slice(0, 3)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.fieldContainer, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Period</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.chipSmall, periodNumber === p && styles.chipActive]}
                    onPress={() => setPeriodNumber(p)}
                  >
                    <Text style={[styles.chipTextSmall, periodNumber === p && styles.chipTextActive]}>
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.fieldContainer, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Start Time *</Text>
              <TextInput
                style={styles.input}
                value={startTime}
                onChangeText={setStartTime}
                placeholder="09:00"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="numbers-and-punctuation"
              />
            </View>
            <View style={[styles.fieldContainer, { flex: 1, marginLeft: Spacing.md }]}>
              <Text style={styles.fieldLabel}>End Time *</Text>
              <TextInput
                style={styles.input}
                value={endTime}
                onChangeText={setEndTime}
                placeholder="09:45"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Room</Text>
            <TextInput
              style={styles.input}
              value={room}
              onChangeText={setRoom}
              placeholder="Optional"
              placeholderTextColor={Colors.textTertiary}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>
                {mode === "edit" ? "Update Slot" : "Add Slot"}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  closeButton: { padding: Spacing.sm },
  headerTitle: { fontSize: 18, fontWeight: "600", color: Colors.text },
  form: { flex: 1, padding: Spacing.lg },
  fieldContainer: { marginBottom: Spacing.md },
  fieldLabel: { fontSize: 14, fontWeight: "500", color: Colors.text, marginBottom: Spacing.xs },
  row: { flexDirection: "row" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  chip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Layout.borderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.backgroundSecondary,
  },
  chipSmall: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Layout.borderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.backgroundSecondary,
  },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + "20" },
  chipText: { fontSize: 14, color: Colors.text },
  chipTextSmall: { fontSize: 13, color: Colors.text },
  chipTextActive: { color: Colors.primary, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: Layout.borderRadius.sm,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.backgroundSecondary,
  },
  errorContainer: {
    backgroundColor: "#FFF0F0",
    padding: Spacing.md,
    borderRadius: Layout.borderRadius.sm,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
  },
  errorText: { color: Colors.error, fontSize: 14 },
  submitButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: Layout.borderRadius.md,
    alignItems: "center",
    marginTop: Spacing.lg,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
});
