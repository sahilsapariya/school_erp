import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import SafeScreenWrapper from '@/common/components/SafeScreenWrapper';
import AuthButton from '@/common/components/AuthButton';
import { useAuthContext } from '@/common/context/AuthContext';
import { Colors } from '@/common/constants/colors';
import { Ionicons } from '@expo/vector-icons';

const registerImage = require('@/assets/images/auth/register.jpg');

type VerificationStatus = 'processing' | 'success' | 'error';

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams();
  
  // URL params from backend redirect
  const status = (params.status as string) || '';
  const accessToken = (params.access_token as string) || '';
  const refreshToken = (params.refresh_token as string) || '';
  const userId = (params.user_id as string) || '';
  const email = (params.email as string) || '';
  const errorMessage = (params.error as string) || '';

  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('processing');
  const [error, setError] = useState<string | null>(null);
  const { setAuthData } = useAuthContext();

  useEffect(() => {
    const processVerification = async () => {
      if (status === 'error') {
        setError(decodeURIComponent(errorMessage));
        setVerificationStatus('error');
        return;
      }

      if (status === 'success' && accessToken && refreshToken) {
        try {
          // Set auth data to log the user in
          await setAuthData({
            access_token: accessToken,
            refresh_token: refreshToken,
            user: { id: parseInt(userId) || 0, email },
          });
          setVerificationStatus('success');
        } catch {
          setError('Failed to complete login');
          setVerificationStatus('error');
        }
        return;
      }

      // No valid params - show error
      setError('Invalid verification link');
      setVerificationStatus('error');
    };

    processVerification();
  }, [status, accessToken, refreshToken, userId, email, errorMessage]);

  if (verificationStatus === 'processing') {
    return (
      <SafeScreenWrapper backgroundColor={Colors.background}>
        <View style={styles.centerContainer}>
          <Image
            source={registerImage}
            style={styles.illustration}
            resizeMode="contain"
          />
          <ActivityIndicator size="large" color={Colors.primary} style={styles.spinner} />
          <Text style={styles.title}>Completing Verification</Text>
          <Text style={styles.message}>
            Please wait while we complete your email verification...
          </Text>
        </View>
      </SafeScreenWrapper>
    );
  }

  if (verificationStatus === 'success') {
    return (
      <SafeScreenWrapper backgroundColor={Colors.background}>
        <View style={styles.centerContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="checkmark-circle" size={80} color={Colors.success} />
          </View>
          <Text style={styles.title}>Email Verified!</Text>
          <Text style={styles.message}>
            Your email has been successfully verified. You're now logged in and ready to go!
          </Text>
          <AuthButton
            title="Continue to Home"
            onPress={() => router.replace('/(protected)/home')}
            style={styles.button}
          />
        </View>
      </SafeScreenWrapper>
    );
  }

  // Error state
  return (
    <SafeScreenWrapper backgroundColor={Colors.background}>
      <View style={styles.centerContainer}>
        <View style={styles.iconContainer}>
          <Ionicons name="close-circle" size={80} color={Colors.error} />
        </View>
        <Text style={styles.title}>Verification Failed</Text>
        <Text style={styles.message}>
          {error || 'The verification link is invalid or has expired. Please try registering again or request a new verification email.'}
        </Text>
        <AuthButton
          title="Go to Login"
          onPress={() => router.replace('/(auth)/login')}
          style={styles.button}
        />
        <AuthButton
          title="Register Again"
          onPress={() => router.replace('/(auth)/register')}
          style={styles.secondaryButton}
          variant="outline"
        />
      </View>
    </SafeScreenWrapper>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  illustration: {
    width: 180,
    height: 180,
    marginBottom: 24,
  },
  spinner: {
    marginBottom: 24,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  button: {
    width: '100%',
  },
  secondaryButton: {
    width: '100%',
    marginTop: 12,
  },
});
