# Screen Layout Guide

## Overview

This guide ensures all screens follow consistent layout patterns for proper scrolling, spacing, and overlay behavior.

---

## Core Principles

### 1. **One Scroll Container Per Screen**
- Each screen component manages its own ScrollView
- MainLayout is NOT scrollable
- Never nest ScrollViews

### 2. **Parent Controls Spacing**
- Use `gap` on parent containers
- Children have NO margins
- Consistent spacing using `Spacing` constants

### 3. **Proper Layer Separation**
- Layer 999: Sidebar
- Layer 998: Backdrop
- Layer 1: Content
- Overlays block content interaction via `pointerEvents`

---

## Standard Screen Template

```typescript
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors } from '@/common/constants/colors';
import { Spacing, Layout } from '@/common/constants/spacing';

export default function MyScreen() {
  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.title}>Screen Title</Text>
        <Text style={styles.subtitle}>Description</Text>
      </View>

      {/* Content Section - Uses gap for spacing */}
      <View style={styles.content}>
        {/* Card 1 */}
        <View style={styles.card}>
          <Text>Card content</Text>
        </View>

        {/* Card 2 */}
        <View style={styles.card}>
          <Text>Card content</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  content: {
    gap: Spacing.md, // ← Controls spacing between all children
  },
  card: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.md,
    // NO marginBottom - parent gap handles it
  },
});
```

---

## Common Patterns

### **List Screen (e.g., Student List)**

```typescript
export default function ListScreen() {
  return (
    <View style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.fixedHeader}>
        <SearchBar />
        <FilterButtons />
      </View>

      {/* Scrollable List */}
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.listContainer}
      >
        <View style={styles.list}>
          {items.map(item => (
            <ItemCard key={item.id} item={item} />
          ))}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab}>
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  fixedHeader: {
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  scrollContainer: {
    flex: 1,
  },
  listContainer: {
    padding: Spacing.md,
  },
  list: {
    gap: Spacing.md, // ← Spacing between list items
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
```

---

### **Form Screen (e.g., Create Student)**

```typescript
export default function FormScreen() {
  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      {/* Form Sections */}
      <View style={styles.sections}>
        {/* Section 1 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.fields}>
            <TextInput style={styles.input} placeholder="First Name" />
            <TextInput style={styles.input} placeholder="Last Name" />
          </View>
        </View>

        {/* Section 2 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.fields}>
            <TextInput style={styles.input} placeholder="Email" />
            <TextInput style={styles.input} placeholder="Phone" />
          </View>
        </View>
      </View>

      {/* Submit Button */}
      <TouchableOpacity style={styles.submitButton}>
        <Text style={styles.submitText}>Save</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: Spacing.lg,
  },
  sections: {
    gap: Spacing.lg, // ← Spacing between sections
  },
  section: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  fields: {
    gap: Spacing.md, // ← Spacing between form fields
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.text,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
});
```

---

### **Card Grid Pattern (2 columns)**

```typescript
// For Quick Actions, Category Grid, etc.
<View style={styles.grid}>
  {items.map(item => (
    <TouchableOpacity key={item.id} style={styles.gridItem}>
      <Ionicons name={item.icon} size={24} color={Colors.primary} />
      <Text style={styles.gridText}>{item.label}</Text>
    </TouchableOpacity>
  ))}
</View>

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md, // ← Single gap value controls all spacing
  },
  gridItem: {
    width: '47%', // ← (100% - gap) / 2 columns
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  gridText: {
    marginTop: Spacing.sm,
    fontSize: 12,
    color: Colors.text,
    textAlign: 'center',
  },
});
```

**For 3 columns:** `width: '31%'`  
**For 4 columns:** `width: '22.5%'`

---

## Modal/Overlay Pattern

```typescript
export default function CustomModal({ visible, onClose }) {
  const opacityAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  return (
    <>
      {/* Backdrop */}
      <Animated.View
        style={[
          styles.backdrop,
          { opacity: opacityAnim },
        ]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>

      {/* Modal Content */}
      <Animated.View
        style={[
          styles.modal,
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <View style={styles.modalContent}>
          {/* Modal content here */}
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay,
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1001,
  },
  modalContent: {
    width: '85%',
    backgroundColor: Colors.background,
    borderRadius: Layout.borderRadius.xl,
    padding: Spacing.lg,
    maxHeight: '80%',
  },
});
```

---

## Spacing Reference

Use ONLY these values:

```typescript
Spacing.xs   → 4px   // Tiny gaps, badge padding
Spacing.sm   → 8px   // Tight spacing, icon margins
Spacing.md   → 16px  // Standard card padding, list gaps
Spacing.lg   → 24px  // Section margins, screen padding
Spacing.xl   → 32px  // Large section spacing
Spacing.xxl  → 48px  // Extra large spacing
```

---

## Common Mistakes to Avoid

❌ **DON'T:**
```typescript
// Nested ScrollViews
<ScrollView>
  <ScrollView>...</ScrollView>
</ScrollView>

// Mixed spacing values
marginBottom: 15,
marginTop: 18,
gap: 10,

// Both flex and fixed width
flex: 1,
minWidth: '45%',

// Margins on children when parent has gap
gap: 12,
child: { marginBottom: 8 } // ← Remove this
```

✅ **DO:**
```typescript
// Single scroll per screen
<ScrollView>
  <View>...</View>
</ScrollView>

// Consistent spacing
marginBottom: Spacing.md,
marginTop: Spacing.md,
gap: Spacing.md,

// Use parent gap, no child margins
gap: Spacing.md,
child: { /* no margins */ }

// Fixed widths in flexWrap grids
width: '47%',
```


