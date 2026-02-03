import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/common/constants/colors";
import { Spacing, Layout } from "@/common/constants/spacing";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { getVisibleTabs, getUserRole } from "@/common/constants/navigation";

const { width } = Dimensions.get("window");
const SIDEBAR_WIDTH = width * 0.75;

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
  currentRoute?: string;
}

interface MenuItem {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
}

export default function Sidebar({
  visible,
  onClose,
  currentRoute,
}: SidebarProps) {
  const { logout, permissions, user } = useAuth();

  // Get visible tabs based on user permissions
  const visibleTabs = useMemo(() => getVisibleTabs(permissions), [permissions]);

  // Get user role for display
  const userRole = useMemo(() => getUserRole(permissions), [permissions]);

  // Convert tabs to menu items
  const menuItems: MenuItem[] = useMemo(() => {
    return visibleTabs.map((tab) => ({
      id: tab.name,
      label: tab.title,
      icon: tab.iconOutline,
      route: `/(protected)/${tab.name}`,
    }));
  }, [visibleTabs]);
  const slideAnim = React.useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      // Show sidebar and backdrop
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Hide sidebar and backdrop
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -SIDEBAR_WIDTH,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleMenuItemPress = (route: string) => {
    // Check if we're already on this route
    if (isRouteActive(route)) {
      // Already on this route, just close the sidebar
      onClose();
      return;
    }
    router.replace(route as any);
    onClose();
  };

  const handleSignOut = async () => {
    try {
      await logout();
      router.replace("/(auth)/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Helper to check if route is active
  const isRouteActive = (route: string): boolean => {
    if (!currentRoute) return false;
    // Extract the screen name from route (e.g., '/(protected)/home' -> 'home')
    const screenName = route.split("/").pop();
    // Check if currentRoute includes the screen name
    return currentRoute.includes(screenName || "");
  };

  return (
    <>
      {/* Backdrop - Animated opacity */}
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: opacityAnim,
            pointerEvents: visible ? "auto" : "none",
          },
        ]}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>

      {/* Sidebar - Animated slide */}
      <Animated.View
        style={[
          styles.sidebar,
          {
            transform: [{ translateX: slideAnim }],
          },
        ]}
        pointerEvents={visible ? "auto" : "none"}
      >
        <ScrollView
          style={styles.sidebarContent}
          contentContainerStyle={styles.sidebarContentContainer}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* User Info Header */}
          <View style={styles.userHeader}>
            <View style={styles.userAvatar}>
              <Ionicons name="person" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.email}
            </Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{userRole}</Text>
            </View>
          </View>

          {/* Menu Items */}
          <View style={styles.menuItems}>
            {menuItems.map((item) => {
              const isActive = isRouteActive(item.route);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.menuItem, isActive && styles.menuItemActive]}
                  onPress={() => handleMenuItemPress(item.route)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={item.icon}
                    size={24}
                    color={isActive ? Colors.primary : Colors.text}
                  />
                  <Text
                    style={[
                      styles.menuItemText,
                      isActive && styles.menuItemTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Sign Out Button */}
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={24} color={Colors.error} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay,
    zIndex: 998,
  },
  sidebar: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: Colors.background,
    zIndex: 999,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  sidebarContent: {
    flex: 1,
  },
  sidebarContentContainer: {
    paddingTop: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  userHeader: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    marginBottom: Spacing.md,
  },
  userAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: Spacing.sm,
    fontFamily: "System",
  },
  roleBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Layout.borderRadius.md,
  },
  roleText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.background,
    fontFamily: "System",
  },
  menuItems: {
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Layout.borderRadius.md,
  },
  menuItemActive: {
    backgroundColor: Colors.backgroundSecondary,
  },
  menuItemText: {
    fontSize: 18,
    fontWeight: "500",
    color: Colors.text,
    marginLeft: Spacing.md,
    fontFamily: "System",
  },
  menuItemTextActive: {
    color: Colors.primary,
    fontWeight: "600",
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Layout.borderRadius.md,
    marginTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.lg,
  },
  signOutText: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.error,
    marginLeft: Spacing.md,
    fontFamily: "System",
  },
});
