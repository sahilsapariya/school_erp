import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useClasses } from "../hooks/useClasses";
import { usePermissions } from "@/modules/permissions/hooks/usePermissions";
import { useAcademicYearContext } from "@/modules/academics/context/AcademicYearContext";
import * as PERMS from "@/modules/permissions/constants/permissions";
import { CreateClassModal } from "../components/CreateClassModal";
import { ClassItem, CreateClassDTO } from "../types";
import {
  ScreenContainer,
  Header,
  ResourceList,
  LoadingState,
  EmptyState,
  FloatingActionButton,
} from "@/src/components/ui";
import { useToast } from "@/src/components/ui/Toast";
import { theme } from "@/src/design-system/theme";
import { Icons } from "@/src/design-system/icons";

export default function ClassesScreen() {
  const router = useRouter();
  const { classes, loading, fetchClasses, createClass } = useClasses();
  const { hasPermission } = usePermissions();
  const { selectedAcademicYearId } = useAcademicYearContext();
  const toast = useToast();

  const canCreate = hasPermission(PERMS.CLASS_CREATE);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchClasses({ academic_year_id: selectedAcademicYearId || undefined });
  }, [selectedAcademicYearId]);

  const handleClassPress = (cls: ClassItem) => {
    router.push(`/classes/${cls.id}` as any);
  };

  const handleCreateClass = async (data: CreateClassDTO) => {
    try {
      await createClass(data);
      setModalVisible(false);
      toast.success("Class created successfully");
      fetchClasses();
    } catch (error: any) {
      throw error;
    }
  };

  if (loading && classes.length === 0) {
    return (
      <ScreenContainer>
        <Header title="Classes" />
        <LoadingState message="Loading classes..." />
      </ScreenContainer>
    );
  }

  const renderItem = ({ item }: { item: ClassItem }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleClassPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardIconBg}>
        <Icons.Class size={22} color={theme.colors.primary[500]} />
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>{item.name} – {item.section}</Text>
        <Text style={styles.cardDetail}>{item.academic_year}</Text>
        <View style={styles.cardStats}>
          <View style={styles.cardStat}>
            <Icons.Student size={12} color={theme.colors.text[500]} />
            <Text style={styles.cardStatText}>{item.student_count || 0} students</Text>
          </View>
          <Text style={styles.cardStatDot}>·</Text>
          <View style={styles.cardStat}>
            <Icons.Users size={12} color={theme.colors.text[500]} />
            <Text style={styles.cardStatText}>{item.teacher_count || 0} teachers</Text>
          </View>
        </View>
      </View>
      <Icons.ChevronRight size={18} color={theme.colors.text[400]} />
    </TouchableOpacity>
  );

  return (
    <ScreenContainer>
      <ResourceList
        title="Classes"
        data={classes}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        onRefresh={() => fetchClasses({ academic_year_id: selectedAcademicYearId || undefined })}
        refreshing={loading}
        emptyState={
          <EmptyState
            icon={<Icons.Class size={32} color={theme.colors.primary[400]} />}
            title="No classes yet"
            description="Create your first class to get started."
            action={canCreate ? { label: "Create Class", onPress: () => setModalVisible(true) } : undefined}
          />
        }
      />
      {canCreate && (
        <FloatingActionButton onPress={() => setModalVisible(true)} />
      )}
      {canCreate && (
        <CreateClassModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSubmit={handleCreateClass}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.m,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.s,
    ...theme.shadows.sm,
  },
  cardIconBg: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.l,
    backgroundColor: theme.colors.primary[50],
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.m,
    flexShrink: 0,
  },
  cardInfo: { flex: 1 },
  cardTitle: {
    ...theme.typography.body,
    fontWeight: "600",
    color: theme.colors.text[900],
  },
  cardDetail: {
    ...theme.typography.caption,
    color: theme.colors.text[500],
    marginTop: 2,
  },
  cardStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  cardStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  cardStatText: {
    ...theme.typography.caption,
    color: theme.colors.text[500],
  },
  cardStatDot: {
    ...theme.typography.caption,
    color: theme.colors.text[300],
  },
});
