import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { CreateClassDTO } from "../types";
import { useAcademicYears } from "@/modules/academics/hooks/useAcademicYears";
import { useAcademicYearContext } from "@/modules/academics/context/AcademicYearContext";
import { classService } from "@/modules/classes/services/classService";
import { Teacher } from "@/modules/teachers/types";
import { Header } from "@/src/components/ui/Header";
import { theme } from "@/src/design-system/theme";
import { Icons } from "@/src/design-system/icons";

interface EditInitialData {
  name: string;
  section: string;
  academic_year_id: string;
  teacher_id?: string;
  start_date?: string;
  end_date?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CreateClassDTO) => Promise<void>;
  initialData?: EditInitialData;
  classId?: string;
}

export const CreateClassModal: React.FC<Props> = ({ visible, onClose, onSubmit, initialData, classId }) => {
  const isEditMode = !!initialData;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [section, setSection] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [classTeacherId, setClassTeacherId] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data: academicYears = [], isLoading: academicYearsLoading } = useAcademicYears(false);
  const { selectedAcademicYearId: contextYearId } = useAcademicYearContext();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      if (initialData) {
        setName(initialData.name);
        setSection(initialData.section);
        setAcademicYearId(initialData.academic_year_id);
        setClassTeacherId(initialData.teacher_id || "");
        setStartDate(initialData.start_date || "");
        setEndDate(initialData.end_date || "");
      }
      setTeachersLoading(true);
      classService.getAvailableClassTeachers(classId).then(setTeachers).finally(() => setTeachersLoading(false));
      if (!initialData) setAcademicYearId(contextYearId || "");
    }
  }, [visible, contextYearId, initialData, classId]);

  const resetForm = () => {
    if (initialData) {
      setName(initialData.name); setSection(initialData.section);
      setAcademicYearId(initialData.academic_year_id); setClassTeacherId(initialData.teacher_id || "");
      setStartDate(initialData.start_date || ""); setEndDate(initialData.end_date || "");
    } else {
      setName(""); setSection(""); setAcademicYearId(contextYearId || "");
      setClassTeacherId(""); setStartDate(""); setEndDate("");
    }
    setError(null);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !section.trim() || !academicYearId) {
      setError("Class name, section, and academic year are required");
      return;
    }
    setLoading(true); setError(null);
    try {
      await onSubmit({
        name: name.trim(), section: section.trim(), academic_year_id: academicYearId,
        teacher_id: classTeacherId || undefined,
        start_date: startDate.trim() || undefined, end_date: endDate.trim() || undefined,
      });
      resetForm();
    } catch (err: any) {
      setError(err.message || (isEditMode ? "Failed to update class" : "Failed to create class"));
    } finally { setLoading(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Header
          title={isEditMode ? "Edit Class" : "Create Class"}
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
              <Icons.AlertCircle size={16} color={theme.colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Class Name *</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Grade 10" placeholderTextColor={theme.colors.text[400]} />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Section *</Text>
            <TextInput style={styles.input} value={section} onChangeText={setSection} placeholder="e.g. A" placeholderTextColor={theme.colors.text[400]} />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Academic Year *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {academicYearsLoading ? (
                <Text style={styles.hintText}>Loading...</Text>
              ) : academicYears.length === 0 ? (
                <Text style={styles.hintText}>No academic years. Create one in Finance.</Text>
              ) : (
                <View style={styles.chipRow}>
                  {academicYears.map((ay) => (
                    <TouchableOpacity key={ay.id} style={[styles.chip, academicYearId === ay.id && styles.chipActive]} onPress={() => setAcademicYearId(ay.id)}>
                      <Text style={[styles.chipText, academicYearId === ay.id && styles.chipTextActive]}>{ay.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Class Teacher (optional)</Text>
            <Text style={styles.hintText}>Only the class teacher can mark attendance for this class.</Text>
            {teachersLoading ? (
              <ActivityIndicator size="small" color={theme.colors.primary[500]} style={{ marginVertical: 8 }} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  <TouchableOpacity style={[styles.chip, !classTeacherId && styles.chipActive]} onPress={() => setClassTeacherId("")}>
                    <Text style={[styles.chipText, !classTeacherId && styles.chipTextActive]}>None</Text>
                  </TouchableOpacity>
                  {teachers.map((t) => (
                    <TouchableOpacity key={t.id} style={[styles.chip, classTeacherId === t.user_id && styles.chipActive]} onPress={() => setClassTeacherId(classTeacherId === t.user_id ? "" : t.user_id)}>
                      <Text style={[styles.chipText, classTeacherId === t.user_id && styles.chipTextActive]} numberOfLines={1}>{t.name} ({t.employee_id})</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Start Date</Text>
            <TextInput style={styles.input} value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" placeholderTextColor={theme.colors.text[400]} />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>End Date</Text>
            <TextInput style={styles.input} value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" placeholderTextColor={theme.colors.text[400]} />
          </View>

          <TouchableOpacity style={[styles.submitBtn, loading && styles.submitBtnDisabled]} onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>{isEditMode ? "Update Class" : "Create Class"}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  form: { flex: 1, paddingHorizontal: theme.spacing.m },
  field: { marginBottom: theme.spacing.s },
  fieldLabel: { ...theme.typography.label, color: theme.colors.text[700], marginBottom: 4 },
  hintText: { ...theme.typography.bodySmall, color: theme.colors.text[400], marginBottom: 4, fontStyle: "italic" },
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
  chipRow: { flexDirection: "row", gap: theme.spacing.xs, marginBottom: theme.spacing.xs },
  chip: {
    paddingVertical: 6, paddingHorizontal: theme.spacing.s,
    borderRadius: theme.radius.s, borderWidth: 1,
    borderColor: theme.colors.border, backgroundColor: theme.colors.backgroundSecondary,
  },
  chipActive: { borderColor: theme.colors.primary[500], backgroundColor: theme.colors.primary[50] },
  chipText: { ...theme.typography.bodySmall, color: theme.colors.text[700] },
  chipTextActive: { color: theme.colors.primary[500], fontWeight: "600" },
  submitBtn: {
    backgroundColor: theme.colors.primary[500], borderRadius: theme.radius.l,
    height: 54, alignItems: "center", justifyContent: "center", marginTop: theme.spacing.m,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: "#fff", ...theme.typography.label, fontWeight: "600" },
});
