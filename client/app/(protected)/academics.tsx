import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/common/constants/colors';

export default function AcademicsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Academics</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text,
    fontFamily: 'System',
  },
});
