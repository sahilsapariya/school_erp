import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { usePermissions } from "@/modules/permissions/hooks/usePermissions";
import { Protected } from "@/modules/permissions/components/Protected";
import * as PERMS from "@/modules/permissions/constants/permissions";
import { isAdmin, isTeacher, getUserRole } from "@/common/constants/navigation";
import { ScreenContainer } from "@/src/components/ui/ScreenContainer";
import { theme } from "@/src/design-system/theme";
import { Icons } from "@/src/design-system/icons";

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  Admin:   { bg: theme.colors.primary[50],  text: theme.colors.primary[700],  border: theme.colors.primary[200],  icon: theme.colors.primary[500] },
  Teacher: { bg: "#e0f2fe",                 text: "#0369a1",                   border: "#bae6fd",                  icon: "#0284c7" },
  Student: { bg: "#dcfce7",                 text: "#15803d",                   border: "#bbf7d0",                  icon: "#16a34a" },
  Parent:  { bg: theme.colors.warningLight, text: "#92400e",                   border: "#fde68a",                  icon: theme.colors.warning },
};

const DEFAULT_ROLE_COLOR = { bg: theme.colors.primary[50], text: theme.colors.primary[700], border: theme.colors.primary[200], icon: theme.colors.primary[500] };

interface ActionItem {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}

function ActionGrid({ actions }: { actions: ActionItem[] }) {
  return (
    <View style={styles.actionsGrid}>
      {actions.map((a, i) => (
        <TouchableOpacity key={i} style={styles.actionCard} onPress={a.onPress} activeOpacity={0.75}>
          <View style={styles.actionIconWrap}>{a.icon}</View>
          <Text style={styles.actionLabel} numberOfLines={2}>{a.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export default function HomeScreen() {
  const { user, logout, isFeatureEnabled } = useAuth();
  const { permissions } = usePermissions();
  const router = useRouter();

  const role = getUserRole(permissions);
  const rc = ROLE_COLORS[role] ?? DEFAULT_ROLE_COLOR;
  const adminUser = isAdmin(permissions);
  const teacherUser = isTeacher(permissions);

  const nav = (path: string) => router.push(path as any);

  return (
    <ScreenContainer scrollable>
      {/* Welcome header */}
      <View style={styles.header}>
        <View style={[styles.avatarRing, { borderColor: rc.border, backgroundColor: rc.bg }]}>
          <Icons.Profile size={36} color={rc.icon} />
        </View>
        <Text style={styles.welcomeText}>Welcome back</Text>
        <Text style={styles.nameText} numberOfLines={1}>{user?.name ?? user?.email}</Text>
        <View style={[styles.roleBadge, { backgroundColor: rc.bg, borderColor: rc.border }]}>
          <Text style={[styles.roleText, { color: rc.text }]}>{role}</Text>
        </View>
      </View>

      {/* ── ADMIN ACTIONS ── */}
      {adminUser && (
        <>
          <SectionTitle>Management</SectionTitle>
          <ActionGrid actions={[
            ...(isFeatureEnabled("student_management") ? [
              { icon: <Icons.Student size={24} color={theme.colors.primary[500]} />, label: "Students", onPress: () => nav("/(protected)/students") },
            ] : []),
            ...(isFeatureEnabled("teacher_management") ? [
              { icon: <Icons.Users size={24} color="#0284c7" />, label: "Teachers", onPress: () => nav("/(protected)/teachers") },
            ] : []),
            ...(isFeatureEnabled("class_management") ? [
              { icon: <Icons.Class size={24} color="#7c3aed" />, label: "Classes", onPress: () => nav("/(protected)/classes") },
            ] : []),
            ...(isFeatureEnabled("fees_management") ? [
              { icon: <Icons.Finance size={24} color="#16a34a" />, label: "Finance", onPress: () => nav("/(protected)/finance") },
            ] : []),
            ...(isFeatureEnabled("attendance") ? [
              { icon: <Icons.Check size={24} color={theme.colors.warning} />, label: "Attendance", onPress: () => nav("/(protected)/attendance/overview") },
            ] : []),
            { icon: <Icons.Calendar size={24} color="#0891b2" />, label: "Academics", onPress: () => nav("/(protected)/academics") },
            ...(isFeatureEnabled("class_management") ? [
              { icon: <Icons.Calendar size={24} color="#6366f1" />, label: "Schedule", onPress: () => nav("/(protected)/schedule/today") },
            ] : []),
          ]} />

          {isFeatureEnabled("teacher_management") && (
            <Protected permission={PERMS.TEACHER_LEAVE_MANAGE}>
              <>
                <SectionTitle>Leave Management</SectionTitle>
                <ActionGrid actions={[
                  { icon: <Icons.FileText size={24} color="#6366f1" />, label: "Leave Requests", onPress: () => nav("/(protected)/teacher-leaves") },
                ]} />
              </>
            </Protected>
          )}
        </>
      )}

      {/* ── TEACHER ACTIONS ── */}
      {teacherUser && !adminUser && (
        <>
          <SectionTitle>Quick Actions</SectionTitle>
          <ActionGrid actions={[
            ...(isFeatureEnabled("attendance") ? [
              { icon: <Icons.Check size={24} color="#0284c7" />, label: "Mark Attendance", onPress: () => nav("/(protected)/attendance/my-classes") },
            ] : []),
            ...(isFeatureEnabled("class_management") ? [
              { icon: <Icons.Calendar size={24} color="#7c3aed" />, label: "Timetable", onPress: () => nav("/(protected)/classes") },
            ] : []),
            ...(isFeatureEnabled("teacher_management") ? [
              { icon: <Icons.Calendar size={24} color={theme.colors.warning} />, label: "My Leaves", onPress: () => nav("/(protected)/my-leaves") },
            ] : []),
            { icon: <Icons.Class size={24} color="#16a34a" />, label: "Academics", onPress: () => nav("/(protected)/academics") },
            { icon: <Icons.Calendar size={24} color="#6366f1" />, label: "Schedule", onPress: () => nav("/(protected)/schedule/today") },
          ]} />
        </>
      )}

      {/* ── STUDENT / PARENT ACTIONS ── */}
      {!adminUser && !teacherUser && (
        <>
          <SectionTitle>Quick Actions</SectionTitle>
          <ActionGrid actions={[
            ...(isFeatureEnabled("attendance") ? [
              { icon: <Icons.Check size={24} color="#0284c7" />, label: "My Attendance", onPress: () => nav("/(protected)/attendance/my-attendance") },
            ] : []),
            { icon: <Icons.Class size={24} color="#16a34a" />, label: "Academics", onPress: () => nav("/(protected)/academics") },
            ...(isFeatureEnabled("fees_management") ? [
              { icon: <Icons.Finance size={24} color={theme.colors.warning} />, label: "Finance", onPress: () => nav("/(protected)/finance") },
            ] : []),
            { icon: <Icons.Profile size={24} color={theme.colors.primary[500]} />, label: "Profile", onPress: () => nav("/(protected)/profile") },
          ]} />
        </>
      )}

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Icons.LogOut size={18} color={theme.colors.danger} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    paddingVertical: theme.spacing.l,
    gap: theme.spacing.xs,
  },
  avatarRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2.5,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacing.xs,
  },
  welcomeText: { ...theme.typography.bodySmall, color: theme.colors.text[400] },
  nameText: { ...theme.typography.h2, color: theme.colors.text[900], textAlign: "center" },
  roleBadge: {
    paddingHorizontal: theme.spacing.s,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    marginTop: 2,
  },
  roleText: { ...theme.typography.bodySmall, fontWeight: "600" },

  sectionTitle: {
    ...theme.typography.overline,
    color: theme.colors.text[400],
    marginTop: theme.spacing.m,
    marginBottom: theme.spacing.s,
  },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.s },
  actionCard: {
    width: "47%",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.l,
    padding: theme.spacing.m,
    alignItems: "center",
    gap: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionIconWrap: {
    width: 50,
    height: 50,
    borderRadius: theme.radius.l,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  actionLabel: {
    ...theme.typography.bodySmall,
    fontWeight: "500",
    color: theme.colors.text[700],
    textAlign: "center",
  },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.dangerLight,
    padding: theme.spacing.s,
    borderRadius: theme.radius.m,
    borderWidth: 1,
    borderColor: theme.colors.danger + "40",
    gap: theme.spacing.xs,
    marginTop: theme.spacing.l,
  },
  logoutText: { ...theme.typography.body, fontWeight: "600", color: theme.colors.danger },
});
