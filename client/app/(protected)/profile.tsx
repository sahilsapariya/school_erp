import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Protected } from "@/modules/permissions/components/Protected";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { getUserRole } from "@/common/constants/navigation";
import * as PERMS from "@/modules/permissions/constants/permissions";
import { ScreenContainer } from "@/src/components/ui/ScreenContainer";
import { SurfaceCard } from "@/src/components/ui/SurfaceCard";
import { Avatar } from "@/src/components/ui/Avatar";
import { useToast } from "@/src/components/ui/Toast";
import { theme } from "@/src/design-system/theme";
import { Icons } from "@/src/design-system/icons";

interface MenuItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, title, subtitle, onPress, rightElement }) => (
  <TouchableOpacity
    style={styles.menuItem}
    onPress={onPress}
    activeOpacity={onPress ? 0.7 : 1}
  >
    <View style={styles.menuItemIcon}>{icon}</View>
    <View style={styles.menuItemText}>
      <Text style={styles.menuItemTitle}>{title}</Text>
      <Text style={styles.menuItemSubtitle}>{subtitle}</Text>
    </View>
    {rightElement ?? (onPress ? <Icons.ChevronRight size={18} color={theme.colors.text[400]} /> : null)}
  </TouchableOpacity>
);

export default function ProfileScreen() {
  const { user, logout, permissions } = useAuth();
  const toast = useToast();

  const userRole = getUserRole(permissions);
  const displayName = user?.name || user?.email?.split("@")[0] || "User";

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      toast.error("Logout failed", "Please try again.");
    }
  };

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <Avatar name={displayName} size={80} />
          <Text style={styles.displayName}>{displayName}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.rolePill}>
            <Text style={styles.roleText}>{userRole}</Text>
          </View>
        </View>

        {/* Profile Actions */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionLabel}>Account</Text>
          <SurfaceCard style={styles.menuCard} padded={false}>
            <MenuItem
              icon={<Icons.Profile size={20} color={theme.colors.primary[500]} />}
              title="Edit Profile"
              subtitle="Update your personal information"
            />
            <Protected anyPermissions={[PERMS.PROFILE_READ_SELF, PERMS.PROFILE_UPDATE_SELF]}>
              <MenuItem
                icon={<Icons.Lock size={20} color={theme.colors.primary[500]} />}
                title="Change Password"
                subtitle="Update your password"
              />
            </Protected>
          </SurfaceCard>
        </View>

        <Protected anyPermissions={[PERMS.GRADE_READ_SELF, PERMS.GRADE_READ_CHILD]}>
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionLabel}>Academic</Text>
            <SurfaceCard style={styles.menuCard} padded={false}>
              <MenuItem
                icon={<Icons.FileText size={20} color={theme.colors.primary[500]} />}
                title="Report Card"
                subtitle="View your academic progress"
              />
            </SurfaceCard>
          </View>
        </Protected>

        <Protected anyPermissions={[PERMS.SYSTEM_MANAGE, PERMS.ROLE_READ]}>
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionLabel}>System</Text>
            <SurfaceCard style={styles.menuCard} padded={false}>
              <MenuItem
                icon={<Icons.Users size={20} color={theme.colors.primary[500]} />}
                title="Roles & Permissions"
                subtitle="View system roles"
              />
              <MenuItem
                icon={<Icons.Info size={20} color={theme.colors.primary[500]} />}
                title="System Info"
                subtitle="App version and details"
                rightElement={<Text style={styles.versionText}>v1.0.0</Text>}
              />
            </SurfaceCard>
          </View>
        </Protected>

        {/* Permissions */}
        {permissions.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionLabel}>My Permissions ({permissions.length})</Text>
            <SurfaceCard style={styles.menuCard}>
              <View style={styles.permissionsWrap}>
                {permissions.slice(0, 8).map((perm, index) => (
                  <View key={index} style={styles.permChip}>
                    <Icons.CheckMark size={11} color={theme.colors.success} />
                    <Text style={styles.permText}>{perm}</Text>
                  </View>
                ))}
                {permissions.length > 8 && (
                  <View style={[styles.permChip, styles.permChipMore]}>
                    <Text style={[styles.permText, styles.permTextMore]}>+{permissions.length - 8} more</Text>
                  </View>
                )}
              </View>
            </SurfaceCard>
          </View>
        )}

        {/* Settings */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionLabel}>Preferences</Text>
          <SurfaceCard style={styles.menuCard} padded={false}>
            <MenuItem
              icon={<Icons.Bell size={20} color={theme.colors.primary[500]} />}
              title="Notifications"
              subtitle="Manage notification preferences"
            />
            <MenuItem
              icon={<Icons.Info size={20} color={theme.colors.primary[500]} />}
              title="Help & Support"
              subtitle="Get help and contact support"
            />
          </SurfaceCard>
        </View>

        {/* Logout */}
        <View style={styles.sectionContainer}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <Icons.LogOut size={20} color={theme.colors.danger} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: theme.spacing.xxl,
  },
  profileCard: {
    alignItems: "center",
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.l,
    paddingHorizontal: theme.spacing.m,
  },
  displayName: {
    ...theme.typography.h2,
    color: theme.colors.text[900],
    marginTop: theme.spacing.m,
    textAlign: "center",
  },
  email: {
    ...theme.typography.body,
    color: theme.colors.text[500],
    marginTop: theme.spacing.xs,
  },
  rolePill: {
    marginTop: theme.spacing.s,
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.primary[50],
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
  },
  roleText: {
    ...theme.typography.caption,
    fontWeight: "600",
    color: theme.colors.primary[600],
  },
  sectionContainer: {
    paddingHorizontal: theme.spacing.m,
    marginBottom: theme.spacing.m,
  },
  sectionLabel: {
    ...theme.typography.overline,
    color: theme.colors.text[500],
    marginBottom: theme.spacing.s,
    paddingHorizontal: theme.spacing.xs,
  },
  menuCard: {
    overflow: "hidden",
    padding: 0,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.m,
    backgroundColor: theme.colors.primary[50],
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.m,
    flexShrink: 0,
  },
  menuItemText: { flex: 1 },
  menuItemTitle: {
    ...theme.typography.body,
    fontWeight: "500",
    color: theme.colors.text[900],
  },
  menuItemSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.text[500],
    marginTop: 2,
  },
  versionText: {
    ...theme.typography.caption,
    color: theme.colors.text[400],
  },
  permissionsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.s,
  },
  permChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: theme.spacing.s,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full,
    gap: 4,
  },
  permChipMore: {
    backgroundColor: theme.colors.primary[50],
  },
  permText: {
    ...theme.typography.caption,
    color: theme.colors.text[700],
  },
  permTextMore: {
    color: theme.colors.primary[500],
    fontWeight: "600",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.s,
    paddingVertical: theme.spacing.m,
    borderRadius: theme.radius.xl,
    borderWidth: 1.5,
    borderColor: theme.colors.danger,
    backgroundColor: theme.colors.dangerLight,
  },
  logoutText: {
    ...theme.typography.label,
    fontWeight: "600",
    color: theme.colors.danger,
  },
});
