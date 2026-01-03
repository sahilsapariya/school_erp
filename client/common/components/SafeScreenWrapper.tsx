import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/common/constants/colors';

interface SafeScreenWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
  backgroundColor?: string;
}

export default function SafeScreenWrapper({
  children, 
  style,
  backgroundColor = Colors.background,
}: SafeScreenWrapperProps) {
  return (
    <>
      <StatusBar style="dark" />
      <SafeAreaView style={[styles.container, { backgroundColor }, style]} edges={['top', 'bottom']}>
        {children}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
