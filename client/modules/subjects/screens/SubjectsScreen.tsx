import React, { useEffect, useState, useMemo } from "react";
import { View, FlatList, RefreshControl, TouchableOpacity } from "react-native";
import { useSubjects } from "../hooks/useSubjects";
import { CreateSubjectModal } from "../components/CreateSubjectModal";
import { usePermissions } from "@/modules/permissions/hooks/usePermissions";
import * as PERMS from "@/modules/permissions/constants/permissions";
import { Subject, CreateSubjectDTO } from "../types";
import { ScreenContainer } from "@/src/components/ui/ScreenContainer";
import { Header } from "@/src/components/ui/Header";
import { SearchBar } from "@/src/components/ui/SearchBar";
import { DataRow } from "@/src/components/ui/DataRow";
import { LoadingState } from "@/src/components/ui/LoadingState";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { FloatingActionButton } from "@/src/components/ui/FloatingActionButton";
import { ConfirmationDialog } from "@/src/components/ui/ConfirmationDialog";
import { useToast } from "@/src/components/ui/Toast";
import { useDebounce } from "@/src/hooks/useDebounce";
import { theme } from "@/src/design-system/theme";
import { Icons } from "@/src/design-system/icons";

export default function SubjectsScreen() {
  const { subjects, loading, fetchSubjects, createSubject, updateSubject, deleteSubject } = useSubjects();
  const { hasPermission } = usePermissions();
  const toast = useToast();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  const canCreate = hasPermission(PERMS.SUBJECT_CREATE);
  const canUpdate = hasPermission(PERMS.SUBJECT_UPDATE);
  const canDelete = hasPermission(PERMS.SUBJECT_DELETE);

  useEffect(() => { fetchSubjects(); }, [fetchSubjects]);

  const filteredSubjects = useMemo(() => {
    if (!debouncedSearch.trim()) return subjects;
    const q = debouncedSearch.toLowerCase().trim();
    return subjects.filter(
      (s) => s.name.toLowerCase().includes(q) || (s.code?.toLowerCase().includes(q) ?? false) || (s.description?.toLowerCase().includes(q) ?? false)
    );
  }, [subjects, debouncedSearch]);

  const handleCreate = () => { setEditingSubject(null); setModalVisible(true); };
  const handleEdit = (subject: Subject) => { setEditingSubject(subject); setModalVisible(true); };
  const handleModalClose = () => { setModalVisible(false); setEditingSubject(null); };

  const handleCreateSubject = async (data: CreateSubjectDTO) => {
    try {
      await createSubject(data);
      handleModalClose();
      toast.success("Subject created successfully");
      fetchSubjects();
    } catch (error: any) { throw error; }
  };

  const handleUpdateSubject = async (data: CreateSubjectDTO) => {
    if (!editingSubject) return;
    try {
      await updateSubject(editingSubject.id, data);
      handleModalClose();
      toast.success("Subject updated successfully");
      fetchSubjects();
    } catch (error: any) { throw error; }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSubject(deleteTarget.id);
      toast.success("Subject deleted");
      fetchSubjects();
    } catch (error: any) {
      toast.error("Delete failed", error.message || "Failed to delete subject");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleSubmit = editingSubject ? handleUpdateSubject : handleCreateSubject;

  if (loading && subjects.length === 0) {
    return (
      <ScreenContainer>
        <Header title="Subjects" />
        <LoadingState message="Loading subjects..." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Header
        title="Subjects"
        rightAction={
          canCreate ? (
            <TouchableOpacity style={{ width: 36, height: 36, borderRadius: theme.radius.m, backgroundColor: theme.colors.primary[50], alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.colors.primary[200] }} onPress={handleCreate}>
              <Icons.Add size={22} color={theme.colors.primary[500]} />
            </TouchableOpacity>
          ) : undefined
        }
      />
      <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Search by name, code…" style={{ marginHorizontal: theme.spacing.m, marginBottom: theme.spacing.s }} />

      <FlatList
        data={filteredSubjects}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: theme.spacing.m, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => fetchSubjects()} tintColor={theme.colors.primary[500]} />}
        renderItem={({ item }) => (
          <DataRow
            title={item.name}
            subtitle={item.code ? `Code: ${item.code}${item.description ? ` • ${item.description}` : ""}` : item.description}
            leftIcon={<Icons.FileText size={20} color={theme.colors.primary[500]} />}
            rightComponent={
              <View style={{ flexDirection: "row", gap: theme.spacing.xs }}>
                {canUpdate && (
                  <TouchableOpacity onPress={() => handleEdit(item)} style={{ padding: 6 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Icons.Edit size={18} color={theme.colors.primary[500]} />
                  </TouchableOpacity>
                )}
                {canDelete && (
                  <TouchableOpacity onPress={() => setDeleteTarget(item)} style={{ padding: 6 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Icons.Delete size={18} color={theme.colors.danger} />
                  </TouchableOpacity>
                )}
              </View>
            }
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon={<Icons.FileText size={32} color={theme.colors.primary[300]} />}
            title={searchQuery ? "No subjects found" : "No subjects yet"}
            description={searchQuery ? "Try a different search term." : "Create your first subject."}
            action={canCreate && !searchQuery ? { label: "Create Subject", onPress: handleCreate } : undefined}
          />
        }
      />

      {canCreate && <FloatingActionButton onPress={handleCreate} />}

      {(canCreate || canUpdate) && (
        <CreateSubjectModal
          visible={modalVisible}
          onClose={handleModalClose}
          onSubmit={handleSubmit}
          initialData={editingSubject}
          mode={editingSubject ? "edit" : "create"}
        />
      )}

      <ConfirmationDialog
        visible={!!deleteTarget}
        title="Delete Subject"
        message={deleteTarget ? `Delete "${deleteTarget.name}"? This cannot be undone.` : ""}
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
        destructive
      />
    </ScreenContainer>
  );
}
