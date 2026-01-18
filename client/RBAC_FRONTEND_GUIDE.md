# Frontend RBAC Integration Guide

## Overview

The frontend now fully supports the RBAC (Role-Based Access Control) system. Permissions are fetched on login and cached locally for UI rendering, while the backend always enforces actual authorization.

## How It Works

1. **Login** - User logs in and receives permissions array
2. **Storage** - Permissions cached in secure storage
3. **Context** - Permissions available throughout the app via AuthContext
4. **Rendering** - UI conditionally shows/hides based on permissions
5. **Backend** - All API calls still require valid permissions (backend enforces)

## Quick Start

### 1. Check Permissions in Components

```typescript
import { usePermissions } from '@/common/hooks/usePermissions';
import * as PERMS from '@/common/constants/permissions';

function MyComponent() {
  const { hasPermission } = usePermissions();

  return (
    <View>
      {hasPermission(PERMS.STUDENT_CREATE) && (
        <Button title="Create Student" />
      )}
    </View>
  );
}
```

### 2. Use Protected Component

```typescript
import { Protected } from '@/common/components/Protected';
import * as PERMS from '@/common/constants/permissions';

function MyScreen() {
  return (
    <View>
      {/* Single permission */}
      <Protected permission={PERMS.STUDENT_CREATE}>
        <CreateStudentButton />
      </Protected>

      {/* Any of multiple permissions */}
      <Protected anyPermissions={[PERMS.GRADE_READ_SELF, PERMS.GRADE_READ_CLASS]}>
        <GradesList />
      </Protected>

      {/* All permissions required */}
      <Protected allPermissions={[PERMS.STUDENT_READ, PERMS.CLASS_READ]}>
        <StudentClassView />
      </Protected>

      {/* With fallback UI */}
      <Protected 
        permission={PERMS.ADMIN_PANEL} 
        fallback={<Text>Access Denied</Text>}
      >
        <AdminPanel />
      </Protected>
    </View>
  );
}
```

### 3. Conditional Logic

```typescript
import { usePermissions } from '@/common/hooks/usePermissions';
import * as PERMS from '@/common/constants/permissions';

function ActionButton() {
  const { hasPermission, hasAnyPermission } = usePermissions();

  const handleAction = () => {
    if (hasPermission(PERMS.STUDENT_UPDATE)) {
      // User can update
      updateStudent();
    } else {
      Alert.alert('Permission Denied', 'You cannot update students');
    }
  };

  // Check multiple permissions
  const canManageGrades = hasAnyPermission([
    PERMS.GRADE_CREATE,
    PERMS.GRADE_UPDATE,
    PERMS.GRADE_MANAGE
  ]);

  return canManageGrades ? <Button onPress={handleAction} /> : null;
}
```

## Available Hooks

### useAuth()
Main authentication hook with permission methods.

```typescript
const { 
  user,                    // Current user data
  permissions,             // Array of permission strings
  isAuthenticated,         // Boolean
  isLoading,              // Boolean
  login,                  // Login function
  logout,                 // Logout function
  hasPermission,          // Check single permission
  hasAnyPermission,       // Check any of multiple permissions
  hasAllPermissions,      // Check all permissions required
} = useAuth();
```

### usePermissions()
Dedicated permissions hook (shortcut to useAuth permission methods).

```typescript
const {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  permissions,
} = usePermissions();
```

## Permission Constants

Use constants from `@/common/constants/permissions` to avoid typos:

```typescript
import * as PERMS from '@/common/constants/permissions';

// System
PERMS.SYSTEM_MANAGE

// Users
PERMS.USER_CREATE
PERMS.USER_READ
PERMS.USER_UPDATE
PERMS.USER_DELETE
PERMS.USER_MANAGE

// Attendance
PERMS.ATTENDANCE_MARK
PERMS.ATTENDANCE_READ_SELF
PERMS.ATTENDANCE_READ_CLASS
PERMS.ATTENDANCE_MANAGE

// Students
PERMS.STUDENT_CREATE
PERMS.STUDENT_READ
PERMS.STUDENT_UPDATE
PERMS.STUDENT_DELETE
PERMS.STUDENT_MANAGE

// Grades
PERMS.GRADE_CREATE
PERMS.GRADE_READ_SELF
PERMS.GRADE_READ_CLASS
PERMS.GRADE_MANAGE

// And many more...
```

## Hierarchical Permissions

The system supports hierarchical permissions where `resource.manage` implies all `resource.*` permissions:

```typescript
// User has: ['attendance.manage']

hasPermission('attendance.mark')        // ✅ True
hasPermission('attendance.read.self')   // ✅ True
hasPermission('attendance.read.class')  // ✅ True
hasPermission('attendance.update')      // ✅ True
hasPermission('student.create')         // ❌ False

// User has: ['system.manage']
// Has ALL permissions in the system
```

## Best Practices

### 1. Use Constants
Always use permission constants to avoid typos:

```typescript
// ✅ Good
hasPermission(PERMS.STUDENT_CREATE)

// ❌ Bad
hasPermission('student.create')  // Typo risk
```

### 2. Check Before Actions
Always verify permissions before performing actions:

```typescript
const handleDelete = async () => {
  if (!hasPermission(PERMS.STUDENT_DELETE)) {
    Alert.alert('Permission Denied');
    return;
  }
  
  await deleteStudent(id);
};
```

### 3. Graceful Degradation
Show appropriate feedback when features are hidden:

```typescript
<Protected 
  permission={PERMS.ADMIN_PANEL}
  fallback={
    <View style={styles.noAccess}>
      <Text>Admin access required</Text>
      <Text>Contact your administrator for access</Text>
    </View>
  }
>
  <AdminPanel />
</Protected>
```

### 4. Combine with Navigation
Hide routes in navigation based on permissions:

```typescript
const tabs = [
  { name: 'Home', permission: null },
  { name: 'Students', permission: PERMS.STUDENT_READ },
  { name: 'Grades', permission: PERMS.GRADE_READ_SELF },
  { name: 'Admin', permission: PERMS.USER_MANAGE },
];

return (
  <View>
    {tabs.map(tab => (
      <Protected key={tab.name} permission={tab.permission}>
        <Tab {...tab} />
      </Protected>
    ))}
  </View>
);
```

## Common Patterns

### Admin-Only Features
```typescript
<Protected anyPermissions={[PERMS.SYSTEM_MANAGE, PERMS.USER_MANAGE]}>
  <AdminPanel />
</Protected>
```

### Teacher Features
```typescript
<Protected anyPermissions={[
  PERMS.ATTENDANCE_MARK,
  PERMS.GRADE_CREATE,
  PERMS.ATTENDANCE_MANAGE
]}>
  <TeacherDashboard />
</Protected>
```

### Student Self-Service
```typescript
<Protected permission={PERMS.GRADE_READ_SELF}>
  <MyGrades />
</Protected>

<Protected permission={PERMS.ASSIGNMENT_SUBMIT}>
  <SubmitAssignment />
</Protected>
```

### Parent Features
```typescript
<Protected anyPermissions={[
  PERMS.GRADE_READ_CHILD,
  PERMS.FEE_PAY
]}>
  <ParentPortal />
</Protected>
```

## Security Notes

⚠️ **Important**: The frontend permission checks are for **UI/UX only**. They:
- Hide/show buttons and features
- Prevent unnecessary API calls
- Improve user experience

The **backend always enforces** actual authorization. Never rely solely on frontend checks for security.

## Debugging

### Check User Permissions
```typescript
const { permissions } = usePermissions();
console.log('User permissions:', permissions);
```

### Check Specific Permission
```typescript
const { hasPermission } = usePermissions();
console.log('Can create student?', hasPermission(PERMS.STUDENT_CREATE));
```

### View All Permissions
The home screen displays all user permissions for debugging.

## Example: Complete Feature Implementation

```typescript
import React, { useState } from 'react';
import { View, Button, Alert } from 'react-native';
import { usePermissions } from '@/common/hooks/usePermissions';
import { Protected } from '@/common/components/Protected';
import * as PERMS from '@/common/constants/permissions';
import { apiPost } from '@/common/services/api';

function StudentManagement() {
  const { hasPermission } = usePermissions();
  const [loading, setLoading] = useState(false);

  const createStudent = async () => {
    if (!hasPermission(PERMS.STUDENT_CREATE)) {
      Alert.alert('Permission Denied');
      return;
    }

    try {
      setLoading(true);
      await apiPost('/students', studentData);
      Alert.alert('Success', 'Student created');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      {/* List visible to anyone with read permission */}
      <Protected permission={PERMS.STUDENT_READ}>
        <StudentList />
      </Protected>

      {/* Create button only for authorized users */}
      <Protected permission={PERMS.STUDENT_CREATE}>
        <Button 
          title="Create Student" 
          onPress={createStudent}
          disabled={loading}
        />
      </Protected>

      {/* Edit/Delete for manage permission */}
      <Protected permission={PERMS.STUDENT_MANAGE}>
        <StudentActions />
      </Protected>
    </View>
  );
}
```

## Troubleshooting

**Permissions not loading?**
- Check if login response includes `permissions` array
- Verify backend is returning permissions
- Check console for errors

**Permission check not working?**
- Verify you're using correct permission constant
- Check if permission exists in constants file
- Console.log user permissions to debug

**Features not showing?**
- User may not have required permission
- Check if user has been assigned roles
- Contact backend admin to assign permissions
