import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import SafeScreenWrapper from '@/common/components/SafeScreenWrapper';
import AuthButton from '@/common/components/AuthButton';
import { useAuth } from '@/common/hooks/useAuth';
import { Colors } from '@/common/constants/colors';
import { Ionicons } from '@expo/vector-icons';

export default function ProtectedHomeScreen() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <SafeScreenWrapper backgroundColor={Colors.background}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark" size={64} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Welcome!</Text>
          <Text style={styles.subtitle}>
            You're successfully authenticated
          </Text>
        </View>

        <View style={styles.content}>
          <View style={styles.userInfo}>
            <Ionicons name="person-circle-outline" size={24} color={Colors.textSecondary} />
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
            <Text style={styles.infoText}>
              This is a protected route. Only authenticated users can access this page.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <AuthButton
            title="Sign Out"
            onPress={handleLogout}
            variant="outline"
            style={styles.logoutButton}
          />
        </View>
      </View>
    </SafeScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    marginBottom: 24,
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
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  userEmail: {
    fontSize: 16,
    color: Colors.text,
    marginLeft: 12,
    fontFamily: 'System',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundSecondary,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
    fontFamily: 'System',
  },
  footer: {
    marginTop: 24,
  },
  logoutButton: {
    width: '100%',
  },
});

