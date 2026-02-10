import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTeachers } from "../hooks/useTeachers";
import { usePermissions } from "@/modules/permissions/hooks/usePermissions";
import * as PERMS from "@/modules/permissions/constants/permissions";
import { Colors } from "@/common/constants/colors";
import { Spacing, Layout } from "@/common/constants/spacing";
import { CreateTeacherModal } from "../components/CreateTeacherModal";

export default function TeacherDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { currentTeacher, loading, fetchTeacher, updateTeacher, deleteTeacher } = useTeachers();
  const { hasPermission } = usePermissions();
  const [editModalVisible, setEditModalVisible] = useState(false);

  const canUpdate = hasPermission(PERMS.TEACHER_UPDATE);
  const canDelete = hasPermission(PERMS.TEACHER_DELETE);

  useEffect(() => {
    if (id) fetchTeacher(id);
  }, [id]);

  const handleUpdate = async (data: any) => {
    if (!id) return;
    try {
      await updateTeacher(id, data);
      setEditModalVisible(false);
      Alert.alert("Success", "Teacher updated successfully");
      fetchTeacher(id);
    } catch (error: any) {
      throw error;
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete Teacher", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          if (!id) return;
          await deleteTeacher(id);
          Alert.alert("Success", "Teacher deleted");
          router.back();
        },
      },
    ]);
  };

  if (loading && !currentTeacher) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!currentTeacher) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Teacher not found</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const InfoRow = ({ label, value }: { label: string; value?: string | number | null }) => {
    if (!value && value !== 0) return null;
    return (
      <View style={styles.infoRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Teacher Details</Text>
        {canDelete && (
          <TouchableOpacity style={styles.iconBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={24} color={Colors.error} />
          </TouchableOpacity>
        )}
        {canUpdate && (
          <TouchableOpacity style={styles.iconBtn} onPress={() => setEditModalVisible(true)}>
            <Ionicons name="create-outline" size={24} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <InfoRow label="Full Name" value={currentTeacher.name} />
          <InfoRow label="Employee ID" value={currentTeacher.employee_id} />
          <InfoRow label="Email" value={currentTeacher.email} />
          <InfoRow label="Phone" value={currentTeacher.phone} />
          <InfoRow label="Status" value={currentTeacher.status} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Professional Information</Text>
          <InfoRow label="Designation" value={currentTeacher.designation} />
          <InfoRow label="Department" value={currentTeacher.department} />
          <InfoRow label="Qualification" value={currentTeacher.qualification} />
          <InfoRow label="Specialization" value={currentTeacher.specialization} />
          <InfoRow label="Experience" value={currentTeacher.experience_years ? `${currentTeacher.experience_years} years` : undefined} />
          <InfoRow label="Date of Joining" value={currentTeacher.date_of_joining} />
        </View>

        {currentTeacher.address && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Address</Text>
            <Text style={styles.addressText}>{currentTeacher.address}</Text>
          </View>
        )}
      </ScrollView>

      {canUpdate && (
        <CreateTeacherModal
          visible={editModalVisible}
          onClose={() => setEditModalVisible(false)}
          onSubmit={handleUpdate}
          initialData={currentTeacher}
          mode="edit"
        />
      )}
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
  headerTitle: { flex: 1, fontSize: 20, fontWeight: "bold", color: Colors.text, marginLeft: Spacing.md },
  iconBtn: {
    padding: Spacing.sm,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Layout.borderRadius.md,
    marginLeft: Spacing.sm,
  },
  content: { flex: 1, padding: Spacing.lg },
  section: {
    marginBottom: Spacing.xl,
    backgroundColor: Colors.background,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingBottom: Spacing.sm,
  },
  infoRow: { marginBottom: Spacing.md },
  label: { fontSize: 14, color: Colors.textSecondary, marginBottom: 4 },
  value: { fontSize: 16, fontWeight: "500", color: Colors.text },
  addressText: { fontSize: 16, color: Colors.text, lineHeight: 24 },
  errorText: { fontSize: 16, color: Colors.error, textAlign: "center", marginBottom: Spacing.lg },
  backBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Layout.borderRadius.md,
  },
  backBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
});
