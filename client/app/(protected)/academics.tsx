import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '@/common/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import SafeScreenWrapper from '@/common/components/SafeScreenWrapper';
import { Protected } from '@/common/components/Protected';
import { usePermissions } from '@/common/hooks/usePermissions';
import * as PERMS from '@/common/constants/permissions';

export default function AcademicsScreen() {
  const { hasAnyPermission } = usePermissions();

  // Check role type for UI adaptation
  const isAdmin = hasAnyPermission([PERMS.SYSTEM_MANAGE, PERMS.USER_MANAGE]);
  const isTeacher = hasAnyPermission([PERMS.ATTENDANCE_MARK, PERMS.GRADE_CREATE]);
  const isStudent = hasAnyPermission([PERMS.GRADE_READ_SELF, PERMS.ATTENDANCE_READ_SELF]);
  const isParent = hasAnyPermission([PERMS.GRADE_READ_CHILD]);

  return (
    <SafeScreenWrapper backgroundColor={Colors.background}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Academics</Text>
          <Text style={styles.subtitle}>
            {isAdmin && 'Manage academic operations'}
            {isTeacher && 'My teaching & classes'}
            {isStudent && 'My learning & progress'}
            {isParent && "Child&apos;s academic progress"}
          </Text>
        </View>

        {/* Admin View - Academic Overview */}
        <Protected anyPermissions={[PERMS.SYSTEM_MANAGE, PERMS.USER_MANAGE]}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Ionicons name="school-outline" size={32} color={Colors.primary} />
                <Text style={styles.statValue}>24</Text>
                <Text style={styles.statLabel}>Classes</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="book-outline" size={32} color={Colors.primary} />
                <Text style={styles.statValue}>156</Text>
                <Text style={styles.statLabel}>Courses</Text>
              </View>
            </View>
          </View>
        </Protected>

        {/* Classes Section - Visible to All */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {isAdmin && 'All Classes'}
            {isTeacher && 'My Classes'}
            {(isStudent || isParent) && 'Classes'}
          </Text>
          
          <TouchableOpacity style={styles.actionCard}>
            <View style={styles.cardContent}>
              <View style={styles.cardIcon}>
                <Ionicons name="people-outline" size={24} color={Colors.primary} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>View Classes</Text>
                <Text style={styles.cardSubtitle}>See all class schedules</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Attendance Section */}
        <Protected anyPermissions={[
          PERMS.ATTENDANCE_MARK,
          PERMS.ATTENDANCE_READ_SELF,
          PERMS.ATTENDANCE_READ_CLASS,
          PERMS.ATTENDANCE_READ_ALL,
        ]}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Attendance</Text>
            
            {/* Teacher: Mark Attendance */}
            <Protected permission={PERMS.ATTENDANCE_MARK}>
              <TouchableOpacity style={[styles.actionCard, styles.primaryCard]}>
                <View style={styles.cardContent}>
                  <View style={[styles.cardIcon, styles.primaryIcon]}>
                    <Ionicons name="checkbox-outline" size={24} color={Colors.background} />
                  </View>
                  <View style={styles.cardText}>
                    <Text style={[styles.cardTitle, styles.primaryText]}>Mark Attendance</Text>
                    <Text style={[styles.cardSubtitle, styles.primarySubtext]}>Take attendance for your classes</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.background} />
              </TouchableOpacity>
            </Protected>

            {/* View Attendance */}
            <TouchableOpacity style={styles.actionCard}>
              <View style={styles.cardContent}>
                <View style={styles.cardIcon}>
                  <Ionicons name="calendar-outline" size={24} color={Colors.primary} />
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>View Attendance</Text>
                  <Text style={styles.cardSubtitle}>
                    {isAdmin && 'All attendance records'}
                    {isTeacher && 'Class attendance reports'}
                    {(isStudent || isParent) && 'Attendance history'}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </Protected>

        {/* Grades Section */}
        <Protected anyPermissions={[
          PERMS.GRADE_CREATE,
          PERMS.GRADE_READ_SELF,
          PERMS.GRADE_READ_CLASS,
          PERMS.GRADE_MANAGE,
        ]}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Grades & Marks</Text>
            
            {/* Teacher: Enter Grades */}
            <Protected anyPermissions={[PERMS.GRADE_CREATE, PERMS.GRADE_UPDATE]}>
              <TouchableOpacity style={styles.actionCard}>
                <View style={styles.cardContent}>
                  <View style={styles.cardIcon}>
                    <Ionicons name="create-outline" size={24} color={Colors.primary} />
                  </View>
                  <View style={styles.cardText}>
                    <Text style={styles.cardTitle}>Enter Grades</Text>
                    <Text style={styles.cardSubtitle}>Add or update student grades</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </Protected>

            {/* View Grades */}
            <TouchableOpacity style={styles.actionCard}>
              <View style={styles.cardContent}>
                <View style={styles.cardIcon}>
                  <Ionicons name="ribbon-outline" size={24} color={Colors.primary} />
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>View Grades</Text>
                  <Text style={styles.cardSubtitle}>
                    {isAdmin && 'All grades and reports'}
                    {isTeacher && 'My class grades'}
                    {(isStudent || isParent) && 'Grades and report card'}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </Protected>

        {/* Assignments Section */}
        <Protected anyPermissions={[
          PERMS.ASSIGNMENT_CREATE,
          PERMS.ASSIGNMENT_READ_SELF,
          PERMS.ASSIGNMENT_SUBMIT,
          PERMS.ASSIGNMENT_MANAGE,
        ]}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Assignments</Text>
            
            {/* Teacher: Create Assignment */}
            <Protected anyPermissions={[PERMS.ASSIGNMENT_CREATE, PERMS.ASSIGNMENT_MANAGE]}>
              <TouchableOpacity style={styles.actionCard}>
                <View style={styles.cardContent}>
                  <View style={styles.cardIcon}>
                    <Ionicons name="add-circle-outline" size={24} color={Colors.primary} />
                  </View>
                  <View style={styles.cardText}>
                    <Text style={styles.cardTitle}>Create Assignment</Text>
                    <Text style={styles.cardSubtitle}>Add new assignment for class</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </Protected>

            {/* View/Submit Assignments */}
            <TouchableOpacity style={styles.actionCard}>
              <View style={styles.cardContent}>
                <View style={styles.cardIcon}>
                  <Ionicons name="document-text-outline" size={24} color={Colors.primary} />
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>
                    {(isStudent || isParent) ? 'View & Submit' : 'View Assignments'}
                  </Text>
                  <Text style={styles.cardSubtitle}>
                    {isAdmin && 'All assignments'}
                    {isTeacher && 'My class assignments'}
                    {(isStudent || isParent) && 'Pending and completed'}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </Protected>

        {/* Lectures/Schedule Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lectures & Schedule</Text>
          
          <TouchableOpacity style={styles.actionCard}>
            <View style={styles.cardContent}>
              <View style={styles.cardIcon}>
                <Ionicons name="time-outline" size={24} color={Colors.primary} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Today&apos;s Schedule</Text>
                <Text style={styles.cardSubtitle}>View lectures and timings</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <View style={styles.cardContent}>
              <View style={styles.cardIcon}>
                <Ionicons name="calendar-outline" size={24} color={Colors.primary} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Weekly Timetable</Text>
                <Text style={styles.cardSubtitle}>Full week schedule</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
    fontFamily: 'System',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontFamily: 'System',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
    fontFamily: 'System',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 8,
    fontFamily: 'System',
  },
  statLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
    fontFamily: 'System',
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  primaryCard: {
    backgroundColor: Colors.primary,
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
  primaryIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
  primaryText: {
    color: Colors.background,
  },
  cardSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: 'System',
  },
  primarySubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
});
