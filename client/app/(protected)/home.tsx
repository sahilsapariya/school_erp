import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Colors } from "@/common/constants/colors";
import { Spacing, Layout } from "@/common/constants/spacing";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { usePermissions } from "@/modules/permissions/hooks/usePermissions";
import { Protected } from "@/modules/permissions/components/Protected";
import { useRouter } from "expo-router";
import * as PERMS from "@/modules/permissions/constants/permissions";
import { isAdmin, isTeacher, getUserRole } from "@/common/constants/navigation";

const ROLE_COLORS: Record<string, string> = {
  Admin: "#6366f1",
  Teacher: "#0ea5e9",
  Student: "#10b981",
  Parent: "#f59e0b",
};

const ROLE_ICONS: Record<string, keyof typeof import("@expo/vector-icons").Ionicons.glyphMap> = {
  Admin: "shield-checkmark-outline",
  Teacher: "school-outline",
  Student: "person-outline",
  Parent: "people-outline",
};

interface ActionCardProps {
  icon: keyof typeof import("@expo/vector-icons").Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
}

function ActionCard({ icon, label, onPress, color }: ActionCardProps) {
  return (
    <TouchableOpacity style={styles.actionCard} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.actionIcon, { backgroundColor: (color ?? Colors.primary) + "18" }]}>
        <Ionicons name={icon} size={26} color={color ?? Colors.primary} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function ProtectedHomeScreen() {
  const { user, logout, isFeatureEnabled } = useAuth();
  const { permissions } = usePermissions();
  const router = useRouter();

  const role = getUserRole(permissions);
  const roleColor = ROLE_COLORS[role] ?? Colors.primary;
  const roleIcon = ROLE_ICONS[role] ?? "person-outline";
  const adminUser = isAdmin(permissions);
  const teacherUser = isTeacher(permissions);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Welcome header */}
      <View style={styles.header}>
        <View style={[styles.avatarRing, { borderColor: roleColor }]}>
          <Ionicons name={roleIcon} size={40} color={roleColor} />
        </View>
        <Text style={styles.welcomeText}>Welcome back</Text>
        <Text style={styles.nameText}>{user?.name ?? user?.email}</Text>
        <View style={[styles.roleBadge, { backgroundColor: roleColor + "18", borderColor: roleColor + "40" }]}>
          <Text style={[styles.roleText, { color: roleColor }]}>{role}</Text>
        </View>
      </View>

      {/* ── ADMIN QUICK ACTIONS ── */}
      {adminUser && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Management</Text>
          <View style={styles.actionsGrid}>
            {isFeatureEnabled("student_management") && (
              <Protected permission={PERMS.STUDENT_CREATE}>
                <ActionCard icon="person-add-outline" label="Add Student"
                  onPress={() => router.push({ pathname: "/(protected)/students", params: { action: "create" } })} />
              </Protected>
            )}
            {isFeatureEnabled("teacher_management") && (
              <Protected anyPermissions={[PERMS.TEACHER_READ, PERMS.TEACHER_MANAGE]}>
                <ActionCard icon="school-outline" label="Teachers"
                  onPress={() => router.push("/(protected)/teachers" as any)} />
              </Protected>
            )}
            {isFeatureEnabled("class_management") && (
              <Protected anyPermissions={[PERMS.CLASS_READ, PERMS.CLASS_MANAGE]}>
                <ActionCard icon="library-outline" label="Classes"
                  onPress={() => router.push("/(protected)/classes" as any)} />
              </Protected>
            )}
            {isFeatureEnabled("student_management") && (
              <Protected anyPermissions={[PERMS.STUDENT_READ_ALL, PERMS.STUDENT_MANAGE]}>
                <ActionCard icon="people-outline" label="Students"
                  onPress={() => router.push("/(protected)/students" as any)} />
              </Protected>
            )}
            {isFeatureEnabled("fees_management") && (
              <Protected anyPermissions={[PERMS.FINANCE_READ, PERMS.FINANCE_MANAGE]}>
                <ActionCard icon="wallet-outline" label="Finance"
                  onPress={() => router.push("/(protected)/finance" as any)} color="#10b981" />
              </Protected>
            )}
            {isFeatureEnabled("attendance") && (
              <Protected permission={PERMS.ATTENDANCE_READ_ALL}>
                <ActionCard icon="stats-chart-outline" label="Attendance"
                  onPress={() => router.push("/(protected)/attendance/overview" as any)} color="#f59e0b" />
              </Protected>
            )}
          </View>
        </View>
      )}

      {adminUser && isFeatureEnabled("teacher_management") && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Leave Management</Text>
          <View style={styles.actionsGrid}>
            <Protected permission={PERMS.TEACHER_LEAVE_MANAGE}>
              <ActionCard icon="document-text-outline" label="Leave Requests"
                onPress={() => router.push("/(protected)/teacher-leaves" as any)} color="#6366f1" />
            </Protected>
          </View>
        </View>
      )}

      {/* ── TEACHER QUICK ACTIONS ── */}
      {teacherUser && !adminUser && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {isFeatureEnabled("attendance") && (
              <Protected permission={PERMS.ATTENDANCE_MARK}>
                <ActionCard icon="checkbox-outline" label="Mark Attendance"
                  onPress={() => router.push("/(protected)/attendance/my-classes" as any)} color="#0ea5e9" />
              </Protected>
            )}
            {isFeatureEnabled("class_management") && (
              <Protected anyPermissions={[PERMS.TIMETABLE_READ, PERMS.TIMETABLE_MANAGE]}>
                <ActionCard icon="grid-outline" label="Timetable"
                  onPress={() => router.push("/(protected)/classes" as any)} color="#8b5cf6" />
              </Protected>
            )}
            {isFeatureEnabled("teacher_management") && (
              <Protected permission={PERMS.TEACHER_LEAVE_APPLY}>
                <ActionCard icon="calendar-outline" label="My Leaves"
                  onPress={() => router.push("/(protected)/my-leaves" as any)} color="#f59e0b" />
              </Protected>
            )}
            <ActionCard icon="book-outline" label="Academics"
              onPress={() => router.push("/(protected)/academics" as any)} color="#10b981" />
            <ActionCard icon="calendar-outline" label="Schedule"
              onPress={() => router.push("/(protected)/schedule/today" as any)} color="#6366f1" />
          </View>
        </View>
      )}

      {/* ── STUDENT QUICK ACTIONS ── */}
      {!adminUser && !teacherUser && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {isFeatureEnabled("attendance") && (
              <Protected permission={PERMS.ATTENDANCE_READ_SELF}>
                <ActionCard icon="calendar-outline" label="My Attendance"
                  onPress={() => router.push("/(protected)/attendance/my-attendance" as any)} color="#0ea5e9" />
              </Protected>
            )}
            <ActionCard icon="book-outline" label="Academics"
              onPress={() => router.push("/(protected)/academics" as any)} color="#10b981" />
            {isFeatureEnabled("fees_management") && (
              <Protected anyPermissions={[PERMS.FEE_PAY, PERMS.FEE_READ_SELF, PERMS.FEE_READ_CHILD]}>
                <ActionCard icon="wallet-outline" label="Finance"
                  onPress={() => router.push("/(protected)/finance" as any)} color="#f59e0b" />
              </Protected>
            )}
            <ActionCard icon="person-outline" label="Profile"
              onPress={() => router.push("/(protected)/profile" as any)} />
          </View>
        </View>
      )}

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Ionicons name="log-out-outline" size={20} color={Colors.error} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  contentContainer: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.xl },

  header: { alignItems: "center", marginBottom: Spacing.xl, gap: Spacing.sm },
  avatarRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.backgroundSecondary,
    marginBottom: Spacing.sm,
  },
  welcomeText: { fontSize: 14, color: Colors.textSecondary },
  nameText: { fontSize: 22, fontWeight: "700", color: Colors.text, textAlign: "center" },
  roleBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 2,
  },
  roleText: { fontSize: 13, fontWeight: "600" },

  section: { marginBottom: Spacing.xl },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: Spacing.md,
  },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.md },
  actionCard: {
    width: "47%",
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.md,
    alignItems: "center",
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.text,
    textAlign: "center",
  },

  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.backgroundSecondary,
    padding: Spacing.md,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.error + "60",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  logoutText: { fontSize: 15, fontWeight: "600", color: Colors.error },
});
