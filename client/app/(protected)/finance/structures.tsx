import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, Modal, TextInput, Switch, ActivityIndicator, RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import {
  useStructures, useStructure, useAcademicYears, useClasses,
  useAvailableClassesForStructure, useCreateStructure, useUpdateStructure,
  useDeleteStructure, useAssignStructure, useStudentsForAssign,
  useStudentFees, useDeleteStudentFee,
} from "@/modules/finance/hooks/useFinance";
import { useAcademicYearContext } from "@/modules/academics/context/AcademicYearContext";
import type { FeeStructure } from "@/modules/finance/types";
import { ClassMultiSelect } from "@/common/components/ClassMultiSelect";
import { ScreenContainer } from "@/src/components/ui/ScreenContainer";
import { Header } from "@/src/components/ui/Header";
import { LoadingState } from "@/src/components/ui/LoadingState";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { PrimaryButton } from "@/src/components/ui/PrimaryButton";
import { ConfirmationDialog } from "@/src/components/ui/ConfirmationDialog";
import { FloatingActionButton } from "@/src/components/ui/FloatingActionButton";
import { useToast } from "@/src/components/ui/Toast";
import { theme } from "@/src/design-system/theme";
import { Icons } from "@/src/design-system/icons";

function formatDate(s: string) {
  try { return new Date(s).toLocaleDateString("en-IN"); } catch { return s; }
}

export default function FeeStructuresPage() {
  const router = useRouter();
  const toast = useToast();
  const { selectedAcademicYearId: contextYearId } = useAcademicYearContext();
  const [academicYearFilter, setAcademicYearFilter] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [assignStructureId, setAssignStructureId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeeStructure | null>(null);

  const { data: academicYears = [] } = useAcademicYears(false);
  const { data: classes = [] } = useClasses();

  useEffect(() => {
    if (contextYearId) setAcademicYearFilter((prev) => (prev === "" ? contextYearId : prev));
  }, [contextYearId]);

  const { data: structures = [], isLoading, error, refetch, isRefetching } = useStructures({
    academic_year_id: academicYearFilter || undefined,
  });
  const createMut = useCreateStructure();
  const updateMut = useUpdateStructure();
  const deleteMut = useDeleteStructure();
  const assignMut = useAssignStructure();

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMut.mutateAsync(deleteTarget.id);
      toast.success("Structure deleted", `"${deleteTarget.name}" has been removed.`);
    } catch (e: any) {
      toast.error("Delete failed", e?.message ?? "Failed to delete structure");
    } finally {
      setDeleteTarget(null);
    }
  };

  if (error) {
    return (
      <ScreenContainer>
        <Header title="Fee Structures" onBack={() => router.back()} compact />
        <EmptyState
          icon={<Icons.AlertCircle size={32} color={theme.colors.danger} />}
          title="Failed to load"
          description={error instanceof Error ? error.message : "Could not load fee structures."}
          action={{ label: "Try again", onPress: () => refetch() }}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Header
        title="Fee Structures"
        onBack={() => router.back()}
        compact
        rightAction={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => { setEditingId(null); setModalOpen(true); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icons.Add size={22} color={theme.colors.primary[500]} />
          </TouchableOpacity>
        }
      />

      {/* Year filter */}
      <View style={styles.filterBar}>
        <Text style={styles.filterLabel}>Academic Year</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.chip, !academicYearFilter && styles.chipActive]}
            onPress={() => setAcademicYearFilter("")}
          >
            <Text style={[styles.chipText, !academicYearFilter && styles.chipTextActive]}>All</Text>
          </TouchableOpacity>
          {(academicYears as any[]).map((ay) => (
            <TouchableOpacity
              key={ay.id}
              style={[styles.chip, academicYearFilter === ay.id && styles.chipActive]}
              onPress={() => setAcademicYearFilter(academicYearFilter === ay.id ? "" : ay.id)}
            >
              <Text style={[styles.chipText, academicYearFilter === ay.id && styles.chipTextActive]}>{ay.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading && structures.length === 0 ? (
        <LoadingState message="Loading fee structures…" />
      ) : (
        <FlatList
          data={structures}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.colors.primary[500]} />}
          renderItem={({ item: s }) => (
            <View style={styles.card}>
              <View style={styles.cardIconBg}>
                <Icons.Class size={22} color={theme.colors.primary[500]} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{s.name}</Text>
                <Text style={styles.cardDetail}>{s.class_name ?? "All classes"} • Due {formatDate(s.due_date)}</Text>
                {s.components?.length ? (
                  <View style={styles.cardMeta}>
                    <Icons.FileText size={12} color={theme.colors.text[500]} />
                    <Text style={styles.cardMetaText}>{s.components.length} components</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.actionIconBtn} onPress={() => setAssignStructureId(s.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Icons.Users size={18} color={theme.colors.primary[500]} />
                  <Text style={styles.actionIconLabel}>Assign</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionIconBtn} onPress={() => { setEditingId(s.id); setModalOpen(true); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Icons.Edit size={18} color={theme.colors.primary[500]} />
                  <Text style={styles.actionIconLabel}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionIconBtn} onPress={() => setDeleteTarget(s)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Icons.Delete size={18} color={theme.colors.danger} />
                  <Text style={[styles.actionIconLabel, { color: theme.colors.danger }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon={<Icons.Finance size={36} color={theme.colors.primary[300]} />}
              title="No fee structures yet"
              description="Create your first fee structure to assign fees to students"
              action={{ label: "Create Structure", onPress: () => { setEditingId(null); setModalOpen(true); } }}
            />
          }
        />
      )}

      <FloatingActionButton onPress={() => { setEditingId(null); setModalOpen(true); }} />

      <StructureModal
        visible={modalOpen}
        onClose={() => { setModalOpen(false); setEditingId(null); }}
        editingId={editingId}
        structures={structures}
        academicYears={academicYears as any[]}
        allClasses={classes as any[]}
        defaultAcademicYearId={contextYearId || undefined}
        onCreate={async (data) => { await createMut.mutateAsync(data); setModalOpen(false); toast.success("Fee structure created"); }}
        onUpdate={async (id, data) => { await updateMut.mutateAsync({ id, data }); setModalOpen(false); setEditingId(null); toast.success("Fee structure updated"); }}
        isCreating={createMut.isPending}
        isUpdating={updateMut.isPending}
      />

      <AssignStructureModal
        visible={!!assignStructureId}
        onClose={() => setAssignStructureId(null)}
        structureId={assignStructureId}
        structureName={structures.find((s) => s.id === assignStructureId)?.name}
        structureClassIds={structures.find((s) => s.id === assignStructureId)?.class_ids ?? []}
        classes={classes as any[]}
        onAssign={async (studentIds) => {
          if (!assignStructureId) return;
          await assignMut.mutateAsync({ structureId: assignStructureId, studentIds });
          setAssignStructureId(null);
          toast.success("Students assigned");
        }}
        isAssigning={assignMut.isPending}
      />

      <ConfirmationDialog
        visible={!!deleteTarget}
        title="Delete Structure"
        message={deleteTarget ? `Delete "${deleteTarget.name}"? This cannot be undone.` : ''}
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteMut.isPending}
        destructive
      />
    </ScreenContainer>
  );
}

// ── StructureModal ───────────────────────────────────────────────────────────

interface StructureModalProps {
  visible: boolean; onClose: () => void; editingId: string | null;
  structures: FeeStructure[]; academicYears: { id: string; name: string }[];
  allClasses: { id: string; name: string; section?: string }[];
  defaultAcademicYearId?: string;
  onCreate: (data: any) => Promise<void>; onUpdate: (id: string, data: any) => Promise<void>;
  isCreating: boolean; isUpdating: boolean;
}

function StructureModal({ visible, onClose, editingId, structures, academicYears, allClasses, defaultAcademicYearId, onCreate, onUpdate, isCreating, isUpdating }: StructureModalProps) {
  const toast = useToast();
  const editing = editingId ? structures.find((s) => s.id === editingId) : null;
  const [name, setName] = useState(editing?.name ?? "");
  const [academicYearId, setAcademicYearId] = useState(editing?.academic_year_id ?? defaultAcademicYearId ?? "");
  const [classIds, setClassIds] = useState<string[]>(editing?.class_ids ?? (editing?.class_id ? [editing.class_id] : []));
  const [dueDate, setDueDate] = useState(editing?.due_date ?? "");
  const [components, setComponents] = useState<{ name: string; amount: string; is_optional: boolean }[]>(
    editing?.components?.map((c) => ({ name: c.name, amount: String(c.amount ?? 0), is_optional: c.is_optional ?? false })) ?? [{ name: "", amount: "", is_optional: false }]
  );

  useEffect(() => {
    if (visible) {
      setName(editing?.name ?? "");
      setAcademicYearId(editing?.academic_year_id ?? defaultAcademicYearId ?? "");
      setClassIds(editing?.class_ids ?? (editing?.class_id ? [editing.class_id] : []));
      setDueDate(editing?.due_date ?? "");
      setComponents(editing?.components?.map((c) => ({ name: c.name, amount: String(c.amount ?? 0), is_optional: c.is_optional ?? false })) ?? [{ name: "", amount: "", is_optional: false }]);
    }
  }, [visible, editingId, editing, defaultAcademicYearId]);

  const updateComp = (i: number, field: string, value: string | boolean) => {
    const next = [...components];
    if (field === "name") next[i] = { ...next[i], name: value as string };
    else if (field === "amount") next[i] = { ...next[i], amount: value as string };
    else if (field === "is_optional") next[i] = { ...next[i], is_optional: value as boolean };
    setComponents(next);
  };

  const effectiveAcademicYearId = academicYearId || (editing?.academic_year_id ?? "");
  const { data: availableClasses = [] } = useAvailableClassesForStructure(effectiveAcademicYearId || undefined, editingId, visible && !!effectiveAcademicYearId);
  const classOptions = (availableClasses as any[]).map((c) => ({ id: c.id, label: c.section ? `${c.name}-${c.section}` : c.name, name: c.name, section: c.section }));

  const handleSubmit = async () => {
    if (!name.trim()) { toast.warning("Validation", "Name is required"); return; }
    if (!editingId && !academicYearId) { toast.warning("Validation", "Academic year is required"); return; }
    if (!dueDate.trim()) { toast.warning("Validation", "Due date is required"); return; }
    const comps = components.filter((c) => c.name.trim() && c.amount.trim()).map((c) => ({ name: c.name.trim(), amount: parseFloat(c.amount) || 0, is_optional: c.is_optional }));
    if (comps.length === 0) { toast.warning("Validation", "Add at least one fee component"); return; }
    try {
      if (editingId) {
        await onUpdate(editingId, { name: name.trim(), due_date: dueDate.trim(), class_ids: classIds, components: comps });
      } else {
        await onCreate({ name: name.trim(), academic_year_id: academicYearId, class_ids: classIds, due_date: dueDate.trim(), components: comps });
      }
    } catch (e: any) {
      toast.error("Error", e?.message ?? "Failed to save");
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={mStyles.overlay}>
        <View style={mStyles.sheet}>
          <View style={mStyles.header}>
            <Text style={mStyles.title}>{editingId ? "Edit Structure" : "Create Structure"}</Text>
            <TouchableOpacity onPress={onClose} style={mStyles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icons.Close size={22} color={theme.colors.text[700]} />
            </TouchableOpacity>
          </View>
          <ScrollView style={mStyles.form} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={mStyles.label}>Structure Name *</Text>
            <Text style={mStyles.helper}>A short name to identify this fee structure</Text>
            <TextInput style={mStyles.input} value={name} onChangeText={setName} placeholder="e.g. Term 1 Fee 2025" placeholderTextColor={theme.colors.text[400]} />

            {!editingId && (
              <>
                <Text style={mStyles.label}>Academic Year *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={mStyles.chipRow}>
                  {academicYears.map((ay) => (
                    <TouchableOpacity key={ay.id} style={[mStyles.chip, academicYearId === ay.id && mStyles.chipActive]} onPress={() => setAcademicYearId(ay.id)}>
                      <Text style={[mStyles.chipText, academicYearId === ay.id && mStyles.chipTextActive]}>{ay.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            <Text style={mStyles.label}>Classes</Text>
            <Text style={mStyles.helper}>Select one or more classes this structure applies to. Leave empty for all classes.</Text>
            <ClassMultiSelect value={classIds} onChange={setClassIds} options={classOptions} placeholder="All classes" />

            <Text style={mStyles.label}>Due Date * (YYYY-MM-DD)</Text>
            <Text style={mStyles.helper}>When is the fee due?</Text>
            <TextInput style={mStyles.input} value={dueDate} onChangeText={setDueDate} placeholder="e.g. 2025-03-31" placeholderTextColor={theme.colors.text[400]} keyboardType="numbers-and-punctuation" maxLength={10} />

            <View style={mStyles.compHeader}>
              <Text style={mStyles.label}>Fee Components</Text>
              <TouchableOpacity style={mStyles.addCompBtn} onPress={() => setComponents([...components, { name: "", amount: "", is_optional: false }])}>
                <Icons.Add size={18} color={theme.colors.primary[500]} />
                <Text style={mStyles.addCompText}>Add</Text>
              </TouchableOpacity>
            </View>
            {components.map((c, i) => (
              <View key={i} style={mStyles.compRow}>
                <TextInput style={[mStyles.input, mStyles.compName]} value={c.name} onChangeText={(v) => updateComp(i, "name", v)} placeholder="Component name" placeholderTextColor={theme.colors.text[400]} />
                <TextInput style={[mStyles.input, mStyles.compAmount]} value={c.amount} onChangeText={(v) => updateComp(i, "amount", v)} placeholder="Amount" placeholderTextColor={theme.colors.text[400]} keyboardType="decimal-pad" />
                <View style={mStyles.optRow}>
                  <Text style={mStyles.optLabel}>Opt</Text>
                  <Switch value={c.is_optional} onValueChange={(v) => updateComp(i, "is_optional", v)} trackColor={{ true: theme.colors.primary[500] }} />
                </View>
                <TouchableOpacity onPress={() => { if (components.length > 1) setComponents(components.filter((_, idx) => idx !== i)); }} disabled={components.length <= 1} style={mStyles.removeBtn}>
                  <Icons.Close size={18} color={components.length <= 1 ? theme.colors.text[300] : theme.colors.danger} />
                </TouchableOpacity>
              </View>
            ))}
            <View style={{ height: theme.spacing.xxl }} />
          </ScrollView>
          <View style={mStyles.footer}>
            <TouchableOpacity style={mStyles.cancelBtn} onPress={onClose}>
              <Text style={mStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <PrimaryButton title={editingId ? "Update" : "Create"} onPress={handleSubmit} loading={isCreating || isUpdating} style={mStyles.submitBtn} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── AssignStructureModal ──────────────────────────────────────────────────────

interface AssignStructureModalProps {
  visible: boolean; onClose: () => void; structureId: string | null;
  structureName?: string; structureClassIds?: string[];
  classes: { id: string; name: string; section?: string }[];
  onAssign: (studentIds: string[]) => Promise<void>; isAssigning: boolean;
}

function AssignStructureModal({ visible, onClose, structureId, structureName, structureClassIds = [], classes, onAssign, isAssigning }: AssignStructureModalProps) {
  const toast = useToast();
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const hasUserToggledRef = React.useRef(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const deleteFeeMut = useDeleteStudentFee();

  const { data: structure, isFetching: structureFetching, refetch: refetchStructure } = useStructure(structureId ?? undefined, visible && !!structureId);
  const effectiveStructureClassIds = structure?.class_ids ?? structureClassIds;
  const effectiveStructureName = structure?.name ?? structureName;
  const structureReady = !structureId || !structureFetching;

  useEffect(() => { if (visible && structureId) refetchStructure(); }, [visible, structureId]);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const isAllClassesStructure = effectiveStructureClassIds.length === 0;
  const allowedClasses = isAllClassesStructure ? classes : classes.filter((c) => effectiveStructureClassIds.includes(c.id));
  const effectiveClassIds = isAllClassesStructure ? allowedClasses.map((c) => c.id) : effectiveStructureClassIds;

  const { data: displayStudents = [], isLoading: studentsLoading } = useStudentsForAssign(
    visible ? { class_ids: effectiveClassIds.length > 0 ? effectiveClassIds : undefined, search: debouncedSearch || undefined } : undefined, visible
  );
  const { data: structureFees = [], isLoading: structureFeesLoading } = useStudentFees(structureId ? { fee_structure_id: structureId, include_items: false } : undefined);

  const { assignedStudentIds, assignedFeeIdsByStudent } = React.useMemo(() => {
    const ids = new Set<string>(); const map = new Map<string, string>();
    if (!structureFees || (structureFees as any[]).length === 0) return { assignedStudentIds: ids, assignedFeeIdsByStudent: map };
    const classFilter = new Set(effectiveClassIds);
    (structureFees as Array<{ id: string; student_id: string; class_id?: string }>).forEach((sf) => {
      if (classFilter.size === 0 || !sf.class_id || classFilter.has(sf.class_id)) { ids.add(sf.student_id); map.set(sf.student_id, sf.id); }
    });
    return { assignedStudentIds: ids, assignedFeeIdsByStudent: map };
  }, [structureFees, effectiveClassIds]);

  useEffect(() => {
    if (!visible) { setSelectedStudentIds(new Set()); hasUserToggledRef.current = false; setSearchQuery(""); setDebouncedSearch(""); }
  }, [visible]);
  useEffect(() => {
    if (!visible || structureFeesLoading || !structureReady || hasUserToggledRef.current) return;
    setSelectedStudentIds(assignedStudentIds.size > 0 ? new Set(assignedStudentIds) : new Set());
  }, [visible, assignedStudentIds, structureFeesLoading, structureReady]);

  const toggleStudent = (id: string) => {
    hasUserToggledRef.current = true;
    setSelectedStudentIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const handleAssign = async () => {
    const selected = new Set(selectedStudentIds);
    const toAdd: string[] = [];
    const toRemoveFeeIds: string[] = [];
    assignedStudentIds.forEach((sid) => { if (!selected.has(sid)) { const feeId = assignedFeeIdsByStudent.get(sid); if (feeId) toRemoveFeeIds.push(feeId); } });
    selected.forEach((sid) => { if (!assignedStudentIds.has(sid)) toAdd.push(sid); });
    try {
      if (toRemoveFeeIds.length > 0) await Promise.all(toRemoveFeeIds.map((fid) => deleteFeeMut.mutateAsync(fid)));
      if (toAdd.length > 0) await onAssign(toAdd);
      onClose();
    } catch (e: any) {
      toast.error("Error", e?.message ?? "Failed to update student assignments. Some students may have payments recorded and cannot be removed.");
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={mStyles.overlay}>
        <View style={[mStyles.sheet, { maxHeight: "85%" }]}>
          <View style={mStyles.header}>
            <Text style={mStyles.title}>Assign: {effectiveStructureName ?? "—"}</Text>
            <TouchableOpacity onPress={onClose} style={mStyles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icons.Close size={22} color={theme.colors.text[700]} />
            </TouchableOpacity>
          </View>
          <View style={mStyles.assignInfo}>
            <Text style={mStyles.helper}>
              {isAllClassesStructure ? "This fee structure applies to all classes." : `Structure classes: ${allowedClasses.length ? allowedClasses.map((c) => (c.section ? `${c.name}-${c.section}` : c.name)).join(", ") : "—"}`}
            </Text>
            <Text style={mStyles.helper}>Select individual students to assign or remove this fee structure.</Text>
          </View>
          <View style={mStyles.assignSearch}>
            <TextInput
              style={mStyles.input}
              placeholder="Search name, admission number…"
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={theme.colors.text[400]}
            />
          </View>
          <ScrollView style={{ maxHeight: 260, paddingHorizontal: theme.spacing.m }} showsVerticalScrollIndicator>
            {studentsLoading ? (
              <ActivityIndicator size="small" color={theme.colors.primary[500]} style={{ margin: theme.spacing.m }} />
            ) : (
              (displayStudents as Array<{ id: string; name?: string; admission_number?: string }>).map((s) => (
                <TouchableOpacity key={s.id} style={[mStyles.studentRow, selectedStudentIds.has(s.id) && mStyles.studentRowActive]} onPress={() => toggleStudent(s.id)}>
                  {selectedStudentIds.has(s.id)
                    ? <Icons.CheckMark size={20} color={theme.colors.primary[500]} />
                    : <View style={mStyles.checkbox} />}
                  <Text style={mStyles.studentName}>{s.name ?? s.admission_number ?? s.id}</Text>
                </TouchableOpacity>
              ))
            )}
            {!studentsLoading && displayStudents.length === 0 && (
              <Text style={mStyles.emptyText}>{searchQuery.trim() ? "No students match your search" : "No students"}</Text>
            )}
          </ScrollView>
          <View style={mStyles.footer}>
            <TouchableOpacity style={mStyles.cancelBtn} onPress={onClose}>
              <Text style={mStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <PrimaryButton title="Assign" onPress={handleAssign} loading={isAssigning} style={mStyles.submitBtn} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  addBtn: {
    width: 36, height: 36, borderRadius: theme.radius.m,
    backgroundColor: theme.colors.primary[50], alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: theme.colors.primary[200],
  },
  filterBar: { paddingHorizontal: theme.spacing.m, paddingVertical: theme.spacing.s, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  filterLabel: { ...theme.typography.caption, color: theme.colors.text[500], marginBottom: theme.spacing.xs },
  filterScroll: {},
  chip: {
    paddingHorizontal: theme.spacing.m, paddingVertical: theme.spacing.xs + 2,
    borderRadius: theme.radius.full, backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1, borderColor: theme.colors.border, marginRight: theme.spacing.s,
  },
  chipActive: { backgroundColor: theme.colors.primary[500], borderColor: theme.colors.primary[500] },
  chipText: { ...theme.typography.caption, fontWeight: "500", color: theme.colors.text[700] },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  list: { padding: theme.spacing.m, paddingBottom: 100 },
  card: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: theme.colors.surface, borderRadius: theme.radius.xl,
    padding: theme.spacing.m, borderWidth: 1, borderColor: theme.colors.border,
    marginBottom: theme.spacing.s, ...theme.shadows.sm,
  },
  cardIconBg: {
    width: 46, height: 46, borderRadius: theme.radius.l,
    backgroundColor: theme.colors.primary[50], alignItems: "center",
    justifyContent: "center", marginRight: theme.spacing.m, flexShrink: 0,
  },
  cardInfo: { flex: 1 },
  cardName: { ...theme.typography.body, fontWeight: "600", color: theme.colors.text[900] },
  cardDetail: { ...theme.typography.caption, color: theme.colors.text[500], marginTop: 2 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  cardMetaText: { ...theme.typography.caption, color: theme.colors.text[500] },
  cardActions: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs },
  actionIconBtn: { alignItems: "center", paddingVertical: theme.spacing.xs, paddingHorizontal: theme.spacing.s },
  actionIconLabel: { ...theme.typography.caption, color: theme.colors.primary[500], marginTop: 2, fontWeight: "500" },
});

const mStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.radius.xxl,
    borderTopRightRadius: theme.radius.xxl, maxHeight: "90%",
  },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: theme.spacing.l, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  title: { ...theme.typography.h3, color: theme.colors.text[900] },
  closeBtn: {
    width: 34, height: 34, borderRadius: theme.radius.m,
    backgroundColor: theme.colors.backgroundSecondary, alignItems: "center", justifyContent: "center",
  },
  form: { padding: theme.spacing.l },
  label: { ...theme.typography.label, color: theme.colors.text[700], marginBottom: 2, marginTop: theme.spacing.m },
  helper: { ...theme.typography.caption, color: theme.colors.text[500], marginBottom: theme.spacing.s },
  input: {
    borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: theme.radius.l,
    paddingHorizontal: theme.spacing.m, paddingVertical: theme.spacing.sm,
    ...theme.typography.body, color: theme.colors.text[900],
    backgroundColor: theme.colors.surface, marginBottom: theme.spacing.s,
  },
  chipRow: { marginBottom: theme.spacing.m },
  chip: {
    paddingHorizontal: theme.spacing.m, paddingVertical: theme.spacing.s,
    borderRadius: theme.radius.full, borderWidth: 1, borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface, marginRight: theme.spacing.s,
  },
  chipActive: { borderColor: theme.colors.primary[500], backgroundColor: theme.colors.primary[500] },
  chipText: { ...theme.typography.caption, fontWeight: "600", color: theme.colors.text[700] },
  chipTextActive: { color: "#fff" },
  compHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: theme.spacing.m },
  addCompBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: theme.colors.primary[50], paddingHorizontal: theme.spacing.s,
    paddingVertical: theme.spacing.xs, borderRadius: theme.radius.m,
    borderWidth: 1, borderColor: theme.colors.primary[200],
  },
  addCompText: { ...theme.typography.caption, color: theme.colors.primary[600], fontWeight: "600" },
  compRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs, marginBottom: theme.spacing.xs },
  compName: { flex: 2, marginBottom: 0 },
  compAmount: { flex: 1, marginBottom: 0 },
  optRow: { alignItems: "center" },
  optLabel: { ...theme.typography.caption, color: theme.colors.text[500] },
  removeBtn: { padding: 4 },
  footer: {
    flexDirection: "row", gap: theme.spacing.m, padding: theme.spacing.l,
    borderTopWidth: 1, borderTopColor: theme.colors.border, alignItems: "center",
  },
  cancelBtn: { paddingVertical: theme.spacing.m, paddingHorizontal: theme.spacing.m },
  cancelText: { ...theme.typography.body, color: theme.colors.text[500], fontWeight: "600" },
  submitBtn: { flex: 1 },
  assignInfo: { paddingHorizontal: theme.spacing.l, paddingVertical: theme.spacing.m, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  assignSearch: { paddingHorizontal: theme.spacing.m, paddingTop: theme.spacing.m },
  studentRow: {
    flexDirection: "row", alignItems: "center", gap: theme.spacing.m,
    paddingVertical: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  studentRowActive: { backgroundColor: theme.colors.primary[50] },
  checkbox: {
    width: 20, height: 20, borderRadius: theme.radius.xs,
    borderWidth: 2, borderColor: theme.colors.border,
  },
  studentName: { ...theme.typography.body, color: theme.colors.text[900], flex: 1 },
  emptyText: { ...theme.typography.body, color: theme.colors.text[400], fontStyle: "italic", padding: theme.spacing.m },
});
