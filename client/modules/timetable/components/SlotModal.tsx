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
import { subjectService } from "@/modules/subjects/services/subjectService";
import { teacherService } from "@/modules/teachers/services/teacherService";
import { Subject } from "@/modules/subjects/types";
import { Teacher } from "@/modules/teachers/types";
import { TimetableSlot } from "../types";
import { Header } from "@/src/components/ui/Header";
import { theme } from "@/src/design-system/theme";
import { Icons } from "@/src/design-system/icons";

const DAYS = [
  { value: 0, label: "Monday" }, { value: 1, label: "Tuesday" }, { value: 2, label: "Wednesday" },
  { value: 3, label: "Thursday" }, { value: 4, label: "Friday" }, { value: 5, label: "Saturday" }, { value: 6, label: "Sunday" },
];

interface SlotModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    subject_id: string; teacher_id: string; day_of_week: number;
    period_number: number; start_time: string; end_time: string; room?: string;
  }) => Promise<void>;
  classId: string;
  initialSlot: TimetableSlot | null;
  initialDay: number;
  initialPeriod: number;
  mode: "create" | "edit";
}

export function SlotModal({ visible, onClose, onSubmit, classId, initialSlot, initialDay, initialPeriod, mode }: SlotModalProps) {
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
      setDayOfWeek(initialDay); setPeriodNumber(initialPeriod);
      if (initialSlot) {
        setSubjectId(initialSlot.subject_id); setTeacherId(initialSlot.teacher_id);
        setStartTime(initialSlot.start_time || "09:00"); setEndTime(initialSlot.end_time || "09:45");
        setRoom(initialSlot.room || "");
      } else {
        setSubjectId(""); setTeacherId(""); setStartTime("09:00"); setEndTime("09:45"); setRoom("");
      }
      setError(null);
    }
  }, [visible, initialSlot, initialDay, initialPeriod]);

  useEffect(() => {
    if (visible) {
      setSubjectsLoading(true);
      subjectService.getSubjects().then(setSubjects).catch(() => setSubjects([])).finally(() => setSubjectsLoading(false));
      setTeachersLoading(true);
      teacherService.getTeachers().then(setTeachers).catch(() => setTeachers([])).finally(() => setTeachersLoading(false));
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!subjectId.trim()) { setError("Please select a subject"); return; }
    if (!teacherId.trim()) { setError("Please select a teacher"); return; }
    const timeRe = /^\d{1,2}:\d{2}(:\d{2})?$/;
    if (!timeRe.test(startTime.trim())) { setError("Start time must be HH:MM"); return; }
    if (!timeRe.test(endTime.trim())) { setError("End time must be HH:MM"); return; }
    setLoading(true); setError(null);
    try {
      await onSubmit({ subject_id: subjectId, teacher_id: teacherId, day_of_week: dayOfWeek, period_number: periodNumber, start_time: startTime.trim(), end_time: endTime.trim(), room: room.trim() || undefined });
      onClose();
    } catch (err: any) { setError(err.message || "Failed to save slot"); }
    finally { setLoading(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Header
          title={mode === "edit" ? "Edit Slot" : "Add Slot"}
          compact
          rightAction={
            <TouchableOpacity onPress={onClose} style={{ padding: 6 }}>
              <Icons.Close size={22} color={theme.colors.text[500]} />
            </TouchableOpacity>
          }
        />

        <ScrollView style={styles.form} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {error && (
            <View style={styles.errorBanner}>
              <Icons.AlertCircle size={15} color={theme.colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Subject *</Text>
            {subjectsLoading ? <ActivityIndicator size="small" color={theme.colors.primary[500]} /> : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  {subjects.map((s) => (
                    <TouchableOpacity key={s.id} style={[styles.chip, subjectId === s.id && styles.chipActive]} onPress={() => setSubjectId(s.id)}>
                      <Text style={[styles.chipText, subjectId === s.id && styles.chipTextActive]}>{s.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Teacher *</Text>
            {teachersLoading ? <ActivityIndicator size="small" color={theme.colors.primary[500]} /> : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  {teachers.map((t) => (
                    <TouchableOpacity key={t.id} style={[styles.chip, teacherId === t.id && styles.chipActive]} onPress={() => setTeacherId(t.id)}>
                      <Text style={[styles.chipText, teacherId === t.id && styles.chipTextActive]}>{t.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Day</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {DAYS.map((d) => (
                  <TouchableOpacity key={d.value} style={[styles.chipSmall, dayOfWeek === d.value && styles.chipActive]} onPress={() => setDayOfWeek(d.value)}>
                    <Text style={[styles.chipTextSmall, dayOfWeek === d.value && styles.chipTextActive]}>{d.label.slice(0, 3)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Period</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                  <TouchableOpacity key={p} style={[styles.chipSmall, periodNumber === p && styles.chipActive]} onPress={() => setPeriodNumber(p)}>
                    <Text style={[styles.chipTextSmall, periodNumber === p && styles.chipTextActive]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Start Time *</Text>
              <TextInput style={styles.input} value={startTime} onChangeText={setStartTime} placeholder="09:00" placeholderTextColor={theme.colors.text[400]} keyboardType="numbers-and-punctuation" />
            </View>
            <View style={{ width: theme.spacing.s }} />
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>End Time *</Text>
              <TextInput style={styles.input} value={endTime} onChangeText={setEndTime} placeholder="09:45" placeholderTextColor={theme.colors.text[400]} keyboardType="numbers-and-punctuation" />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Room</Text>
            <TextInput style={styles.input} value={room} onChangeText={setRoom} placeholder="Optional" placeholderTextColor={theme.colors.text[400]} />
          </View>

          <TouchableOpacity style={[styles.submitBtn, loading && styles.submitBtnDisabled]} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>{mode === "edit" ? "Update Slot" : "Add Slot"}</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  form: { flex: 1, paddingHorizontal: theme.spacing.m },
  field: { marginBottom: theme.spacing.s },
  fieldLabel: { ...theme.typography.label, color: theme.colors.text[700], marginBottom: 4 },
  row: { flexDirection: "row" },
  chipRow: { flexDirection: "row", gap: theme.spacing.xs, marginBottom: theme.spacing.xs },
  chip: {
    paddingVertical: 6, paddingHorizontal: theme.spacing.s,
    borderRadius: theme.radius.s, borderWidth: 1,
    borderColor: theme.colors.border, backgroundColor: theme.colors.backgroundSecondary,
  },
  chipSmall: {
    paddingVertical: 4, paddingHorizontal: theme.spacing.xs,
    borderRadius: theme.radius.s, borderWidth: 1,
    borderColor: theme.colors.border, backgroundColor: theme.colors.backgroundSecondary,
  },
  chipActive: { borderColor: theme.colors.primary[500], backgroundColor: theme.colors.primary[50] },
  chipText: { ...theme.typography.bodySmall, color: theme.colors.text[700] },
  chipTextSmall: { fontSize: 12, color: theme.colors.text[700] },
  chipTextActive: { color: theme.colors.primary[500], fontWeight: "600" },
  input: {
    borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.m,
    paddingHorizontal: theme.spacing.m, paddingVertical: theme.spacing.s,
    ...theme.typography.body, color: theme.colors.text[900],
    backgroundColor: theme.colors.backgroundSecondary,
  },
  errorBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: theme.colors.dangerLight, padding: theme.spacing.s,
    borderRadius: theme.radius.m, marginBottom: theme.spacing.s, marginTop: theme.spacing.xs,
    borderLeftWidth: 3, borderLeftColor: theme.colors.danger,
  },
  errorText: { ...theme.typography.bodySmall, color: theme.colors.danger, flex: 1 },
  submitBtn: {
    backgroundColor: theme.colors.primary[500], borderRadius: theme.radius.l,
    height: 54, alignItems: "center", justifyContent: "center", marginTop: theme.spacing.m,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: "#fff", ...theme.typography.label, fontWeight: "600" },
});
