import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '@/common/constants/colors';
import { Spacing, Layout } from '@/common/constants/spacing';
import { Ionicons } from '@expo/vector-icons';
import { Protected } from '@/common/components/Protected';
import { usePermissions } from '@/common/hooks/usePermissions';
import * as PERMS from '@/common/constants/permissions';

export default function FinanceScreen() {
  const { hasAnyPermission } = usePermissions();

  const isAdmin = hasAnyPermission([PERMS.SYSTEM_MANAGE, PERMS.FEE_MANAGE]);
  const isParent = hasAnyPermission([PERMS.FEE_PAY, PERMS.FEE_READ_CHILD]);
  const isStudent = hasAnyPermission([PERMS.FEE_READ_SELF]);

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Finance</Text>
        <Text style={styles.subtitle}>
          {isAdmin && 'Manage fee collection and reports'}
          {isParent && "Manage child&apos;s fee payments"}
          {isStudent && 'View fee information'}
        </Text>
      </View>

      <View style={styles.content}>
        <Protected anyPermissions={[PERMS.SYSTEM_MANAGE, PERMS.FEE_MANAGE]}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Ionicons name="cash-outline" size={32} color={Colors.success} />
                <Text style={styles.statValue}>₹12.5L</Text>
                <Text style={styles.statLabel}>Collected</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="hourglass-outline" size={32} color={Colors.warning} />
                <Text style={styles.statValue}>₹3.2L</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
            </View>
          </View>
        </Protected>

        {/* Fee Status - Student/Parent */}
        <Protected anyPermissions={[PERMS.FEE_READ_SELF, PERMS.FEE_READ_CHILD]}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fee Status</Text>
            
            <View style={styles.feeStatusCard}>
              <View style={styles.feeHeader}>
                <Text style={styles.feeTitle}>Current Term Fee</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>Pending</Text>
                </View>
              </View>
              <View style={styles.feeDetails}>
                <View style={styles.feeRow}>
                  <Text style={styles.feeLabel}>Total Amount</Text>
                  <Text style={styles.feeAmount}>₹25,000</Text>
                </View>
                <View style={styles.feeRow}>
                  <Text style={styles.feeLabel}>Paid</Text>
                  <Text style={styles.feePaid}>₹15,000</Text>
                </View>
                <View style={[styles.feeRow, styles.feeRowBorder]}>
                  <Text style={styles.feeLabel}>Balance</Text>
                  <Text style={styles.feeBalance}>₹10,000</Text>
                </View>
              </View>
              <View style={styles.dueDateRow}>
                <Ionicons name="time-outline" size={16} color={Colors.warning} />
                <Text style={styles.dueDate}>Due Date: 25 Jan 2026</Text>
              </View>
            </View>
          </View>
        </Protected>

        {/* Payment Actions - Parent Only */}
        <Protected permission={PERMS.FEE_PAY}>
          <View style={styles.section}>
            <TouchableOpacity style={[styles.actionCard, styles.primaryCard]}>
              <View style={styles.cardContent}>
                <View style={[styles.cardIcon, styles.primaryIcon]}>
                  <Ionicons name="card-outline" size={24} color={Colors.background} />
                </View>
                <View style={styles.cardText}>
                  <Text style={[styles.cardTitle, styles.primaryText]}>Pay Fees</Text>
                  <Text style={[styles.cardSubtitle, styles.primarySubtext]}>
                    Make online payment
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.background} />
            </TouchableOpacity>
          </View>
        </Protected>

        {/* Fee Structure */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fee Structure</Text>
          
          <TouchableOpacity style={styles.actionCard}>
            <View style={styles.cardContent}>
              <View style={styles.cardIcon}>
                <Ionicons name="document-text-outline" size={24} color={Colors.primary} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>View Fee Structure</Text>
                <Text style={styles.cardSubtitle}>Complete fee breakdown</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Payment History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment History</Text>
          
          <TouchableOpacity style={styles.actionCard}>
            <View style={styles.cardContent}>
              <View style={styles.cardIcon}>
                <Ionicons name="receipt-outline" size={24} color={Colors.primary} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Transaction History</Text>
                <Text style={styles.cardSubtitle}>
                  {isAdmin ? 'All transactions' : 'Your payment history'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <View style={styles.cardContent}>
              <View style={styles.cardIcon}>
                <Ionicons name="download-outline" size={24} color={Colors.primary} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Download Receipts</Text>
                <Text style={styles.cardSubtitle}>Get payment receipts</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Admin Reports */}
        <Protected anyPermissions={[PERMS.FEE_MANAGE, PERMS.SYSTEM_MANAGE]}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reports</Text>
            
            <TouchableOpacity style={styles.actionCard}>
              <View style={styles.cardContent}>
                <View style={styles.cardIcon}>
                  <Ionicons name="bar-chart-outline" size={24} color={Colors.primary} />
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>Collection Reports</Text>
                  <Text style={styles.cardSubtitle}>Fee collection analysis</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard}>
              <View style={styles.cardContent}>
                <View style={styles.cardIcon}>
                  <Ionicons name="alert-circle-outline" size={24} color={Colors.error} />
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>Defaulters List</Text>
                  <Text style={styles.cardSubtitle}>Pending fee students</Text>
                </View>
              </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
        </Protected>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: Spacing.lg,
  },
  header: {
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.xs,
    fontFamily: 'System',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontFamily: 'System',
  },
  content: {
    gap: Spacing.lg,
  },
  section: {
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
    fontFamily: 'System',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.sm,
    fontFamily: 'System',
  },
  statLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    fontFamily: 'System',
  },
  feeStatusCard: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
  },
  feeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  feeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    fontFamily: 'System',
  },
  statusBadge: {
    backgroundColor: Colors.warning,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Layout.borderRadius.md,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.background,
    fontFamily: 'System',
  },
  feeDetails: {
    marginBottom: Spacing.md,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  feeRowBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: Spacing.sm,
    paddingTop: Spacing.md,
  },
  feeLabel: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontFamily: 'System',
  },
  feeAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    fontFamily: 'System',
  },
  feePaid: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.success,
    fontFamily: 'System',
  },
  feeBalance: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.error,
    fontFamily: 'System',
  },
  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dueDate: {
    fontSize: 13,
    color: Colors.warning,
    fontFamily: 'System',
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  primaryCard: {
    backgroundColor: Colors.primary,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  primaryIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
    fontFamily: 'System',
  },
  primaryText: {
    color: Colors.background,
  },
  cardSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: 'System',
  },
  primarySubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
});
