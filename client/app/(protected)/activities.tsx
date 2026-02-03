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
import { Protected } from "@/modules/permissions/components/Protected";
import { usePermissions } from "@/modules/permissions/hooks/usePermissions";
import * as PERMS from "@/modules/permissions/constants/permissions";

export default function ActivitiesScreen() {
  const { hasAnyPermission } = usePermissions();

  const isAdmin = hasAnyPermission([PERMS.SYSTEM_MANAGE, PERMS.USER_MANAGE]);
  const isTeacher = hasAnyPermission([
    PERMS.ATTENDANCE_MARK,
    PERMS.GRADE_CREATE,
  ]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Activities</Text>
        <Text style={styles.subtitle}>
          {isAdmin && "Manage school activities and events"}
          {isTeacher && "Class activities and announcements"}
          {!isAdmin && !isTeacher && "Events and announcements"}
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Events & Calendar</Text>

          <TouchableOpacity style={styles.actionCard}>
            <View style={styles.cardContent}>
              <View style={styles.cardIcon}>
                <Ionicons
                  name="calendar-outline"
                  size={24}
                  color={Colors.primary}
                />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>School Calendar</Text>
                <Text style={styles.cardSubtitle}>View upcoming events</Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>

          <Protected anyPermissions={[PERMS.SYSTEM_MANAGE, PERMS.USER_MANAGE]}>
            <TouchableOpacity style={styles.actionCard}>
              <View style={styles.cardContent}>
                <View style={styles.cardIcon}>
                  <Ionicons
                    name="add-circle-outline"
                    size={24}
                    color={Colors.primary}
                  />
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>Create Event</Text>
                  <Text style={styles.cardSubtitle}>Add school-wide event</Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>
          </Protected>
        </View>

        {/* Announcements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Announcements</Text>

          <Protected
            anyPermissions={[
              PERMS.ATTENDANCE_MARK,
              PERMS.GRADE_CREATE,
              PERMS.SYSTEM_MANAGE,
            ]}
          >
            <TouchableOpacity style={[styles.actionCard, styles.primaryCard]}>
              <View style={styles.cardContent}>
                <View style={[styles.cardIcon, styles.primaryIcon]}>
                  <Ionicons
                    name="megaphone-outline"
                    size={24}
                    color={Colors.background}
                  />
                </View>
                <View style={styles.cardText}>
                  <Text style={[styles.cardTitle, styles.primaryText]}>
                    Post Announcement
                  </Text>
                  <Text style={[styles.cardSubtitle, styles.primarySubtext]}>
                    {isAdmin
                      ? "School-wide announcement"
                      : "Class announcement"}
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={Colors.background}
              />
            </TouchableOpacity>
          </Protected>

          <TouchableOpacity style={styles.actionCard}>
            <View style={styles.cardContent}>
              <View style={styles.cardIcon}>
                <Ionicons
                  name="notifications-outline"
                  size={24}
                  color={Colors.primary}
                />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>View Announcements</Text>
                <Text style={styles.cardSubtitle}>Recent updates and news</Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Extracurricular Activities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Extracurricular</Text>

          <TouchableOpacity style={styles.actionCard}>
            <View style={styles.cardContent}>
              <View style={styles.cardIcon}>
                <Ionicons
                  name="trophy-outline"
                  size={24}
                  color={Colors.primary}
                />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Sports</Text>
                <Text style={styles.cardSubtitle}>Sports events and teams</Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <View style={styles.cardContent}>
              <View style={styles.cardIcon}>
                <Ionicons
                  name="musical-notes-outline"
                  size={24}
                  color={Colors.primary}
                />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Clubs & Societies</Text>
                <Text style={styles.cardSubtitle}>Join and participate</Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Notifications Center */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>

          <TouchableOpacity style={styles.actionCard}>
            <View style={styles.cardContent}>
              <View style={styles.cardIcon}>
                <Ionicons
                  name="notifications-outline"
                  size={24}
                  color={Colors.primary}
                />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>All Notifications</Text>
                <Text style={styles.cardSubtitle}>View all updates</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>5</Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: Spacing.lg,
  },
  header: {
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: Spacing.xs,
    fontFamily: "System",
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontFamily: "System",
  },
  content: {
    gap: Spacing.lg,
  },
  section: {
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: Spacing.md,
    fontFamily: "System",
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  primaryCard: {
    backgroundColor: Colors.primary,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  primaryIcon: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 2,
    fontFamily: "System",
  },
  primaryText: {
    color: Colors.background,
  },
  cardSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "System",
  },
  primarySubtext: {
    color: "rgba(255, 255, 255, 0.8)",
  },
  badge: {
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.background,
    fontFamily: "System",
  },
});
