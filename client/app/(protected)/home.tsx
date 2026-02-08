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

export default function ProtectedHomeScreen() {
  const { user, logout } = useAuth();
  const { permissions } = usePermissions();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="shield-checkmark" size={64} color={Colors.primary} />
        </View>
        <Text style={styles.title}>Welcome!</Text>
        <Text style={styles.subtitle}>{user?.email}</Text>
      </View>

      {/* Cards Container */}
      <View style={styles.cardsContainer}>
        {/* User Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons
              name="person-circle-outline"
              size={24}
              color={Colors.primary}
            />
            <Text style={styles.cardTitle}>Your Profile</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardText}>Email: {user?.email}</Text>
            <Text style={styles.cardText}>ID: {user?.id}</Text>
          </View>
        </View>

        {/* Permissions Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="key-outline" size={24} color={Colors.primary} />
            <Text style={styles.cardTitle}>
              Your Permissions ({permissions.length})
            </Text>
          </View>
          <View style={styles.cardContent}>
            {permissions.length > 0 ? (
              permissions.slice(0, 5).map((perm, index) => (
                <View key={index} style={styles.permissionItem}>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={Colors.success}
                  />
                  <Text style={styles.permissionText}>{perm}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noPermissions}>No permissions assigned</Text>
            )}
            {permissions.length > 5 && (
              <Text style={styles.moreText}>
                +{permissions.length - 5} more permissions
              </Text>
            )}
          </View>
        </View>

        {/* Quick Actions - Shown based on permissions */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="apps-outline" size={24} color={Colors.primary} />
            <Text style={styles.cardTitle}>Quick Actions</Text>
          </View>
          <View style={styles.actionsGrid}>
            {/* Show Create Student button */}
            <Protected permission={PERMS.STUDENT_CREATE}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() =>
                  router.push({
                    pathname: "/(protected)/students",
                    params: { action: "create" },
                  })
                }
              >
                <Ionicons name="person-add" size={24} color={Colors.primary} />
                <Text style={styles.actionText}>Create Student</Text>
              </TouchableOpacity>
            </Protected>

            {/* Show Mark Attendance button */}
            <Protected permission={PERMS.ATTENDANCE_MARK}>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons
                  name="checkbox-outline"
                  size={24}
                  color={Colors.primary}
                />
                <Text style={styles.actionText}>Mark Attendance</Text>
              </TouchableOpacity>
            </Protected>

            {/* Show Grade Management for teachers/admins */}
            <Protected
              anyPermissions={[PERMS.GRADE_CREATE, PERMS.GRADE_MANAGE]}
            >
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons
                  name="school-outline"
                  size={24}
                  color={Colors.primary}
                />
                <Text style={styles.actionText}>Manage Grades</Text>
              </TouchableOpacity>
            </Protected>

            {/* Show My Grades button */}
            <Protected permission={PERMS.GRADE_READ_SELF}>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons
                  name="ribbon-outline"
                  size={24}
                  color={Colors.primary}
                />
                <Text style={styles.actionText}>My Grades</Text>
              </TouchableOpacity>
            </Protected>

            {/* Show Admin Panel only for admins */}
            <Protected
              anyPermissions={[PERMS.USER_MANAGE, PERMS.SYSTEM_MANAGE]}
            >
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons
                  name="settings-outline"
                  size={24}
                  color={Colors.primary}
                />
                <Text style={styles.actionText}>Admin Panel</Text>
              </TouchableOpacity>
            </Protected>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={Colors.primary}
          />
          <Text style={styles.infoText}>
            This dashboard shows features based on your assigned permissions.
            Contact your administrator if you need additional access.
          </Text>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={Colors.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: Spacing.sm,
    fontFamily: "System",
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontFamily: "System",
  },
  cardsContainer: {
    gap: Spacing.md,
  },
  card: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
    marginLeft: Spacing.sm,
    fontFamily: "System",
  },
  cardContent: {
    gap: Spacing.sm,
  },
  cardText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: "System",
  },
  permissionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.xs,
  },
  permissionText: {
    fontSize: 13,
    color: Colors.text,
    marginLeft: Spacing.sm,
    fontFamily: "System",
  },
  noPermissions: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: "italic",
    fontFamily: "System",
  },
  moreText: {
    fontSize: 12,
    color: Colors.primary,
    marginTop: Spacing.xs,
    fontFamily: "System",
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  actionButton: {
    backgroundColor: Colors.background,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
    width: "47%",
  },
  actionText: {
    fontSize: 12,
    color: Colors.text,
    marginTop: Spacing.sm,
    textAlign: "center",
    fontFamily: "System",
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: Colors.backgroundSecondary,
    padding: Spacing.md,
    borderRadius: Layout.borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: Spacing.md,
    flex: 1,
    lineHeight: 20,
    fontFamily: "System",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.backgroundSecondary,
    padding: Spacing.md,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.error,
    marginLeft: Spacing.sm,
    fontFamily: "System",
  },
});
