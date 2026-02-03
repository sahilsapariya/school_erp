import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import SafeScreenWrapper from "@/common/components/SafeScreenWrapper";
import AuthInput from "@/common/components/AuthInput";
import AuthButton from "@/common/components/AuthButton";
import { useResetPassword } from "@/modules/auth/hooks/useResetPassword";
import { Colors } from "@/common/constants/colors";
import { Ionicons } from "@expo/vector-icons";

const resetPasswordIcon = require("@/assets/images/auth/reset-password.jpg");

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams();
  const token = (params.token as string) || "";
  const email = (params.email as string) || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [success, setSuccess] = useState(false);

  const { resetPassword, loading, error } = useResetPassword();

  useEffect(() => {
    if (!token || !email) {
      router.replace("/(auth)/forgot-password");
    }
  }, [token, email]);

  const handleResetPassword = async () => {
    setPasswordError("");
    setConfirmPasswordError("");

    try {
      await resetPassword(email, token, newPassword, confirmPassword);
      setSuccess(true);
    } catch (err: any) {
      const message = err?.message || "";
      if (message.includes("match")) {
        setConfirmPasswordError(message);
      } else if (message.includes("password")) {
        setPasswordError(message);
      }
    }
  };

  if (success) {
    return (
      <SafeScreenWrapper backgroundColor={Colors.background}>
        <View style={styles.successContainer}>
          <View style={styles.successIconContainer}>
            <Ionicons
              name="checkmark-circle"
              size={80}
              color={Colors.success}
            />
          </View>
          <Text style={styles.successTitle}>Password Reset!</Text>
          <Text style={styles.successMessage}>
            Your password has been successfully reset. You can now sign in with
            your new password.
          </Text>
          <AuthButton
            title="Go to Sign In"
            onPress={() => router.replace("/(auth)/login")}
            style={styles.backButton}
          />
        </View>
      </SafeScreenWrapper>
    );
  }

  return (
    <SafeScreenWrapper backgroundColor={Colors.background}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.illustrationContainer}>
            <Image
              source={resetPasswordIcon}
              style={styles.illustration}
              resizeMode="contain"
            />
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>Enter your new password below</Text>
          </View>

          <View style={styles.form}>
            <AuthInput
              label="New Password"
              placeholder="Enter new password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              showPasswordToggle
              autoCapitalize="none"
              autoComplete="password-new"
              icon="lock-closed-outline"
              error={passwordError}
            />

            <AuthInput
              label="Confirm Password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              showPasswordToggle
              autoCapitalize="none"
              autoComplete="password-new"
              icon="lock-closed-outline"
              error={confirmPasswordError}
            />

            {error && <Text style={styles.errorText}>{error}</Text>}

            <AuthButton
              title="Reset Password"
              onPress={handleResetPassword}
              loading={loading}
              style={styles.resetButton}
            />

            <View style={styles.footer}>
              <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
                <Text style={styles.linkText}>Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
  },
  illustrationContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  illustration: {
    width: 200,
    height: 200,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  form: {
    flex: 1,
  },
  resetButton: {
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    marginBottom: 16,
    textAlign: "center",
  },
  footer: {
    alignItems: "center",
    marginTop: 24,
  },
  linkText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: "600",
  },
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  successIconContainer: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 16,
    textAlign: "center",
  },
  successMessage: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  backButton: {
    width: "100%",
  },
});
