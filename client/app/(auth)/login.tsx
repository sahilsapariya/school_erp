import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Link, router } from "expo-router";
import { useLogin } from "@/modules/auth/hooks/useLogin";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { ScreenContainer } from "@/src/components/ui/ScreenContainer";
import { FormInput } from "@/src/components/ui/FormInput";
import { PrimaryButton } from "@/src/components/ui/PrimaryButton";
import { useToast } from "@/src/components/ui/Toast";
import { theme } from "@/src/design-system/theme";
import { Icons } from "@/src/design-system/icons";

const loginIcon = require("@/assets/images/auth/login.jpg");

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [choosingTenant, setChoosingTenant] = useState(false);

  const { login, loading, error } = useLogin();
  const { isAuthenticated, pendingTenantChoice, loginWithTenant, clearPendingTenantChoice } = useAuth();
  const toast = useToast();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/(protected)/dashboard");
    }
  }, [isAuthenticated]);

  const handleLogin = async () => {
    setEmailError("");
    setPasswordError("");

    if (!email.trim()) {
      setEmailError("Email is required");
      return;
    }
    if (!password) {
      setPasswordError("Password is required");
      return;
    }

    try {
      await login(email, password);
    } catch (err: any) {
      const message = err?.message || "";
      if (message.toLowerCase().includes("email")) {
        setEmailError(message);
      } else if (message.toLowerCase().includes("password")) {
        setPasswordError(message);
      } else {
        toast.error("Sign in failed", message || "Please check your credentials and try again.");
      }
    }
  };

  const handleChooseSchool = async (tenantId: string) => {
    setChoosingTenant(true);
    try {
      await loginWithTenant(tenantId);
      router.replace("/(protected)/dashboard");
    } catch (err: any) {
      toast.error("Error", err?.message || "Failed to select school.");
    } finally {
      setChoosingTenant(false);
    }
  };

  if (pendingTenantChoice?.tenants?.length) {
    return (
      <ScreenContainer keyboardAvoiding edges={["top", "bottom"]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.schoolPickerHeader}>
              <View style={styles.schoolIconBg}>
                <Icons.Building size={28} color={theme.colors.primary[500]} />
              </View>
              <Text style={styles.title}>Select School</Text>
              <Text style={styles.subtitle}>
                Your account is linked to more than one school. Choose one to continue.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.backLink}
              onPress={clearPendingTenantChoice}
              disabled={choosingTenant}
            >
              <Icons.ArrowLeft size={16} color={theme.colors.primary[500]} />
              <Text style={styles.backLinkText}>Back to sign in</Text>
            </TouchableOpacity>

            {choosingTenant ? (
              <View style={styles.tenantLoader}>
                <ActivityIndicator size="large" color={theme.colors.primary[500]} />
              </View>
            ) : (
              <View style={styles.tenantList}>
                {pendingTenantChoice.tenants.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={styles.tenantItem}
                    onPress={() => handleChooseSchool(t.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.tenantItemLeft}>
                      <View style={styles.tenantAvatar}>
                        <Text style={styles.tenantAvatarText}>
                          {t.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.tenantName}>{t.name}</Text>
                        {t.subdomain ? (
                          <Text style={styles.tenantSubdomain}>{t.subdomain}</Text>
                        ) : null}
                      </View>
                    </View>
                    <Icons.ChevronRight size={18} color={theme.colors.text[400]} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer keyboardAvoiding edges={["top", "bottom"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.illustrationContainer}>
            <Image
              source={loginIcon}
              style={styles.illustration}
              resizeMode="contain"
            />
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>
              Sign in to continue to your school account
            </Text>
          </View>

          <View style={styles.form}>
            <FormInput
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChangeText={(t) => { setEmail(t); setEmailError(""); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={emailError}
              leftIcon={<Icons.Mail size={18} color={theme.colors.text[400]} />}
            />

            <FormInput
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={(t) => { setPassword(t); setPasswordError(""); }}
              secureTextEntry
              showPasswordToggle
              autoCapitalize="none"
              autoComplete="password"
              error={passwordError}
              leftIcon={<Icons.Lock size={18} color={theme.colors.text[400]} />}
            />

            <View style={styles.forgotPasswordContainer}>
              <Link href="/(auth)/forgot-password" asChild>
                <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              </Link>
            </View>

            {error && !emailError && !passwordError && (
              <View style={styles.errorBanner}>
                <Icons.AlertCircle size={16} color={theme.colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <PrimaryButton
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
              style={styles.loginButton}
            />

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don&apos;t have an account? </Text>
              <Link href="/(auth)/register" asChild>
                <TouchableOpacity>
                  <Text style={styles.linkText}>Sign Up</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  content: {
    paddingHorizontal: theme.spacing.l,
    paddingTop: theme.spacing.l,
  },
  illustrationContainer: {
    alignItems: "center",
    marginBottom: theme.spacing.l,
  },
  illustration: {
    width: theme.wp(55),
    height: theme.wp(55),
    maxWidth: 240,
    maxHeight: 240,
  },
  header: {
    marginBottom: theme.spacing.l,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text[900],
    marginBottom: theme.spacing.s,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.text[500],
    lineHeight: 22,
  },
  form: {},
  forgotPasswordContainer: {
    alignItems: "flex-end",
    marginBottom: theme.spacing.m,
    marginTop: -theme.spacing.s,
  },
  forgotPasswordText: {
    ...theme.typography.label,
    color: theme.colors.primary[500],
    fontWeight: "600",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.s,
    backgroundColor: theme.colors.dangerLight,
    borderRadius: theme.radius.l,
    padding: theme.spacing.m,
    marginBottom: theme.spacing.m,
  },
  errorText: {
    flex: 1,
    ...theme.typography.bodySmall,
    color: theme.colors.danger,
  },
  loginButton: {
    marginTop: theme.spacing.xs,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: theme.spacing.l,
  },
  footerText: {
    ...theme.typography.body,
    color: theme.colors.text[500],
  },
  linkText: {
    ...theme.typography.body,
    color: theme.colors.primary[500],
    fontWeight: "600",
  },
  schoolPickerHeader: {
    alignItems: "center",
    marginBottom: theme.spacing.l,
    paddingTop: theme.spacing.xl,
  },
  schoolIconBg: {
    width: 72,
    height: 72,
    borderRadius: theme.radius.xxl,
    backgroundColor: theme.colors.primary[50],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.m,
  },
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.l,
  },
  backLinkText: {
    ...theme.typography.label,
    color: theme.colors.primary[500],
    fontWeight: "600",
  },
  tenantList: { gap: theme.spacing.s },
  tenantItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.m,
    paddingHorizontal: theme.spacing.m,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  tenantItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.m,
  },
  tenantAvatar: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.primary[100],
    alignItems: "center",
    justifyContent: "center",
  },
  tenantAvatarText: {
    ...theme.typography.h3,
    color: theme.colors.primary[600],
  },
  tenantName: {
    ...theme.typography.label,
    fontWeight: "600",
    color: theme.colors.text[900],
  },
  tenantSubdomain: {
    ...theme.typography.caption,
    color: theme.colors.text[500],
    marginTop: 2,
  },
  tenantLoader: { marginTop: theme.spacing.xl, alignItems: "center" },
});
