import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { theme } from '../design-system/theme';
import { Icons } from '../design-system/icons';
import { usePermissions } from '@/modules/permissions/hooks/usePermissions';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import * as PERMS from '@/modules/permissions/constants/permissions';

// Existing screens from modules and app routes
import HomeScreen from '@/app/(protected)/home';
import StudentsScreen from '@/modules/students/screens/StudentsScreen';
import TeachersScreen from '@/modules/teachers/screens/TeachersScreen';
import ClassesScreen from '@/modules/classes/screens/ClassesScreen';

// "More" menu screen for additional navigation options
import { MoreMenuScreen } from '@/src/features/menu/MoreMenuScreen';

const Tab = createBottomTabNavigator();

interface TabIconProps {
  focused: boolean;
  icon: React.ReactNode;
  label: string;
}

const TabIcon: React.FC<TabIconProps> = ({ focused, icon, label }) => (
  <View style={[tabStyles.iconWrap, focused && tabStyles.iconWrapActive]}>
    {icon}
  </View>
);

export const MainTabNavigator = () => {
  const { hasAnyPermission, hasPermission } = usePermissions();
  const { isFeatureEnabled } = useAuth();

  const canSeeStudents = hasAnyPermission([
    PERMS.STUDENT_READ_ALL,
    PERMS.STUDENT_READ_CLASS,
    PERMS.STUDENT_MANAGE,
    PERMS.STUDENT_READ_SELF,
  ]) && isFeatureEnabled('student_management');

  const canSeeTeachers = hasAnyPermission([
    PERMS.TEACHER_READ,
    PERMS.TEACHER_MANAGE,
  ]) && isFeatureEnabled('teacher_management');

  const canSeeClasses = hasAnyPermission([
    PERMS.CLASS_READ,
    PERMS.CLASS_MANAGE,
  ]) && isFeatureEnabled('class_management');

  const tabBarStyle = {
    backgroundColor: theme.colors.surface,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 82 : 64,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
    ...theme.shadows.sm,
  };

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary[500],
        tabBarInactiveTintColor: theme.colors.text[400],
        tabBarStyle,
        tabBarLabelStyle: {
          ...theme.typography.caption,
          fontSize: 11,
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Icons.Home size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
          ),
        }}
      />

      {canSeeStudents && (
        <Tab.Screen
          name="Students"
          component={StudentsScreen}
          options={{
            tabBarIcon: ({ color, focused }) => (
              <Icons.Student size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
            ),
          }}
        />
      )}

      {canSeeTeachers && (
        <Tab.Screen
          name="Teachers"
          component={TeachersScreen}
          options={{
            tabBarIcon: ({ color, focused }) => (
              <Icons.Users size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
            ),
          }}
        />
      )}

      {canSeeClasses && (
        <Tab.Screen
          name="Classes"
          component={ClassesScreen}
          options={{
            tabBarIcon: ({ color, focused }) => (
              <Icons.Class size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
            ),
          }}
        />
      )}

      <Tab.Screen
        name="More"
        component={MoreMenuScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Icons.Menu size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const tabStyles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {},
});
