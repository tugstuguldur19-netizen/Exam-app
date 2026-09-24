import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { api, describeError } from "../api/client";
import { useLoad } from "../hooks/useLoad";
import { Badge, Button, ErrorState, Loader } from "../components/ui";
import { confirm, showMessage } from "../components/dialog";
import { formatDate, formatMNT } from "../format";
import { colors, radius, shadow, spacing, type } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Plans">;

const BENEFITS = [
  "Сэдэв бүрээр тест өгөх",
  "Холимог тест — сэдэв бүрээс тоогоо сонгоно",
  "Алдсан асуултаа дахин ажиллах",
  "Хариулт бүрийн тайлбар",
  "Өөрийн .docx тестээ хязгааргүй оруулах",
];

export default function PlansScreen({ route, navigation }: Props) {
  const { subjectId, subjectName } = route.params;
  const { data: subject, error, loading, retry } = useLoad(() => api.subject(subjectId), [subjectId]);
  const [selected, setSelected] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);

  if (loading) return <Loader />;
  if (error || !subject) return <ErrorState message={error ?? ""} onRetry={retry} />;

  const plans = [...subject.plans].sort((a, b) => a.durationDays - b.durationDays);
  const monthly = plans[0];
  const planId = selected ?? plans[plans.length > 1 ? 1 : 0]?.id;
  const plan = plans.find((p) => p.id === planId);

  const buy = async () => {
    if (!plan) return;
    const ok = await confirm(
      "Эрх идэвхжүүлэх",
      `${subjectName} · ${plan.name} — ${formatMNT(plan.price)}\n\nТөлбөрийн систем (QPay, карт) удахгүй холбогдоно. Одоогоор туршилтын горимоор эрх шууд идэвхжинэ.`,
      { confirmText: "Идэвхжүүлэх" }
    );
    if (!ok) return;
    setBuying(true);
    try {
      const sub = await api.subscribe(subjectId, plan.id);
      showMessage("Амжилттай! 🎉", `${subjectName} хичээлийн эрх ${formatDate(sub.endAt)} хүртэл идэвхжлээ.`);
      navigation.goBack();
    } catch (err) {
      showMessage("Алдаа", describeError(err));
    } finally {
      setBuying(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="sparkles" size={28} color={colors.white} />
        </View>
        <Text style={styles.title}>{subjectName}</Text>
        <Text style={styles.subtitle}>
          {subject.subscription
            ? `Таны эрх ${formatDate(subject.subscription.endAt)} хүртэл. Сунгавал үлдсэн хугацаан дээр нэмэгдэнэ.`
            : "Бүх тестийг нээж, шалгалтандаа бүрэн бэлдээрэй"}
        </Text>
      </View>

      <View style={styles.benefits}>
        {BENEFITS.map((b) => (
          <View key={b} style={styles.benefit}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.benefitText}>{b}</Text>
          </View>
        ))}
      </View>

      {plans.map((p) => {
        const isSel = p.id === planId;
        const perMonth = Math.round(p.price / Math.max(1, p.durationDays / 30));
        const saving =
          monthly && p.id !== monthly.id ? Math.round((1 - perMonth / monthly.price) * 100) : 0;
        return (
          <Pressable
            key={p.id}
            onPress={() => setSelected(p.id)}
            style={[styles.plan, isSel && styles.planSelected]}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSel }}
          >
            <Ionicons name={isSel ? "radio-button-on" : "radio-button-off"} size={22} color={isSel ? colors.primary : colors.textMuted} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                <Text style={styles.planName}>{p.name}</Text>
                {saving > 0 && <Badge text={`${saving}% хэмнэлт`} color={colors.success} bg={colors.successSoft} />}
              </View>
              <Text style={styles.planMeta}>сард {formatMNT(perMonth)}</Text>
            </View>
            <Text style={styles.planPrice}>{formatMNT(p.price)}</Text>
          </Pressable>
        );
      })}

      <Button
        title={plan ? `${formatMNT(plan.price)} — ${subject.subscription ? "Сунгах" : "Эрх авах"}` : "Эрх авах"}
        onPress={buy}
        loading={buying}
        style={{ marginTop: spacing.lg }}
      />
      <Text style={styles.note}>Эрх зөвхөн энэ хичээлд хамаарна. Туршилтын тест үргэлж үнэгүй.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl, maxWidth: 560, width: "100%", alignSelf: "center" },
  header: { alignItems: "center", marginBottom: spacing.xl },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadow,
  },
  title: { ...type.h1, color: colors.textPrimary, marginTop: spacing.md },
  subtitle: { ...type.body, color: colors.textSecondary, textAlign: "center", marginTop: spacing.xs, lineHeight: 21 },
  benefits: { gap: spacing.sm, marginBottom: spacing.xl },
  benefit: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  benefitText: { ...type.body, color: colors.textPrimary, flex: 1 },
  plan: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  planSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  planName: { ...type.bodyStrong, color: colors.textPrimary },
  planMeta: { ...type.small, color: colors.textSecondary, marginTop: 2 },
  planPrice: { ...type.h2, color: colors.textPrimary },
  note: { ...type.small, color: colors.textMuted, textAlign: "center", marginTop: spacing.md },
});
