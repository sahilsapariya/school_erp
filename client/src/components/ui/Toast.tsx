import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../design-system/theme';
import { Icons } from '../../design-system/icons';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION = 3500;

interface SingleToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

const toastConfig: Record<ToastType, { bg: string; border: string; icon: React.ReactNode; textColor: string }> = {
  success: {
    bg: theme.colors.successLight,
    border: theme.colors.success,
    icon: <Icons.CheckMark size={18} color={theme.colors.success} />,
    textColor: '#065F46',
  },
  error: {
    bg: theme.colors.dangerLight,
    border: theme.colors.danger,
    icon: <Icons.AlertCircle size={18} color={theme.colors.danger} />,
    textColor: '#991B1B',
  },
  warning: {
    bg: theme.colors.warningLight,
    border: theme.colors.warning,
    icon: <Icons.AlertCircle size={18} color={theme.colors.warning} />,
    textColor: '#92400E',
  },
  info: {
    bg: theme.colors.infoLight,
    border: theme.colors.info,
    icon: <Icons.Info size={18} color={theme.colors.info} />,
    textColor: '#1E40AF',
  },
};

const SingleToast: React.FC<SingleToastProps> = ({ toast, onDismiss }) => {
  const anim = useRef(new Animated.Value(0)).current;
  const config = toastConfig[toast.type];

  React.useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 120,
      friction: 8,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(anim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => onDismiss(toast.id));
    }, toast.duration ?? TOAST_DURATION);

    return () => clearTimeout(timer);
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] });
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: config.bg,
          borderLeftColor: config.border,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.toastIcon}>{config.icon}</View>
      <View style={styles.toastContent}>
        <Text style={[styles.toastTitle, { color: config.textColor }]}>{toast.title}</Text>
        {toast.message ? (
          <Text style={[styles.toastMessage, { color: config.textColor }]}>{toast.message}</Text>
        ) : null}
      </View>
      <TouchableOpacity onPress={() => onDismiss(toast.id)} style={styles.toastClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Icons.Close size={16} color={config.textColor} />
      </TouchableOpacity>
    </Animated.View>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const insets = useSafeAreaInsets();

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev.slice(-2), { ...toast, id }]);
  }, []);

  const success = useCallback((title: string, message?: string) => {
    showToast({ type: 'success', title, message });
  }, [showToast]);

  const error = useCallback((title: string, message?: string) => {
    showToast({ type: 'error', title, message });
  }, [showToast]);

  const warning = useCallback((title: string, message?: string) => {
    showToast({ type: 'warning', title, message });
  }, [showToast]);

  const info = useCallback((title: string, message?: string) => {
    showToast({ type: 'info', title, message });
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      <View
        style={[
          styles.container,
          { top: insets.top + (Platform.OS === 'android' ? 16 : 8) },
        ]}
        pointerEvents="box-none"
      >
        {toasts.map((toast) => (
          <SingleToast key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </View>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: theme.spacing.m,
    right: theme.spacing.m,
    zIndex: 9999,
    gap: theme.spacing.s,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: theme.radius.l,
    borderLeftWidth: 4,
    padding: theme.spacing.sm,
    paddingLeft: theme.spacing.m,
    ...theme.shadows.md,
  },
  toastIcon: {
    marginRight: theme.spacing.s,
    marginTop: 2,
  },
  toastContent: {
    flex: 1,
  },
  toastTitle: {
    ...theme.typography.label,
    fontWeight: '600',
  },
  toastMessage: {
    ...theme.typography.caption,
    marginTop: 2,
    opacity: 0.85,
  },
  toastClose: {
    marginLeft: theme.spacing.s,
    marginTop: 2,
  },
});
