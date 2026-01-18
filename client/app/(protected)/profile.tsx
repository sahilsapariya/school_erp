import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '@/common/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import SafeScreenWrapper from '@/common/components/SafeScreenWrapper';
import { Protected } from '@/common/components/Protected';
import { useAuth } from '@/common/hooks/useAuth';
import { getUserRole } from '@/common/constants/navigation';
import * as PERMS from '@/common/constants/permissions';

export default function ProfileScreen() {
  const { user, logout, permissions } = useAuth();

  const userRole = getUserRole(permissions);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <SafeScreenWrapper backgroundColor={Colors.background}>
      <ScrollView style={styles.container}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={48} color={Colors.primary} />
            </View>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{userRole}</Text>
            </View>
          </View>
          <Text style={styles.name}>{user?.email?.split('@')[0]}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        {/* Profile Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Information</Text>
          
          <TouchableOpacity style={styles.infoCard}>
            <View style={styles.cardContent}>
              <View style={styles.cardIcon}>
                <Ionicons name="person-outline" size={24} color={Colors.primary} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Edit Profile</Text>
                <Text style={styles.cardSubtitle}>Update personal information</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>

          <Protected anyPermissions={[PERMS.PROFILE_READ_SELF, PERMS.PROFILE_UPDATE_SELF]}>
            <TouchableOpacity style={styles.infoCard}>
              <View style={styles.cardContent}>
                <View style={styles.cardIcon}>
                  <Ionicons name="shield-outline" size={24} color={Colors.primary} />
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>Change Password</Text>
                  <Text style={styles.cardSubtitle}>Update your password</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </Protected>
        </View>

        {/* Academic Info - Student/Parent */}
        <Protected anyPermissions={[PERMS.GRADE_READ_SELF, PERMS.GRADE_READ_CHILD]}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Academic</Text>
            
            <TouchableOpacity style={styles.infoCard}>
              <View style={styles.cardContent}>
                <View style={styles.cardIcon}>
                  <Ionicons name="document-text-outline" size={24} color={Colors.primary} />
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>Report Card</Text>
                  <Text style={styles.cardSubtitle}>View academic progress</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </Protected>

        {/* Permissions & Roles - Admin View */}
        <Protected anyPermissions={[PERMS.SYSTEM_MANAGE, PERMS.ROLE_READ]}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>System</Text>
            
            <TouchableOpacity style={styles.infoCard}>
              <View style={styles.cardContent}>
                <View style={styles.cardIcon}>
                  <Ionicons name="people-outline" size={24} color={Colors.primary} />
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>Roles & Permissions</Text>
                  <Text style={styles.cardSubtitle}>View system roles (read-only)</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>

            <View style={styles.infoCard}>
              <View style={styles.cardContent}>
                <View style={styles.cardIcon}>
                  <Ionicons name="information-circle-outline" size={24} color={Colors.primary} />
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>System Info</Text>
                  <Text style={styles.cardSubtitle}>App version and details</Text>
                </View>
              </View>
              <Text style={styles.versionText}>v1.0.0</Text>
            </View>
          </View>
        </Protected>

        {/* My Permissions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Permissions ({permissions.length})</Text>
          
          <View style={styles.permissionsCard}>
            {permissions.slice(0, 8).map((perm, index) => (
              <View key={index} style={styles.permissionChip}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                <Text style={styles.permissionText}>{perm}</Text>
              </View>
            ))}
            {permissions.length > 8 && (
              <TouchableOpacity style={styles.permissionChip}>
                <Text style={[styles.permissionText, styles.moreText]}>
                  +{permissions.length - 8} more
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          <TouchableOpacity style={styles.infoCard}>
            <View style={styles.cardContent}>
              <View style={styles.cardIcon}>
                <Ionicons name="notifications-outline" size={24} color={Colors.primary} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Notifications</Text>
                <Text style={styles.cardSubtitle}>Manage notification preferences</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.infoCard}>
            <View style={styles.cardContent}>
              <View style={styles.cardIcon}>
                <Ionicons name="help-circle-outline" size={24} color={Colors.primary} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Help & Support</Text>
                <Text style={styles.cardSubtitle}>Get help and contact support</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.infoCard}>
            <View style={styles.cardContent}>
              <View style={styles.cardIcon}>
                <Ionicons name="document-outline" size={24} color={Colors.primary} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Terms & Privacy</Text>
                <Text style={styles.cardSubtitle}>View terms and privacy policy</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color={Colors.error} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </SafeScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: Colors.backgroundSecondary,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: Colors.primary,
  },
  roleBadge: {
    position: 'absolute',
    bottom: 0,
    right: -8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.background,
    fontFamily: 'System',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
    fontFamily: 'System',
  },
  email: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: 'System',
  },
  section: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
    fontFamily: 'System',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
    fontFamily: 'System',
  },
  cardSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: 'System',
  },
  versionText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: 'System',
  },
  permissionsCard: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  permissionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  permissionText: {
    fontSize: 12,
    color: Colors.text,
    fontFamily: 'System',
  },
  moreText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundSecondary,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.error,
    marginLeft: 8,
    fontFamily: 'System',
  },
  spacer: {
    height: 32,
  },
});
