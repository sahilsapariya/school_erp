import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useStudents } from "../hooks/useStudents";
import { usePermissions } from "@/modules/permissions/hooks/usePermissions";
import * as PERMS from "@/modules/permissions/constants/permissions";
import { CreateStudentModal } from "../components/CreateStudentModal";
import {
  ScreenContainer,
  Header,
  SurfaceCard,
  DataRow,
  PrimaryButton,
  LoadingState,
  EmptyState,
  ConfirmationDialog,
} from "@/src/components/ui";
import { useToast } from "@/src/components/ui/Toast";
import { Avatar } from "@/src/components/ui/Avatar";
import { theme } from "@/src/design-system/theme";
import { Icons } from "@/src/design-system/icons";

export default function StudentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { currentStudent, loading, fetchStudent, updateStudent, deleteStudent } = useStudents();
  const { hasPermission } = usePermissions();
  const toast = useToast();

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canUpdate = hasPermission(PERMS.STUDENT_UPDATE);
  const canDelete = hasPermission(PERMS.STUDENT_DELETE);

  useEffect(() => {
    if (id) fetchStudent(id);
  }, [id]);

  const handleUpdate = async (data: any) => {
    if (!id) return;
    try {
      await updateStudent(id, data);
      setEditModalVisible(false);
      toast.success("Student updated", "Changes have been saved successfully.");
      fetchStudent(id);
    } catch (error: any) {
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!currentStudent) return;
    setDeleting(true);
    try {
      await deleteStudent(currentStudent.id);
      toast.success("Student deleted");
      router.replace("/(protected)/students");
    } catch (err: any) {
      toast.error("Delete failed", err?.message || "Could not delete the student.");
    } finally {
      setDeleting(false);
      setDeleteDialogVisible(false);
    }
  };

  if (loading && !currentStudent) {
    return (
      <ScreenContainer>
        <Header title="Student Details" onBack={() => router.back()} compact />
        <LoadingState message="Loading student..." />
      </ScreenContainer>
    );
  }

  if (!currentStudent) {
    return (
      <ScreenContainer>
        <Header title="Student Details" onBack={() => router.back()} compact />
        <EmptyState title="Student not found" description="This student could not be loaded." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Header
        title="Student Details"
        onBack={() => router.back()}
        compact
        rightAction={
          <View style={styles.headerActions}>
            {canDelete && (
              <TouchableOpacity
                onPress={() => setDeleteDialogVisible(true)}
                style={styles.iconBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icons.Delete size={20} color={theme.colors.danger} />
              </TouchableOpacity>
            )}
            {canUpdate && (
              <TouchableOpacity
                onPress={() => setEditModalVisible(true)}
                style={styles.iconBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icons.Edit size={20} color={theme.colors.primary[500]} />
              </TouchableOpacity>
            )}
          </View>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Avatar + Name */}
        <View style={styles.avatarBlock}>
          <Avatar name={currentStudent.name} size={72} />
          <Text style={styles.studentName}>{currentStudent.name}</Text>
          <Text style={styles.studentAdm}>{currentStudent.admission_number}</Text>
        </View>

        <SurfaceCard title="Basic Information" style={styles.section}>
          <DataRow title="Full Name" subtitle={currentStudent.name} noBorder />
          <DataRow title="Admission Number" subtitle={currentStudent.admission_number} />
          <DataRow title="Academic Year" subtitle={currentStudent.academic_year || "Not set"} />
          {currentStudent.gender ? <DataRow title="Gender" subtitle={currentStudent.gender} /> : null}
          {currentStudent.date_of_birth ? <DataRow title="Date of Birth" subtitle={currentStudent.date_of_birth} noBorder /> : null}
        </SurfaceCard>

        <SurfaceCard title="Contact" style={styles.section}>
          {currentStudent.email ? <DataRow title="Email" subtitle={currentStudent.email} noBorder /> : null}
          {currentStudent.phone ? <DataRow title="Phone" subtitle={currentStudent.phone} /> : null}
          {currentStudent.address ? <DataRow title="Address" subtitle={currentStudent.address} noBorder /> : null}
          {!currentStudent.email && !currentStudent.phone && !currentStudent.address ? (
            <Text style={styles.noDataText}>No contact information available</Text>
          ) : null}
        </SurfaceCard>

        <SurfaceCard title="Guardian" style={styles.section}>
          {currentStudent.guardian_name ? <DataRow title="Name" subtitle={currentStudent.guardian_name} noBorder /> : null}
          {currentStudent.guardian_relationship ? <DataRow title="Relationship" subtitle={currentStudent.guardian_relationship} /> : null}
          {currentStudent.guardian_phone ? <DataRow title="Phone" subtitle={currentStudent.guardian_phone} /> : null}
          {currentStudent.guardian_email ? <DataRow title="Email" subtitle={currentStudent.guardian_email} noBorder /> : null}
          {!currentStudent.guardian_name && !currentStudent.guardian_phone ? (
            <Text style={styles.noDataText}>No guardian information available</Text>
          ) : null}
        </SurfaceCard>

        <SurfaceCard title="Class" style={styles.section}>
          <DataRow title="Current Class" subtitle={currentStudent.class_name || "Not Assigned"} noBorder />
          {currentStudent.roll_number ? <DataRow title="Roll Number" subtitle={currentStudent.roll_number} noBorder /> : null}
        </SurfaceCard>
      </ScrollView>

      {canUpdate && (
        <CreateStudentModal
          visible={editModalVisible}
          onClose={() => setEditModalVisible(false)}
          onSubmit={handleUpdate}
          initialData={currentStudent}
          mode="edit"
        />
      )}

      <ConfirmationDialog
        visible={deleteDialogVisible}
        title="Delete Student"
        message={`Are you sure you want to delete ${currentStudent.name}? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogVisible(false)}
        loading={deleting}
        destructive
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.spacing.m,
    paddingBottom: theme.spacing.xxl,
  },
  avatarBlock: {
    alignItems: "center",
    paddingVertical: theme.spacing.l,
  },
  studentName: {
    ...theme.typography.h2,
    color: theme.colors.text[900],
    marginTop: theme.spacing.m,
    textAlign: "center",
  },
  studentAdm: {
    ...theme.typography.body,
    color: theme.colors.text[500],
    marginTop: theme.spacing.xs,
  },
  headerActions: {
    flexDirection: "row",
    gap: theme.spacing.s,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.m,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    marginBottom: theme.spacing.m,
  },
  noDataText: {
    ...theme.typography.body,
    color: theme.colors.text[400],
    textAlign: "center",
    paddingVertical: theme.spacing.s,
  },
});
