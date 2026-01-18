import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '@/common/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import SafeScreenWrapper from '@/common/components/SafeScreenWrapper';
import { useAuth } from '@/common/hooks/useAuth';
import { usePermissions } from '@/common/hooks/usePermissions';
import { Protected } from '@/common/components/Protected';
import * as PERMS from '@/common/constants/permissions';

export default function ProtectedHomeScreen() {
  const { user, logout } = useAuth();
  const { permissions, hasPermission } = usePermissions();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <SafeScreenWrapper backgroundColor={Colors.background}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark" size={64} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Welcome!</Text>
          <Text style={styles.subtitle}>
            {user?.email}
          </Text>
        </View>

        <View style={styles.content}>
          {/* User Info Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="person-circle-outline" size={24} color={Colors.primary} />
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
              <Text style={styles.cardTitle}>Your Permissions ({permissions.length})</Text>
            </View>
            <View style={styles.cardContent}>
              {permissions.length > 0 ? (
                permissions.slice(0, 5).map((perm, index) => (
                  <View key={index} style={styles.permissionItem}>
                    <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
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
              
              {/* Show Create Student button only if user has permission */}
              <Protected permission={PERMS.STUDENT_CREATE}>
                <TouchableOpacity style={styles.actionButton}>
                  <Ionicons name="person-add" size={24} color={Colors.primary} />
                  <Text style={styles.actionText}>Create Student</Text>
                </TouchableOpacity>
              </Protected>

              {/* Show Mark Attendance only if user has permission */}
              <Protected permission={PERMS.ATTENDANCE_MARK}>
                <TouchableOpacity style={styles.actionButton}>
                  <Ionicons name="checkbox-outline" size={24} color={Colors.primary} />
                  <Text style={styles.actionText}>Mark Attendance</Text>
                </TouchableOpacity>
              </Protected>

              {/* Show Grade Management for teachers/admins */}
              <Protected anyPermissions={[PERMS.GRADE_CREATE, PERMS.GRADE_MANAGE]}>
                <TouchableOpacity style={styles.actionButton}>
                  <Ionicons name="school-outline" size={24} color={Colors.primary} />
                  <Text style={styles.actionText}>Manage Grades</Text>
                </TouchableOpacity>
              </Protected>

              {/* Show View Grades for students */}
              <Protected permission={PERMS.GRADE_READ_SELF}>
                <TouchableOpacity style={styles.actionButton}>
                  <Ionicons name="ribbon-outline" size={24} color={Colors.primary} />
                  <Text style={styles.actionText}>My Grades</Text>
                </TouchableOpacity>
              </Protected>

              {/* Show Admin Panel only for admins */}
              <Protected anyPermissions={[PERMS.USER_MANAGE, PERMS.SYSTEM_MANAGE]}>
                <TouchableOpacity style={styles.actionButton}>
                  <Ionicons name="settings-outline" size={24} color={Colors.primary} />
                  <Text style={styles.actionText}>Admin Panel</Text>
                </TouchableOpacity>
              </Protected>

            </View>
          </View>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
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
    </SafeScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    fontFamily: 'System',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontFamily: 'System',
  },
  content: {
    flex: 1,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 8,
    fontFamily: 'System',
  },
  cardContent: {
    gap: 8,
  },
  cardText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: 'System',
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  permissionText: {
    fontSize: 13,
    color: Colors.text,
    marginLeft: 8,
    fontFamily: 'System',
  },
  noPermissions: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    fontFamily: 'System',
  },
  moreText: {
    fontSize: 12,
    color: Colors.primary,
    marginTop: 4,
    fontFamily: 'System',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '45%',
    flex: 1,
  },
  actionText: {
    fontSize: 12,
    color: Colors.text,
    marginTop: 8,
    textAlign: 'center',
    fontFamily: 'System',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundSecondary,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
    fontFamily: 'System',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundSecondary,
    padding: 16,
    borderRadius: 12,
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
});

