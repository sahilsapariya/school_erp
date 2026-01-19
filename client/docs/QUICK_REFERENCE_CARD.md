# Quick Reference Card

Print this or keep it open while coding screens.

---

## Spacing Values (ONLY use these)

```typescript
import { Spacing, Layout } from '@/common/constants/spacing';

Spacing.xs   →  4px   Badge padding, tiny gaps
Spacing.sm   →  8px   Icon margins, tight spacing
Spacing.md   → 16px   Card padding, list gaps (MOST COMMON)
Spacing.lg   → 24px   Screen padding, section margins
Spacing.xl   → 32px   Large section spacing
Spacing.xxl  → 48px   Extra large spacing

Layout.borderRadius.sm   →  8px
Layout.borderRadius.md   → 12px  (MOST COMMON)
Layout.borderRadius.lg   → 16px
Layout.borderRadius.xl   → 20px
```

---

## Screen Template

```typescript
import { ScrollView, View, StyleSheet } from 'react-native';
import { Spacing, Layout } from '@/common/constants/spacing';
import { Colors } from '@/common/constants/colors';

export default function MyScreen() {
  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.content}>
        {/* Content here */}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: Spacing.lg },
  content: { gap: Spacing.md },  // ← Controls all child spacing
});
```

---

## Common Patterns

### Cards
```typescript
// Parent
<View style={{ gap: Spacing.md }}>
  <Card />
  <Card />
</View>

// Card style
{
  backgroundColor: Colors.backgroundSecondary,
  borderRadius: Layout.borderRadius.lg,
  padding: Spacing.md,
  // NO marginBottom
}
```

### 2-Column Grid
```typescript
{
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: Spacing.md,
}

// Item
{
  width: '47%',  // NOT flex: 1 or minWidth
}
```

### Form Fields
```typescript
<View style={{ gap: Spacing.md }}>
  <TextInput />
  <TextInput />
  <TextInput />
</View>
```

---

## Don't Do This ❌

```typescript
// ❌ Nested scrolls
<ScrollView>
  <ScrollView>...</ScrollView>
</ScrollView>

// ❌ Mixed spacing
marginBottom: 15,
gap: 10,
padding: 18,

// ❌ Children with margins when parent has gap
parent: { gap: Spacing.md },
child: { marginBottom: 8 },  // Remove this

// ❌ Conditional overlay rendering
if (!visible) return null;

// ❌ Flex + minWidth in grid
minWidth: '45%',
flex: 1,
```

---

## Do This Instead ✅

```typescript
// ✅ Single scroll
<ScrollView>
  <View>...</View>
</ScrollView>

// ✅ Consistent spacing
marginBottom: Spacing.md,
gap: Spacing.md,
padding: Spacing.lg,

// ✅ Parent controls spacing
parent: { gap: Spacing.md },
child: { /* no margins */ },

// ✅ Always render overlay
pointerEvents={visible ? 'auto' : 'none'}

// ✅ Fixed width in grid
width: '47%',
```

---

## Overlay Pattern

```typescript
// Always render, control via pointerEvents
<Animated.View
  style={[styles.overlay, { opacity }]}
  pointerEvents={visible ? 'auto' : 'none'}
>
  <TouchableOpacity 
    style={StyleSheet.absoluteFill} 
    onPress={onClose} 
  />
</Animated.View>
```

---

## Typography Sizes

```
Page Title:    28-32px, weight: 700
Section Title: 20-24px, weight: 600
Card Title:    18px,    weight: 600
Body Text:     14-16px, weight: 400
Caption:       12-13px, weight: 400
```

---

## Validation Before Commit

- [ ] Only ONE ScrollView
- [ ] All spacing uses `Spacing.*`
- [ ] Parent uses `gap`, children have no margins
- [ ] Tested with sidebar open/closed
- [ ] Tested on iPhone SE size

---

## Grid Width Calculator

```
2 columns: 47%
3 columns: 31%
4 columns: 22.5%

Formula: (100 - (gap-in-percent * (columns - 1))) / columns
```

---

## Common Files

```
Spacing:     common/constants/spacing.ts
Colors:      common/constants/colors.ts
Layout:      common/components/MainLayout.tsx
Sidebar:     common/components/Sidebar.tsx
Auth:        common/hooks/useAuth.ts
Permissions: common/hooks/usePermissions.ts
```

---

## Z-Index Layers

```
1000+: Modals, Alerts
999:   Sidebar
998:   Sidebar Backdrop
1:     Main Content
0:     Background
```

---

## Safe Areas

- MainLayout handles safe areas
- Don't add extra padding in screens
- Use `edges={['top', 'bottom']}` in SafeAreaView
