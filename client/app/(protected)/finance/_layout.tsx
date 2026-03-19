import { useEffect } from "react";
import { useRouter } from "expo-router";
import { Stack } from "expo-router";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import * as PERMS from "@/modules/permissions/constants/permissions";
import { Colors } from "@/common/constants/colors";

export default function FinanceLayout() {
  const router = useRouter();
  const { isFeatureEnabled, hasAnyPermission } = useAuth();

  useEffect(() => {
    if (!isFeatureEnabled("fees_management")) {
      router.replace("/(protected)/home");
      return;
    }
    if (!hasAnyPermission([PERMS.FINANCE_READ, PERMS.FINANCE_MANAGE, PERMS.FEES_INVOICE_READ])) {
      router.replace("/(protected)/home");
    }
  }, [isFeatureEnabled, hasAnyPermission, router]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="structures/index" />
      <Stack.Screen name="structures/[id]" />
      <Stack.Screen name="student-fees/index" />
      <Stack.Screen name="student-fees/[id]" />
      <Stack.Screen name="invoices/index" />
      <Stack.Screen name="invoices/[id]" />
    </Stack>
  );
}
