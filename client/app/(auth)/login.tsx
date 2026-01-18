import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Link, router } from 'expo-router';
import SafeScreenWrapper from '@/common/components/SafeScreenWrapper';
import AuthInput from '@/common/components/AuthInput';
import AuthButton from '@/common/components/AuthButton';
import { useLogin } from '@/common/hooks/useLogin';
import { Colors } from '@/common/constants/colors';

const loginIcon = require('@/assets/images/auth/login.jpg');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const { login, loading, error } = useLogin();

  const handleLogin = async () => {
    setEmailError('');
    setPasswordError('');

    try {
      await login(email, password);
      router.replace('/(protected)/home');
    } catch (err: any) {
      const message = err?.message || '';
      if (message.includes('email')) {
        setEmailError(message);
      } else if (message.includes('password')) {
        setPasswordError(message);
      }
    }
  };

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
              source={loginIcon}
                style={styles.illustration}
                resizeMode="contain"
              />
            </View>

            <View style={styles.header}>
              <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue to your account</Text>
            </View>

            <View style={styles.form}>
              <AuthInput
                label="Email"
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                icon="mail-outline"
                error={emailError}
              />

              <AuthInput
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                showPasswordToggle
                autoCapitalize="none"
                autoComplete="password"
                icon="lock-closed-outline"
                error={passwordError}
              />

              <View style={styles.forgotPasswordContainer}>
                <Link href="/(auth)/forgot-password" asChild>
                  <TouchableOpacity>
                    <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                  </TouchableOpacity>
                </Link>
              </View>

              {error && <Text style={styles.errorText}>{error}</Text>}

              <AuthButton
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
    alignItems: 'center',
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
    fontWeight: '700',
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
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  loginButton: {
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    marginBottom: 16,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  linkText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
});
