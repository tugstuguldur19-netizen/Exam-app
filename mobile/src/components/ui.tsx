import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, IconName, radius, shadow, spacing, type } from "../theme";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";

export function Button({
  title,
  onPress,
  variant = "primary",
  icon,
  loading,
  disabled,
  style,
  small,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const v = buttonVariants[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: pressed ? v.pressed : v.bg, borderColor: v.border },
        variant === "primary" && shadow,
        inactive && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <View style={styles.buttonInner}>
          {icon && <Ionicons name={icon} size={small ? 16 : 18} color={v.fg} />}
          <Text style={[styles.buttonText, small && styles.buttonTextSmall, { color: v.fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const buttonVariants: Record<ButtonVariant, { bg: string; pressed: string; fg: string; border: string }> = {
  primary: { bg: colors.primary, pressed: colors.primaryDark, fg: colors.white, border: colors.primary },
  secondary: { bg: colors.primarySoft, pressed: "#E0E7FF", fg: colors.primary, border: colors.primarySoft },
  ghost: { bg: colors.surface, pressed: colors.background, fg: colors.textPrimary, border: colors.border },
  danger: { bg: colors.dangerSoft, pressed: "#F9D9DA", fg: colors.danger, border: colors.dangerSoft },
  success: { bg: colors.success, pressed: "#0E7A5B", fg: colors.white, border: colors.success },
};

export function Card({ children, style, onPress }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (!onPress) return <View style={[styles.card, style]}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed, style]}>
      {children}
    </Pressable>
  );
}

export function Badge({
  text,
  color = colors.primary,
  bg = colors.primarySoft,
  icon,
}: {
  text: string;
  color?: string;
  bg?: string;
  icon?: IconName;
}) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {icon && <Ionicons name={icon} size={12} color={color} />}
      <Text style={[styles.badgeText, { color }]}>{text}</Text>
    </View>
  );
}

export function ProgressBar({ value, color = colors.primary, height = 8, track = colors.border }: { value: number; color?: string; height?: number; track?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View style={[styles.track, { height, borderRadius: height / 2, backgroundColor: track }]}>
      <View style={{ width: `${pct}%`, height, borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
}

export function IconBubble({ icon, fg, bg, size = 44 }: { icon: IconName; fg: string; bg: string; size?: number }) {
  return (
    <View style={[styles.iconBubble, { width: size, height: size, borderRadius: size * 0.32, backgroundColor: bg }]}>
      <Ionicons name={icon} size={size * 0.5} color={fg} />
    </View>
  );
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && onAction && (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function Loader({ label }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} size="large" />
      {label && <Text style={styles.centerText}>{label}</Text>}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <IconBubble icon="cloud-offline-outline" fg={colors.danger} bg={colors.dangerSoft} size={60} />
      <Text style={styles.centerTitle}>Ачаалж чадсангүй</Text>
      <Text style={styles.centerText}>{message}</Text>
      {onRetry && <Button title="Дахин оролдох" icon="refresh" onPress={onRetry} style={{ marginTop: spacing.lg }} />}
    </View>
  );
}

export function EmptyState({ icon, title, text, children }: { icon: IconName; title: string; text?: string; children?: React.ReactNode }) {
  return (
    <View style={styles.empty}>
      <IconBubble icon={icon} fg={colors.primary} bg={colors.primarySoft} size={60} />
      <Text style={styles.centerTitle}>{title}</Text>
      {text && <Text style={styles.centerText}>{text}</Text>}
      {children}
    </View>
  );
}

export function Field({ icon, style, ...props }: TextInputProps & { icon: IconName }) {
  return (
    <View style={styles.field}>
      <Ionicons name={icon} size={18} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
      <TextInput placeholderTextColor={colors.textMuted} style={[styles.input, style]} {...props} />
    </View>
  );
}

// − 5 + style number picker.
export function Stepper({
  value,
  min = 0,
  max,
  step = 1,
  onChange,
}: {
  value: number;
  min?: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));
  return (
    <View style={styles.stepper}>
      <Pressable onPress={dec} disabled={value <= min} hitSlop={6} style={[styles.stepBtn, value <= min && styles.disabled]} accessibilityLabel="Хасах">
        <Ionicons name="remove" size={18} color={colors.primary} />
      </Pressable>
      <Text style={styles.stepValue}>{value}</Text>
      <Pressable onPress={inc} disabled={value >= max} hitSlop={6} style={[styles.stepBtn, value >= max && styles.disabled]} accessibilityLabel="Нэмэх">
        <Ionicons name="add" size={18} color={colors.primary} />
      </Pressable>
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function StatTile({ icon, value, label, color = colors.primary, bg = colors.primarySoft }: { icon: IconName; value: string; label: string; color?: string; bg?: string }) {
  return (
    <View style={styles.statTile}>
      <IconBubble icon={icon} fg={color} bg={bg} size={34} />
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    minHeight: 50,
  },
  buttonSmall: { paddingVertical: 8, paddingHorizontal: spacing.md, minHeight: 38, borderRadius: radius.sm },
  buttonInner: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  buttonText: { fontWeight: "700", fontSize: 16 },
  buttonTextSmall: { fontSize: 14 },
  disabled: { opacity: 0.45 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  cardPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  badgeText: { ...type.tiny },
  track: { width: "100%", overflow: "hidden" },
  iconBubble: { alignItems: "center", justifyContent: "center" },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: { ...type.h2, color: colors.textPrimary },
  sectionAction: { ...type.small, color: colors.primary, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xxl, backgroundColor: colors.background },
  empty: { alignItems: "center", padding: spacing.xxl },
  centerTitle: { ...type.h2, color: colors.textPrimary, marginTop: spacing.lg, textAlign: "center" },
  centerText: { ...type.body, color: colors.textSecondary, marginTop: spacing.sm, textAlign: "center", lineHeight: 21 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: colors.textPrimary },
  stepper: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  stepValue: { ...type.bodyStrong, color: colors.textPrimary, minWidth: 28, textAlign: "center" },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...type.small, color: colors.textSecondary, fontWeight: "600" },
  chipTextSelected: { color: colors.white },
  statTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  statValue: { ...type.h2, color: colors.textPrimary },
  statLabel: { ...type.small, color: colors.textSecondary },
});
