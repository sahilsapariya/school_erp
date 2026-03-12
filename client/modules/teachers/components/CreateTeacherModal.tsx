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
import { CreateTeacherDTO, Teacher } from "../types";
import { Header } from "@/src/components/ui/Header";
import { theme } from "@/src/design-system/theme";
import { Icons } from "@/src/design-system/icons";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTeacherDTO) => Promise<void>;
  initialData?: Teacher | null;
  mode?: "create" | "edit";
}

export const CreateTeacherModal: React.FC<Props> = ({ visible, onClose, onSubmit, initialData, mode = "create" }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [designation, setDesignation] = useState("");
  const [department, setDepartment] = useState("");
  const [qualification, setQualification] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    if (initialData && mode === "edit") {
      setName(initialData.name || ""); setEmail(initialData.email || ""); setPhone(initialData.phone || "");
      setDesignation(initialData.designation || ""); setDepartment(initialData.department || "");
      setQualification(initialData.qualification || ""); setSpecialization(initialData.specialization || "");
      setExperienceYears(initialData.experience_years?.toString() || ""); setAddress(initialData.address || "");
    } else { resetForm(); }
  }, [initialData, mode, visible]);

  const resetForm = () => {
    setName(""); setEmail(""); setPhone(""); setDesignation(""); setDepartment("");
    setQualification(""); setSpecialization(""); setExperienceYears(""); setAddress("");
    setError(null);
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError("Name is required"); return; }
    setLoading(true); setError(null);
    try {
      const data: CreateTeacherDTO = { name: name.trim() };
      if (email.trim()) data.email = email.trim();
      if (phone.trim()) data.phone = phone.trim();
      if (designation.trim()) data.designation = designation.trim();
      if (department.trim()) data.department = department.trim();
      if (qualification.trim()) data.qualification = qualification.trim();
      if (specialization.trim()) data.specialization = specialization.trim();
      if (experienceYears.trim()) data.experience_years = parseInt(experienceYears);
      if (address.trim()) data.address = address.trim();
      await onSubmit(data);
      resetForm();
    } catch (err: any) {
      setError(err.message || "Failed to save teacher");
    } finally { setLoading(false); }
  };

  const renderField = (
    label: string,
    value: string,
    setter: (v: string) => void,
    options?: { placeholder?: string; keyboardType?: any; multiline?: boolean }
  ) => (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, options?.multiline && styles.multilineInput]}
        value={value}
        onChangeText={setter}
        placeholder={options?.placeholder || label}
        placeholderTextColor={theme.colors.text[400]}
        keyboardType={options?.keyboardType || "default"}
        multiline={options?.multiline}
        numberOfLines={options?.multiline ? 3 : 1}
      />
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Header
          title={mode === "edit" ? "Edit Teacher" : "Create Teacher"}
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

          {renderField("Full Name *", name, setName)}
          {renderField("Email", email, setEmail, { placeholder: "teacher@school.com", keyboardType: "email-address" })}
          {renderField("Phone", phone, setPhone, { keyboardType: "phone-pad" })}
          {renderField("Designation", designation, setDesignation, { placeholder: "e.g. Senior Teacher, HOD" })}
          {renderField("Department", department, setDepartment, { placeholder: "e.g. Mathematics, Science" })}
          {renderField("Qualification", qualification, setQualification, { placeholder: "e.g. M.Ed, Ph.D" })}
          {renderField("Specialization", specialization, setSpecialization, { placeholder: "e.g. Algebra, Organic Chemistry" })}
          {renderField("Experience (Years)", experienceYears, setExperienceYears, { keyboardType: "numeric" })}
          {renderField("Address", address, setAddress, { multiline: true })}

          <TouchableOpacity style={[styles.submitBtn, loading && styles.submitBtnDisabled]} onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>{mode === "edit" ? "Update Teacher" : "Create Teacher"}</Text>
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
  input: {
    borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.m,
    paddingHorizontal: theme.spacing.m, paddingVertical: theme.spacing.s,
    ...theme.typography.body, color: theme.colors.text[900],
    backgroundColor: theme.colors.backgroundSecondary,
  },
  multilineInput: { minHeight: 80, textAlignVertical: "top" },
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
