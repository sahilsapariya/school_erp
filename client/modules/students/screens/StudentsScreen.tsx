import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useStudents } from "../hooks/useStudents";
import { CreateStudentModal } from "../components/CreateStudentModal";
import { usePermissions } from "@/modules/permissions/hooks/usePermissions";
import { useAcademicYearContext } from "@/modules/academics/context/AcademicYearContext";
import * as PERMS from "@/modules/permissions/constants/permissions";
import { Student } from "../types";
import { 
  ScreenContainer, 
  Header, 
  ResourceList, 
  DataRow, 
  FloatingActionButton, 
  StatusBadge,
  LoadingState,
  EmptyState,
} from "@/src/components/ui";
import { useToast } from "@/src/components/ui/Toast";
import { useDebounce } from "@/src/hooks/useDebounce";
import { theme } from "@/src/design-system/theme";
import { Icons } from "@/src/design-system/icons";

export default function StudentsScreen() {
  const router = useRouter();
  const toast = useToast();
  const {
    students,
    currentStudent,
    loading,
    fetchStudents,
    fetchMyProfile,
    createStudent,
  } = useStudents();
  const { hasPermission, hasAnyPermission } = usePermissions();
  const { selectedAcademicYearId } = useAcademicYearContext();
  const params = useLocalSearchParams();

  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 500);

  // Check permissions
  const canViewAll = hasAnyPermission([
    PERMS.STUDENT_READ_ALL,
    PERMS.STUDENT_READ_CLASS,
  ]);
  const canViewSelf = hasPermission(PERMS.STUDENT_READ_SELF);
  const canCreate = hasPermission(PERMS.STUDENT_CREATE);

  useEffect(() => {
    loadData();
  }, [canViewAll, canViewSelf, debouncedSearch, selectedAcademicYearId]);

  useEffect(() => {
    // Check if navigated with Create intent
    if (params.action === "create" && canCreate) {
      setModalVisible(true);
    }
  }, [params.action, canCreate]);

  const loadData = () => {
    if (canViewAll) {
      fetchStudents({
        search: debouncedSearch || undefined,
        academic_year_id: selectedAcademicYearId || undefined,
      });
    } else if (canViewSelf) {
      fetchMyProfile();
    }
  };

  const handleStudentPress = (student: Student) => {
    router.push(`/students/${student.id}` as any);
  };

  const handleCreateStudent = async (data: any) => {
    try {
      const response = await createStudent(data);
      setModalVisible(false);
      if (response.credentials) {
        toast.success(
          "Student Created",
          `Admission No: ${response.credentials.username} · Password: ${response.credentials.password}`
        );
      } else {
        toast.success("Student created successfully");
      }
      if (canViewAll) {
        fetchStudents();
      }
    } catch (error: any) {
      throw error;
    }
  };

  const renderItem = ({ item }: { item: Student }) => (
    <DataRow
      title={item.name}
      subtitle={`${item.admission_number} • ${item.class_name || "No Class"}`}
      leftIcon={<Icons.Student size={20} color={theme.colors.primary[500]} />}
      rightComponent={
        <StatusBadge 
          status={item.status === 'active' ? 'success' : 'warning'} 
          label={item.status || 'ACTIVE'} 
        />
      }
      onPress={() => handleStudentPress(item)}
    />
  );

  if (loading && students.length === 0 && !currentStudent) {
    return (
      <ScreenContainer>
        <Header title="Students" />
        <LoadingState message="Loading students..." />
      </ScreenContainer>
    );
  }

  if (canViewAll) {
    return (
      <ScreenContainer>
        <ResourceList
          title="Students"
          data={students}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          onSearch={setSearchQuery}
          filterOptions={[
            { id: 'all', label: 'All Students' },
            { id: 'active', label: 'Active' },
          ]}
        />
        {canCreate && (
          <FloatingActionButton onPress={() => setModalVisible(true)} />
        )}
        <CreateStudentModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSubmit={handleCreateStudent}
        />
      </ScreenContainer>
    );
  }

  if (canViewSelf && currentStudent) {
    return (
      <ScreenContainer>
        <Header title="My Profile" />
        <View style={styles.profileContainer}>
          <DataRow 
            title="Name"
            subtitle={currentStudent.name}
          />
          <DataRow 
            title="Admission No"
            subtitle={currentStudent.admission_number}
          />
          <DataRow 
            title="Class"
            subtitle={currentStudent.class_name || "Not assigned"}
          />
          <DataRow 
            title="Email"
            subtitle={currentStudent.email}
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Header title="Students" />
      <EmptyState
        icon={<Icons.AlertCircle size={32} color={theme.colors.danger} />}
        title="Access Denied"
        description="You do not have permission to view students."
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  profileContainer: {
    padding: theme.spacing.m,
  },
});
