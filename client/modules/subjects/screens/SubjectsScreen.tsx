import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSubjects } from "../hooks/useSubjects";
import { CreateSubjectModal } from "../components/CreateSubjectModal";
import { usePermissions } from "@/modules/permissions/hooks/usePermissions";
import * as PERMS from "@/modules/permissions/constants/permissions";
import { Colors } from "@/common/constants/colors";
import { Spacing, Layout } from "@/common/constants/spacing";
import { Subject, CreateSubjectDTO } from "../types";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function SubjectsScreen() {
  const { subjects, loading, fetchSubjects, createSubject, updateSubject, deleteSubject } =
    useSubjects();
  const { hasPermission } = usePermissions();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  const canCreate = hasPermission(PERMS.SUBJECT_CREATE);
  const canUpdate = hasPermission(PERMS.SUBJECT_UPDATE);
  const canDelete = hasPermission(PERMS.SUBJECT_DELETE);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const filteredSubjects = useMemo(() => {
    if (!debouncedSearch.trim()) return subjects;
    const q = debouncedSearch.toLowerCase().trim();
    return subjects.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.code?.toLowerCase().includes(q) ?? false) ||
        (s.description?.toLowerCase().includes(q) ?? false)
    );
  }, [subjects, debouncedSearch]);

  const handleCreate = () => {
    setEditingSubject(null);
    setModalVisible(true);
  };

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setEditingSubject(null);
  };

  const handleCreateSubject = async (data: CreateSubjectDTO) => {
    try {
      await createSubject(data);
      handleModalClose();
      Alert.alert("Success", "Subject created successfully");
      fetchSubjects();
    } catch (error: any) {
      throw error;
    }
  };

  const handleUpdateSubject = async (data: CreateSubjectDTO) => {
    if (!editingSubject) return;
    try {
      await updateSubject(editingSubject.id, data);
      handleModalClose();
      Alert.alert("Success", "Subject updated successfully");
      fetchSubjects();
    } catch (error: any) {
      throw error;
    }
  };

  const handleSubmit = editingSubject ? handleUpdateSubject : handleCreateSubject;

  const handleDelete = (subject: Subject) => {
    Alert.alert(
      "Delete Subject",
      `Are you sure you want to delete "${subject.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteSubject(subject.id);
              Alert.alert("Success", "Subject deleted successfully");
              fetchSubjects();
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to delete subject");
            }
          },
        },
      ]
    );
  };

  const renderSubjectCard = ({ item }: { item: Subject }) => (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <View style={styles.cardIcon}>
          <Ionicons name="book" size={24} color={Colors.primary} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{item.name}</Text>
          {item.code && (
            <Text style={styles.cardCode}>Code: {item.code}</Text>
          )}
          {item.description ? (
            <Text style={styles.cardDescription} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.cardActions}>
        {canUpdate && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEdit(item)}
          >
            <Ionicons name="pencil" size={20} color={Colors.primary} />
          </TouchableOpacity>
        )}
        {canDelete && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDelete(item)}
          >
            <Ionicons name="trash-outline" size={20} color={Colors.error} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Subjects</Text>
        {canCreate && (
          <TouchableOpacity style={styles.addButton} onPress={handleCreate}>
            <Ionicons name="add" size={24} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, code, or description..."
          placeholderTextColor={Colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {loading && subjects.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredSubjects}
          keyExtractor={(item) => item.id}
          renderItem={renderSubjectCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={() => fetchSubjects()} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>
                {searchQuery ? "No subjects found." : "No subjects yet."}
              </Text>
            </View>
          }
        />
      )}

      {(canCreate || canUpdate) && (
        <CreateSubjectModal
          visible={modalVisible}
          onClose={handleModalClose}
          onSubmit={handleSubmit}
          initialData={editingSubject}
          mode={editingSubject ? "edit" : "create"}
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
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: Colors.text },
  addButton: {
    padding: Spacing.sm,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Layout.borderRadius.md,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Layout.borderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    margin: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  searchIcon: { marginRight: Spacing.sm },
  searchInput: { flex: 1, fontSize: 16, color: Colors.text, padding: Spacing.sm },
  listContent: { padding: Spacing.md },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.sm,
  },
  cardContent: { flexDirection: "row", alignItems: "center", flex: 1 },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: "600", color: Colors.text },
  cardCode: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  cardDescription: { fontSize: 13, color: Colors.textTertiary, marginTop: 4 },
  cardActions: { flexDirection: "row", gap: Spacing.sm },
  actionButton: { padding: Spacing.sm },
  emptyText: { fontSize: 16, color: Colors.textSecondary },
});
