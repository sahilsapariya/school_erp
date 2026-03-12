import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { usePermissions } from '@/modules/permissions/hooks/usePermissions';
import { Protected } from '@/modules/permissions/components/Protected';
import * as PERMS from '@/modules/permissions/constants/permissions';
import { ScreenContainer } from '@/src/components/ui/ScreenContainer';
import { Avatar } from '@/src/components/ui/Avatar';
import { SurfaceCard } from '@/src/components/ui/SurfaceCard';
import { useToast } from '@/src/components/ui/Toast';
import { theme } from '@/src/design-system/theme';
import { Icons } from '@/src/design-system/icons';
import { getUserRole } from '@/common/constants/navigation';

interface MenuRowProps {
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  onPress: () => void;
  destructive?: boolean;
}

const MenuRow: React.FC<MenuRowProps> = ({ icon, label, subtitle, onPress, destructive }) => (
  <TouchableOpacity
    style={styles.menuRow}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[styles.menuRowIcon, destructive && styles.menuRowIconDestructive]}>
      {icon}
    </View>
    <View style={styles.menuRowText}>
      <Text style={[styles.menuRowLabel, destructive && styles.menuRowLabelDestructive]}>
        {label}
      </Text>
      {subtitle ? <Text style={styles.menuRowSubtitle}>{subtitle}</Text> : null}
    </View>
    {!destructive && <Icons.ChevronRight size={18} color={theme.colors.text[400]} />}
  </TouchableOpacity>
);

export const MoreMenuScreen: React.FC = () => {
  const router = useRouter();
  const { user, logout, isFeatureEnabled, permissions } = useAuth();
  const toast = useToast();

  const displayName = user?.name || user?.email?.split('@')[0] || 'User';
  const userRole = getUserRole(permissions || []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      toast.error('Logout failed', 'Please try again.');
    }
  };

  const push = (path: string) => router.push(path as any);

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* User card */}
        <View style={styles.userCard}>
          <Avatar name={displayName} size={56} />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{displayName}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
          <View style={styles.rolePill}>
            <Text style={styles.rolePillText}>{userRole}</Text>
          </View>
        </View>

        {/* Quick access */}
        <Text style={styles.sectionLabel}>Academics</Text>
        <SurfaceCard style={styles.card} padded={false}>
          <MenuRow
            icon={<Icons.Class size={18} color={theme.colors.primary[500]} />}
            label="Academics"
            subtitle="Exams, grades & subjects"
            onPress={() => push('/(protected)/academics')}
          />
          <Protected anyPermissions={[PERMS.TIMETABLE_READ, PERMS.TIMETABLE_MANAGE]}>
            <MenuRow
              icon={<Icons.Calendar size={18} color={theme.colors.primary[500]} />}
              label="Schedule"
              subtitle="Today's class schedule"
              onPress={() => push('/(protected)/schedule/today')}
            />
          </Protected>
          <Protected anyPermissions={[PERMS.HOLIDAY_READ, PERMS.HOLIDAY_MANAGE]}>
            <MenuRow
              icon={<Icons.Calendar size={18} color={theme.colors.primary[500]} />}
              label="Holidays"
              subtitle="School holiday calendar"
              onPress={() => push('/(protected)/holidays')}
            />
          </Protected>
        </SurfaceCard>

        {/* Attendance */}
        <Text style={styles.sectionLabel}>Attendance</Text>
        <SurfaceCard style={styles.card} padded={false}>
          <Protected permission={PERMS.ATTENDANCE_MARK}>
            <MenuRow
              icon={<Icons.CheckMark size={18} color={theme.colors.success} />}
              label="Mark Attendance"
              subtitle="Take attendance for your classes"
              onPress={() => push('/(protected)/attendance/my-classes')}
            />
          </Protected>
          <Protected permission={PERMS.ATTENDANCE_READ_SELF}>
            <MenuRow
              icon={<Icons.BarChart size={18} color={theme.colors.primary[500]} />}
              label="My Attendance"
              subtitle="View your attendance history"
              onPress={() => push('/(protected)/attendance/my-attendance')}
            />
          </Protected>
          <Protected permission={PERMS.ATTENDANCE_READ_ALL}>
            <MenuRow
              icon={<Icons.BarChart size={18} color={theme.colors.primary[500]} />}
              label="Attendance Overview"
              subtitle="Admin attendance overview"
              onPress={() => push('/(protected)/attendance/overview')}
            />
          </Protected>
        </SurfaceCard>

        {/* Finance */}
        {isFeatureEnabled('fees_management') && (
          <>
            <Text style={styles.sectionLabel}>Finance</Text>
            <SurfaceCard style={styles.card} padded={false}>
              <Protected anyPermissions={[PERMS.FINANCE_READ, PERMS.FINANCE_MANAGE, PERMS.FEE_PAY, PERMS.FEE_READ_SELF]}>
                <MenuRow
                  icon={<Icons.Finance size={18} color={theme.colors.warning} />}
                  label="Finance"
                  subtitle="Fees & payments"
                  onPress={() => push('/(protected)/finance')}
                />
              </Protected>
            </SurfaceCard>
          </>
        )}

        {/* Leaves */}
        <Text style={styles.sectionLabel}>Leave Management</Text>
        <SurfaceCard style={styles.card} padded={false}>
          <Protected permission={PERMS.TEACHER_LEAVE_APPLY}>
            <MenuRow
              icon={<Icons.FileText size={18} color={theme.colors.primary[500]} />}
              label="My Leaves"
              subtitle="Apply and track your leaves"
              onPress={() => push('/(protected)/my-leaves')}
            />
          </Protected>
          <Protected permission={PERMS.TEACHER_LEAVE_MANAGE}>
            <MenuRow
              icon={<Icons.FileText size={18} color={theme.colors.warning} />}
              label="Leave Requests"
              subtitle="Manage teacher leave requests"
              onPress={() => push('/(protected)/teacher-leaves')}
            />
          </Protected>
        </SurfaceCard>

        {/* Account */}
        <Text style={styles.sectionLabel}>Account</Text>
        <SurfaceCard style={styles.card} padded={false}>
          <MenuRow
            icon={<Icons.Profile size={18} color={theme.colors.primary[500]} />}
            label="Profile"
            subtitle="View and edit your profile"
            onPress={() => push('/(protected)/profile')}
          />
        </SurfaceCard>

        {/* Logout */}
        <SurfaceCard style={styles.logoutCard} padded={false}>
          <MenuRow
            icon={<Icons.LogOut size={18} color={theme.colors.danger} />}
            label="Sign Out"
            onPress={handleLogout}
            destructive
          />
        </SurfaceCard>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.m,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.l,
    gap: theme.spacing.m,
  },
  userInfo: { flex: 1 },
  userName: {
    ...theme.typography.h3,
    color: theme.colors.text[900],
  },
  userEmail: {
    ...theme.typography.caption,
    color: theme.colors.text[500],
    marginTop: 2,
  },
  rolePill: {
    paddingHorizontal: theme.spacing.s,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.primary[50],
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
  },
  rolePillText: {
    ...theme.typography.caption,
    color: theme.colors.primary[600],
    fontWeight: '600',
  },
  sectionLabel: {
    ...theme.typography.overline,
    color: theme.colors.text[500],
    marginBottom: theme.spacing.s,
    marginTop: theme.spacing.m,
    paddingHorizontal: theme.spacing.xs,
  },
  card: {
    overflow: 'hidden',
    padding: 0,
  },
  logoutCard: {
    overflow: 'hidden',
    padding: 0,
    marginTop: theme.spacing.m,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: theme.spacing.m,
  },
  menuRowIcon: {
    width: 38,
    height: 38,
    borderRadius: theme.radius.m,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  menuRowIconDestructive: {
    backgroundColor: theme.colors.dangerLight,
  },
  menuRowText: { flex: 1 },
  menuRowLabel: {
    ...theme.typography.body,
    fontWeight: '500',
    color: theme.colors.text[900],
  },
  menuRowLabelDestructive: {
    color: theme.colors.danger,
  },
  menuRowSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.text[500],
    marginTop: 1,
  },
});
