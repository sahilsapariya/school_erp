import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity, Image } from "react-native";
import { router, usePathname, Slot } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import SafeScreenWrapper from "@/common/components/SafeScreenWrapper";
import Sidebar from "@/common/components/Sidebar";
import { Colors } from "@/common/constants/colors";
import { Spacing, Layout } from "@/common/constants/spacing";
import { useAuth } from "@/modules/auth/hooks/useAuth";

export default function MainLayout() {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();

  const handleProfilePress = () => {
    setSidebarVisible(false);
    // Check if already on profile page
    if (pathname?.includes("profile")) {
      return;
    }
    router.push("/(protected)/profile");
  };

  return (
    <SafeScreenWrapper backgroundColor={Colors.background}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setSidebarVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="menu" size={28} color={Colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.profileButton}
            onPress={handleProfilePress}
            activeOpacity={0.7}
          >
            {user?.profile_picture_url ? (
              <Image
                source={{ uri: user.profile_picture_url }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profilePlaceholder}>
                <Ionicons name="person" size={20} color={Colors.text} />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Main Content */}
        <View
          style={styles.content}
          pointerEvents={sidebarVisible ? "none" : "auto"}
        >
          <Slot />
        </View>

        {/* Sidebar */}
        <Sidebar
          visible={sidebarVisible}
          onClose={() => setSidebarVisible(false)}
          currentRoute={pathname}
        />
      </View>
    </SafeScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: Layout.headerHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  menuButton: {
    padding: Spacing.sm,
  },
  profileButton: {
    padding: Spacing.xs,
  },
  profileImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  profilePlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
