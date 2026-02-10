import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/common/constants/colors";
import { Spacing, Layout } from "@/common/constants/spacing";
import { Teacher } from "../types";

interface Props {
  teacher: Teacher;
  onPress: (teacher: Teacher) => void;
}

export const TeacherListItem: React.FC<Props> = ({ teacher, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(teacher)}
      activeOpacity={0.7}
    >
      <View style={styles.avatar}>
        <Ionicons name="person" size={24} color={Colors.textSecondary} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{teacher.name}</Text>
        <Text style={styles.detail}>{teacher.employee_id}</Text>
        {teacher.department && (
          <Text style={styles.detail}>{teacher.department}</Text>
        )}
      </View>
      <View style={styles.right}>
        <View
          style={[
            styles.statusBadge,
            teacher.status === "active" ? styles.activeBadge : styles.inactiveBadge,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              teacher.status === "active" ? styles.activeText : styles.inactiveText,
            ]}
          >
            {teacher.status}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  detail: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Layout.borderRadius.sm,
  },
  activeBadge: {
    backgroundColor: "#E8F5E9",
  },
  inactiveBadge: {
    backgroundColor: "#FFF3E0",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  activeText: {
    color: Colors.success,
  },
  inactiveText: {
    color: Colors.warning,
  },
});
