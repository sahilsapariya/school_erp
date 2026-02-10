import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAttendance } from "../hooks/useAttendance";
import { Colors } from "@/common/constants/colors";
import { Spacing, Layout } from "@/common/constants/spacing";
import { MyClassItem } from "../types";

export default function MyClassesScreen() {
  const router = useRouter();
  const { myClasses, loading, fetchMyClasses } = useAttendance();

  useEffect(() => {
    fetchMyClasses();
  }, []);

  const handleClassPress = (cls: MyClassItem) => {
    router.push({
      pathname: "/(protected)/attendance/mark" as any,
      params: { classId: cls.id, className: `${cls.name}-${cls.section}` },
    });
  };

  const renderClassItem = ({ item }: { item: MyClassItem }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleClassPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardIcon}>
        <Ionicons name="school" size={28} color={Colors.primary} />
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>
          {item.name} - {item.section}
        </Text>
        <Text style={styles.cardDetail}>{item.academic_year}</Text>
        <View style={styles.cardStats}>
          <Ionicons name="people-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.cardStatText}>{item.student_count} students</Text>
        </View>
      </View>
      <View style={styles.markButton}>
        <Text style={styles.markButtonText}>Mark</Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Classes</Text>
      </View>

      {loading && myClasses.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={myClasses}
          keyExtractor={(item) => item.id}
          renderItem={renderClassItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={fetchMyClasses} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="school-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No classes assigned to you yet.</Text>
              <Text style={styles.emptySubtext}>
                Contact the admin to get assigned to classes.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: Spacing.xl },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backIcon: { padding: Spacing.sm },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: "bold", color: Colors.text, marginLeft: Spacing.md },
  listContent: { padding: Spacing.md },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    backgroundColor: Colors.background,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.md,
  },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: "600", color: Colors.text },
  cardDetail: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  cardStats: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: Spacing.xs },
  cardStatText: { fontSize: 13, color: Colors.textSecondary },
  markButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.md,
    gap: 4,
  },
  markButtonText: { fontSize: 14, fontWeight: "600", color: Colors.primary },
  emptyText: { fontSize: 16, color: Colors.textSecondary, marginTop: Spacing.md, textAlign: "center" },
  emptySubtext: { fontSize: 14, color: Colors.textTertiary, marginTop: Spacing.xs, textAlign: "center" },
});
