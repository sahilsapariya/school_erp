import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useTeachers } from "../hooks/useTeachers";
import { CreateTeacherModal } from "../components/CreateTeacherModal";
import { usePermissions } from "@/modules/permissions/hooks/usePermissions";
import * as PERMS from "@/modules/permissions/constants/permissions";
import { Teacher } from "../types";
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
import { Avatar } from "@/src/components/ui/Avatar";
import { useToast } from "@/src/components/ui/Toast";
import { useDebounce } from "@/src/hooks/useDebounce";
import { theme } from "@/src/design-system/theme";

export default function TeachersScreen() {
  const router = useRouter();
  const { teachers, loading, fetchTeachers, createTeacher } = useTeachers();
  const { hasPermission } = usePermissions();
  const toast = useToast();

  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 500);

  const canCreate = hasPermission(PERMS.TEACHER_CREATE);

  useEffect(() => {
    fetchTeachers({ search: debouncedSearch || undefined });
  }, [debouncedSearch]);

  const handleTeacherPress = (teacher: Teacher) => {
    router.push(`/teachers/${teacher.id}` as any);
  };

  const handleCreateTeacher = async (data: any) => {
    try {
      const response = await createTeacher(data);
      setModalVisible(false);

      if (response.credentials) {
        toast.success(
          "Teacher Created",
          `Employee ID: ${response.credentials.employee_id} • Password has been set.`
        );
      } else {
        toast.success("Teacher created successfully");
      }

      fetchTeachers();
    } catch (error: any) {
      throw error;
    }
  };

  if (loading && teachers.length === 0) {
    return (
      <ScreenContainer>
        <Header title="Teachers" />
        <LoadingState message="Loading teachers..." />
      </ScreenContainer>
    );
  }

  const renderItem = ({ item }: { item: Teacher }) => (
    <DataRow
      title={item.name}
      subtitle={`${item.employee_id}${item.department ? ` • ${item.department}` : ""}`}
      leftIcon={<Avatar name={item.name} size={32} />}
      rightComponent={
        <StatusBadge
          status={item.status === "active" ? "success" : "warning"}
          label={item.status || "active"}
        />
      }
      onPress={() => handleTeacherPress(item)}
    />
  );

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <ResourceList
          title="Teachers"
          data={teachers}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          onSearch={setSearchQuery}
          filterOptions={[
            { id: "all", label: "All" },
            { id: "active", label: "Active" },
          ]}
          emptyState={
            <EmptyState
              title={searchQuery ? "No teachers found" : "No teachers yet"}
              description={searchQuery ? "Try a different search term." : "Add your first teacher to get started."}
            />
          }
        />
        {canCreate && (
          <FloatingActionButton onPress={() => setModalVisible(true)} />
        )}
      </View>

      {canCreate && (
        <CreateTeacherModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSubmit={handleCreateTeacher}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
