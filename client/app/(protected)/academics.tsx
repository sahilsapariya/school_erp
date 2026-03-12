import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Protected } from "@/modules/permissions/components/Protected";
import { usePermissions } from "@/modules/permissions/hooks/usePermissions";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import * as PERMS from "@/modules/permissions/constants/permissions";
import { useAcademicsOverview } from "@/modules/academics/hooks/useAcademicsOverview";
import { ScreenContainer } from "@/src/components/ui/ScreenContainer";
import { Header } from "@/src/components/ui/Header";
import { SurfaceCard } from "@/src/components/ui/SurfaceCard";
import { theme } from "@/src/design-system/theme";
import { Icons } from "@/src/design-system/icons";

interface NavCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress?: () => void;
  primary?: boolean;
}

function NavCard({ icon, title, subtitle, onPress, primary }: NavCardProps) {
  return (
    <TouchableOpacity
      style={[styles.navCard, primary && styles.navCardPrimary]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.navCardIcon, primary && styles.navCardIconPrimary]}>{icon}</View>
      <View style={styles.navCardText}>
        <Text style={[styles.navCardTitle, primary && styles.navCardTitlePrimary]}>{title}</Text>
        <Text style={[styles.navCardSubtitle, primary && styles.navCardSubtitlePrimary]}>{subtitle}</Text>
      </View>
      <Icons.ChevronRight size={18} color={primary ? "rgba(255,255,255,0.7)" : theme.colors.text[400]} />
    </TouchableOpacity>
  );
}

export default function AcademicsScreen() {
  const { hasAnyPermission } = usePermissions();
  const { isFeatureEnabled } = useAuth();
  const router = useRouter();
  const isAdmin = hasAnyPermission([PERMS.SYSTEM_MANAGE, PERMS.USER_MANAGE]);
  const { data: overview, isLoading: overviewLoading } = useAcademicsOverview(isAdmin);

  const isTeacher = hasAnyPermission([PERMS.ATTENDANCE_MARK, PERMS.GRADE_CREATE]);
  const isStudent = hasAnyPermission([PERMS.GRADE_READ_SELF, PERMS.ATTENDANCE_READ_SELF]);
  const isParent = hasAnyPermission([PERMS.GRADE_READ_CHILD]);

  const push = (p: string) => router.push(p as any);

  const subtitle = isAdmin ? "Manage academic operations"
    : isTeacher ? "My teaching & classes"
    : isStudent ? "My learning & progress"
    : isParent ? "Child's academic progress"
    : "Academic resources";

  return (
    <ScreenContainer>
      <Header title="Academics" subtitle={subtitle} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Admin Overview Stats */}
        <Protected anyPermissions={[PERMS.SYSTEM_MANAGE, PERMS.USER_MANAGE]}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Icons.Class size={26} color={theme.colors.primary[500]} />
                {overviewLoading ? (
                  <ActivityIndicator size="small" color={theme.colors.primary[500]} style={{ marginTop: 8 }} />
                ) : (
                  <Text style={styles.statValue}>{overview?.total_classes ?? 0}</Text>
                )}
                <Text style={styles.statLabel}>Classes</Text>
              </View>
              <View style={styles.statCard}>
                <Icons.FileText size={26} color={theme.colors.primary[500]} />
                {overviewLoading ? (
                  <ActivityIndicator size="small" color={theme.colors.primary[500]} style={{ marginTop: 8 }} />
                ) : (
                  <Text style={styles.statValue}>{overview?.total_subjects ?? 0}</Text>
                )}
                <Text style={styles.statLabel}>Subjects</Text>
              </View>
            </View>
          </View>
        </Protected>

        {/* Classes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {isAdmin ? "All Classes" : isTeacher ? "My Classes" : "Classes"}
          </Text>
          <NavCard
            icon={<Icons.Class size={22} color={theme.colors.primary[500]} />}
            title="View Classes"
            subtitle="See all class schedules"
            onPress={() => push("/(protected)/classes")}
          />
        </View>

        {/* Attendance */}
        {isFeatureEnabled("attendance") && (
          <Protected anyPermissions={[
            PERMS.ATTENDANCE_MARK, PERMS.ATTENDANCE_READ_SELF,
            PERMS.ATTENDANCE_READ_CLASS, PERMS.ATTENDANCE_READ_ALL,
          ]}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Attendance</Text>
              <Protected permission={PERMS.ATTENDANCE_MARK}>
                {!isAdmin && (
                  <NavCard
                    icon={<Icons.CheckMark size={22} color="#fff" />}
                    title="Mark Attendance"
                    subtitle="Take attendance for your classes"
                    onPress={() => push("/(protected)/attendance/my-classes")}
                    primary
                  />
                )}
              </Protected>
              <Protected anyPermissions={[PERMS.ATTENDANCE_READ_SELF]}>
                {!isAdmin && (
                  <NavCard
                    icon={<Icons.Calendar size={22} color={theme.colors.primary[500]} />}
                    title="My Attendance"
                    subtitle="View attendance history and percentage"
                    onPress={() => push("/(protected)/attendance/my-attendance")}
                  />
                )}
              </Protected>
              <Protected permission={PERMS.ATTENDANCE_READ_ALL}>
                <NavCard
                  icon={<Icons.BarChart size={22} color={theme.colors.primary[500]} />}
                  title="Attendance Overview"
                  subtitle="View all attendance records by class and date"
                  onPress={() => push("/(protected)/attendance/overview")}
                />
              </Protected>
            </View>
          </Protected>
        )}

        {/* Grades */}
        <Protected anyPermissions={[
          PERMS.GRADE_CREATE, PERMS.GRADE_READ_SELF, PERMS.GRADE_READ_CLASS, PERMS.GRADE_MANAGE,
        ]}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Grades & Marks</Text>
            <Protected anyPermissions={[PERMS.GRADE_CREATE, PERMS.GRADE_UPDATE]}>
              <NavCard
                icon={<Icons.Edit size={22} color={theme.colors.primary[500]} />}
                title="Enter Grades"
                subtitle="Add or update student grades"
              />
            </Protected>
            <NavCard
              icon={<Icons.Award size={22} color={theme.colors.primary[500]} />}
              title="View Grades"
              subtitle={isAdmin ? "All grades and reports" : isTeacher ? "My class grades" : "Grades and report card"}
            />
          </View>
        </Protected>

        {/* Assignments */}
        <Protected anyPermissions={[
          PERMS.ASSIGNMENT_CREATE, PERMS.ASSIGNMENT_READ_SELF,
          PERMS.ASSIGNMENT_SUBMIT, PERMS.ASSIGNMENT_MANAGE,
        ]}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Assignments</Text>
            <Protected anyPermissions={[PERMS.ASSIGNMENT_CREATE, PERMS.ASSIGNMENT_MANAGE]}>
              <NavCard
                icon={<Icons.Add size={22} color={theme.colors.primary[500]} />}
                title="Create Assignment"
                subtitle="Add new assignment for class"
              />
            </Protected>
            <NavCard
              icon={<Icons.FileText size={22} color={theme.colors.primary[500]} />}
              title={isStudent || isParent ? "View & Submit" : "View Assignments"}
              subtitle={isAdmin ? "All assignments" : isTeacher ? "My class assignments" : "Pending and completed"}
            />
          </View>
        </Protected>

        {/* Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lectures & Schedule</Text>
          <NavCard
            icon={<Icons.Clock size={22} color={theme.colors.primary[500]} />}
            title="Today's Schedule"
            subtitle="View lectures and timings"
            onPress={() => push("/(protected)/schedule/today")}
          />
          <NavCard
            icon={<Icons.Calendar size={22} color={theme.colors.primary[500]} />}
            title="Weekly Timetable"
            subtitle="Full week schedule"
            onPress={() => push("/(protected)/timetable")}
          />
        </View>

      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: theme.spacing.xxl },
  section: {
    paddingHorizontal: theme.spacing.m,
    marginBottom: theme.spacing.l,
  },
  sectionTitle: {
    ...theme.typography.overline,
    color: theme.colors.text[500],
    marginBottom: theme.spacing.m,
  },
  statsRow: { flexDirection: "row", gap: theme.spacing.m },
  statCard: {
    flex: 1, backgroundColor: theme.colors.surface, borderRadius: theme.radius.xl,
    padding: theme.spacing.m, alignItems: "center",
    borderWidth: 1, borderColor: theme.colors.border, ...theme.shadows.sm,
  },
  statValue: { ...theme.typography.h1, color: theme.colors.text[900], marginTop: theme.spacing.s },
  statLabel: { ...theme.typography.caption, color: theme.colors.text[500], marginTop: theme.spacing.xs },
  navCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: theme.colors.surface, borderRadius: theme.radius.xl,
    padding: theme.spacing.m, marginBottom: theme.spacing.s,
    borderWidth: 1, borderColor: theme.colors.border, ...theme.shadows.sm,
  },
  navCardPrimary: { backgroundColor: theme.colors.primary[500], borderColor: theme.colors.primary[600] },
  navCardIcon: {
    width: 46, height: 46, borderRadius: theme.radius.l,
    backgroundColor: theme.colors.primary[50],
    alignItems: "center", justifyContent: "center", marginRight: theme.spacing.m,
  },
  navCardIconPrimary: { backgroundColor: "rgba(255,255,255,0.2)" },
  navCardText: { flex: 1 },
  navCardTitle: { ...theme.typography.body, fontWeight: "600", color: theme.colors.text[900] },
  navCardTitlePrimary: { color: "#fff" },
  navCardSubtitle: { ...theme.typography.caption, color: theme.colors.text[500], marginTop: 2 },
  navCardSubtitlePrimary: { color: "rgba(255,255,255,0.8)" },
});
