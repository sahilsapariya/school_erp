import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/common/constants/colors";
import { Spacing, Layout } from "@/common/constants/spacing";
import { CreateTeacherDTO, Teacher } from "../types";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTeacherDTO) => Promise<void>;
  initialData?: Teacher | null;
  mode?: "create" | "edit";
}

export const CreateTeacherModal: React.FC<Props> = ({
  visible,
  onClose,
  onSubmit,
  initialData,
  mode = "create",
}) => {
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
      setName(initialData.name || "");
      setEmail(initialData.email || "");
      setPhone(initialData.phone || "");
      setDesignation(initialData.designation || "");
      setDepartment(initialData.department || "");
      setQualification(initialData.qualification || "");
      setSpecialization(initialData.specialization || "");
      setExperienceYears(initialData.experience_years?.toString() || "");
      setAddress(initialData.address || "");
    } else {
      resetForm();
    }
  }, [initialData, mode, visible]);

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setDesignation("");
    setDepartment("");
    setQualification("");
    setSpecialization("");
    setExperienceYears("");
    setAddress("");
    setError(null);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data: CreateTeacherDTO = {
        name: name.trim(),
      };
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
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (
    label: string,
    value: string,
    setter: (v: string) => void,
    options?: { placeholder?: string; keyboardType?: any; multiline?: boolean }
  ) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, options?.multiline && styles.multilineInput]}
        value={value}
        onChangeText={setter}
        placeholder={options?.placeholder || label}
        placeholderTextColor={Colors.textTertiary}
        keyboardType={options?.keyboardType || "default"}
        multiline={options?.multiline}
        numberOfLines={options?.multiline ? 3 : 1}
      />
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {mode === "edit" ? "Edit Teacher" : "Create Teacher"}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {renderInput("Full Name *", name, setName)}
          {renderInput("Email", email, setEmail, {
            placeholder: "teacher@school.com",
            keyboardType: "email-address",
          })}
          {renderInput("Phone", phone, setPhone, { keyboardType: "phone-pad" })}
          {renderInput("Designation", designation, setDesignation, {
            placeholder: "e.g. Senior Teacher, HOD",
          })}
          {renderInput("Department", department, setDepartment, {
            placeholder: "e.g. Mathematics, Science",
          })}
          {renderInput("Qualification", qualification, setQualification, {
            placeholder: "e.g. M.Ed, Ph.D",
          })}
          {renderInput("Specialization", specialization, setSpecialization, {
            placeholder: "e.g. Algebra, Organic Chemistry",
          })}
          {renderInput("Experience (Years)", experienceYears, setExperienceYears, {
            keyboardType: "numeric",
          })}
          {renderInput("Address", address, setAddress, { multiline: true })}

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>
                {mode === "edit" ? "Update Teacher" : "Create Teacher"}
              </Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  closeButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
  },
  form: {
    flex: 1,
    padding: Spacing.lg,
  },
  fieldContainer: {
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: Layout.borderRadius.sm,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.backgroundSecondary,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  errorContainer: {
    backgroundColor: "#FFF0F0",
    padding: Spacing.md,
    borderRadius: Layout.borderRadius.sm,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: Layout.borderRadius.md,
    alignItems: "center",
    marginTop: Spacing.lg,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
