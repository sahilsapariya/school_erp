# Role-Adaptive UI System - Implementation Guide

## Overview

The School ERP mobile app uses a **single codebase** that adapts its UI based on user permissions. Different roles (Admin, Teacher, Student, Parent) see different features in the same screens, creating a personalized experience while maintaining code simplicity.

## Core Principles

### 1. Permission-Based, Not Role-Based
- UI adapts based on **permissions**, not role names
- Same screen serves all roles with different content
- Features are **hidden** (not disabled) if user lacks permission
- No "Access Denied" messages in UI (backend enforces security)

### 2. Single App for All Users
- Admin, Teacher, Student, and Parent use the **same app**
- Navigation dynamically shows/hides tabs based on permissions
- Each screen adapts its content for the current user
- Professional experience for every user type

### 3. Modular Architecture
- Screens organized by feature module (Academics, Finance, etc.)
- Each module can be developed independently
- Role-specific components within screens
- Maximum 2 navigation levels deep

## Navigation Structure

### Dynamic Tab Bar

The app shows 1-5 tabs based on user permissions:

**All Users See:**
- Home (always visible)
- Profile (always visible)

**Conditionally Visible:**
- Academics (requires academic permissions)
- Activities (always visible)
- Finance (requires fee-related permissions)

### Permission Requirements for Tabs

```typescript
Home: Always visible
Academics: student.read, grade.read.self, attendance.*, etc.
Activities: Always visible
Finance: fee.read.self, fee.read.child, fee.manage, etc.
Profile: Always visible
```

## Screen Adaptation Patterns

### Pattern 1: Section Visibility

Different sections appear based on permissions:

```typescript
// Admin sees Overview section
<Protected anyPermissions={[PERMS.SYSTEM_MANAGE]}>
  <OverviewSection />
</Protected>

// Teachers see Class Management
<Protected permission={PERMS.ATTENDANCE_MARK}>
  <ClassManagementSection />
</Protected>

// Students see Personal Progress
<Protected permission={PERMS.GRADE_READ_SELF}>
  <PersonalProgressSection />
</Protected>
```

### Pattern 2: Action Adaptation

Same action card, different purpose per role:

```typescript
// Admin: View all grades
// Teacher: View class grades
// Student: View own grades

<TouchableOpacity style={styles.actionCard}>
  <Text>View Grades</Text>
  <Text>
    {isAdmin && 'All grades and reports'}
    {isTeacher && 'My class grades'}
    {isStudent && 'Grades and report card'}
  </Text>
</TouchableOpacity>
```

### Pattern 3: Feature Highlighting

Important actions highlighted for specific roles:

```typescript
// Teacher: Mark Attendance is PRIMARY action
<Protected permission={PERMS.ATTENDANCE_MARK}>
  <TouchableOpacity style={[styles.card, styles.primaryCard]}>
    <Text style={styles.primaryText}>Mark Attendance</Text>
  </TouchableOpacity>
</Protected>

// Parent: Pay Fees is PRIMARY action
<Protected permission={PERMS.FEE_PAY}>
  <TouchableOpacity style={[styles.card, styles.primaryCard]}>
    <Text style={styles.primaryText}>Pay Fees</Text>
  </TouchableOpacity>
</Protected>
```

## Role-Specific Experiences

### ADMIN Experience

**Visible Tabs:** All 5 tabs

**Home Screen:**
- System-wide metrics and statistics
- Quick access to pending approvals
- Search functionality (students, teachers, classes)
- Important notifications

**Academics Screen:**
- Academic overview with stats
- All classes management
- Attendance reports (all)
- Grade management (all)
- Assignment oversight

**Activities Screen:**
- Create school-wide events
- Manage all activities
- Post announcements (school-wide)
- Activity approvals

**Finance Screen:**
- Collection overview
- Fee reports and analytics
- Defaulters list
- Transaction management

**Profile Screen:**
- View roles & permissions (read-only)
- System information
- Full permissions list

---

### TEACHER Experience

**Visible Tabs:** Home, Academics, Activities, Profile

**Home Screen:**
- Today's teaching schedule
- Quick attendance marking
- Assigned classes
- Pending tasks (grade submissions)

**Academics Screen:**
- My classes only
- **Mark Attendance (PRIMARY)**
- Enter grades for my classes
- Create/manage assignments
- View student performance

**Activities Screen:**
- Post class announcements
- View school events
- Manage class activities

**Profile Screen:**
- Personal information
- Teaching schedule
- Assigned classes list

---

### STUDENT Experience

**Visible Tabs:** Home, Academics, Activities, Finance, Profile

**Home Screen:**
- Today's schedule
- Upcoming assignments
- Attendance summary
- Quick grade view

**Academics Screen:**
- My class schedule
- View grades (own)
- View and submit assignments
- Attendance record (own)
- Test schedules and results

**Activities Screen:**
- View school events
- See class announcements
- Extracurricular activities

**Finance Screen:**
- Fee status (view-only)
- Payment history
- Download receipts
- Fee structure

**Profile Screen:**
- Personal information (limited edit)
- Report card access
- Progress summary

---

### PARENT Experience

**Visible Tabs:** Home, Academics, Activities, Finance, Profile

**Home Screen:**
- Child selector (if multiple)
- Child's attendance summary
- Fee status
- Parent-teacher meeting reminders

**Academics Screen:**
- Child's grades
- Attendance record (child)
- Assignments (child)
- Report cards
- Teacher remarks

**Activities Screen:**
- School events
- Child's activity participation
- Class announcements

**Finance Screen:**
- Child's fee structure
- **Pay Fees (PRIMARY)**
- Payment history
- Download receipts
- Payment reminders

**Profile Screen:**
- Personal information
- Children list
- Link additional children
- Contact school

## Implementation Examples

### Dynamic Navigation

```typescript
// Sidebar.tsx
const visibleTabs = useMemo(() => 
  getVisibleTabs(permissions), 
  [permissions]
);

// Automatically shows only permitted tabs
{visibleTabs.map(tab => (
  <MenuItem key={tab.name} {...tab} />
))}
```

### Role Detection for UI Logic

```typescript
// In any screen
const { hasAnyPermission } = usePermissions();

const isAdmin = hasAnyPermission([
  PERMS.SYSTEM_MANAGE, 
  PERMS.USER_MANAGE
]);

const isTeacher = hasAnyPermission([
  PERMS.ATTENDANCE_MARK, 
  PERMS.GRADE_CREATE
]);

// Use for UI text, not for security!
```

### Conditional Rendering

```typescript
// Show/hide entire sections
<Protected permission={PERMS.STUDENT_CREATE}>
  <CreateStudentSection />
</Protected>

// Show for any permission
<Protected anyPermissions={[PERMS.GRADE_CREATE, PERMS.GRADE_MANAGE]}>
  <EnterGradesSection />
</Protected>

// Show for all permissions
<Protected allPermissions={[PERMS.STUDENT_READ, PERMS.CLASS_READ]}>
  <StudentClassView />
</Protected>
```

## Mobile vs Web Responsibilities

### Mobile App Features

✅ **Mobile-First Operations:**
- Quick attendance marking
- Fee payment (parents)
- Assignment submission (students)
- Notifications and alerts
- Schedule viewing
- Grade viewing
- Profile management

### Web Panel Features

✅ **Web-Only Operations:**
- Role & permission management
- Complete RBAC configuration
- Bulk imports (students, teachers)
- Complex report generation
- Fee structure setup
- Academic year configuration
- Timetable builder
- Curriculum management
- System settings
- Advanced analytics

### Shared Features

✅ **Available in Both:**
- Student/teacher lists (limited in mobile)
- Attendance reports
- Grade reports
- Basic announcements
- Profile viewing
- Notifications list

## Development Workflow

### Adding a New Feature

1. **Determine Permission Requirements**
   ```typescript
   // What permission is needed?
   const REQUIRED_PERM = PERMS.NEW_FEATURE_ACTION;
   ```

2. **Create Backend Permission**
   ```python
   # In seed_rbac.py or via admin panel
   create_permission('new_feature.action', 'Description')
   ```

3. **Add to Frontend Constants**
   ```typescript
   // client/common/constants/permissions.ts
   export const NEW_FEATURE_ACTION = 'new_feature.action';
   ```

4. **Implement UI with Protection**
   ```typescript
   <Protected permission={PERMS.NEW_FEATURE_ACTION}>
     <NewFeatureComponent />
   </Protected>
   ```

5. **Test with Different Roles**
   - Login as Admin → Should see feature
   - Login as Student → Should not see feature (if not assigned)

### Module Development Order

**Phase 1: Core (Complete ✓)**
- Authentication & Profile
- Home Dashboard
- Navigation System

**Phase 2: Academics**
1. Classes & Schedules
2. Attendance Module
3. Grades/Marks Module
4. Assignments Module

**Phase 3: Finance**
1. Fee Structure Display
2. Payment Integration
3. Transaction History
4. Reports (Admin)

**Phase 4: Communication**
1. Announcements
2. Notifications
3. Events Calendar

**Phase 5: Advanced**
1. Progress Reports
2. Analytics
3. Parent-Teacher Communication

## UI/UX Guidelines

### Simplicity Rules

✅ **DO:**
- Hide features user can't access
- Show clear role badge in profile
- Use primary colors for important actions
- Keep navigation max 2 levels deep
- Limit cards per screen to 6
- Use consistent iconography

❌ **DON'T:**
- Show disabled features with "Access Denied"
- Display technical error messages
- Create complex nested navigation
- Overload screens with too many options
- Use role names in user-facing text
- Show irrelevant features

### Design Consistency

**Card Styles:**
- Default: `backgroundSecondary` with `primary` icons
- Important Actions: `primary` background with white text
- Status Cards: Use semantic colors (success, warning, error)

**Typography:**
- Headers: 32px bold
- Section Titles: 20px semibold
- Card Titles: 16px semibold
- Subtitles: 13-14px regular

**Spacing:**
- Screen Padding: 24px horizontal
- Section Spacing: 24px vertical
- Card Spacing: 12px between cards
- Icon Size: 24px for actions, 32px for stats

## Testing Checklist

### Per Role Testing

**Admin:**
- [ ] Sees all 5 tabs
- [ ] Can access system overview
- [ ] Views all classes/students
- [ ] Sees admin-specific actions
- [ ] Role badge shows "Admin"

**Teacher:**
- [ ] Sees 4 tabs (no Finance if not assigned)
- [ ] "Mark Attendance" is highlighted
- [ ] Sees only their classes
- [ ] Can create assignments
- [ ] Role badge shows "Teacher"

**Student:**
- [ ] Sees all 5 tabs
- [ ] Sees own data only
- [ ] Can submit assignments
- [ ] Fee section is view-only
- [ ] Role badge shows "Student"

**Parent:**
- [ ] Sees all 5 tabs
- [ ] Sees child data only
- [ ] "Pay Fees" is highlighted
- [ ] Can't mark attendance
- [ ] Role badge shows "Parent"

### Permission Testing

- [ ] User with zero permissions cannot login
- [ ] Removing permission hides feature immediately (after relogin)
- [ ] Adding permission shows feature (after relogin)
- [ ] Hierarchical permissions work (manage implies all)
- [ ] system.manage sees everything

## Troubleshooting

**Issue: Tab not showing**
- Check if user has required permissions
- Verify navigation.ts configuration
- Ensure permission exists in backend

**Issue: Feature visible but shouldn't be**
- Check `<Protected>` wrapper implementation
- Verify permission constant spelling
- Check hierarchical permission rules

**Issue: Role badge shows wrong role**
- `getUserRole()` uses permission heuristics
- It's for display only, not security
- Backend determines actual capabilities

## Summary

The role-adaptive UI system provides:

✅ **Single Codebase** - One app serves all users
✅ **Permission-Based** - UI adapts to capabilities, not roles  
✅ **Clean UX** - No errors, just relevant features
✅ **Scalable** - Easy to add new features/roles
✅ **Maintainable** - Centralized permission management
✅ **Professional** - Appropriate experience for each user type

The system is production-ready and follows industry best practices for multi-tenant applications.
