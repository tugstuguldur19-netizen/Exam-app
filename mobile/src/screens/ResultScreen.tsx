import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { api, ApiError, describeError } from "../api/client";
import { useLoad } from "../hooks/useLoad";
import { Button, Card, Chip, ErrorState, Loader } from "../components/ui";
import { confirm, showMessage } from "../components/dialog";
import { formatDateTime, formatDuration, MODE_LABELS, scoreMessage } from "../format";
import { accuracyColor, colors, radius, spacing, type } from "../theme";
import type { Question } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Result">;
type Filter = "all" | "wrong" | "right";

function outcome(q: Question): "right" | "wrong" | "skipped" | "ungraded" {
  const skipped = !q.selectedChoiceId && !q.answerText;
  if (!q.gradable) return "ungraded";
  if (q.isCorrect) return "right";
  return skipped ? "skipped" : "wrong";
}

export default function ResultScreen({ route, navigation }: Props) {
  const { sessionId } = route.params;
  const { data: s, error, loading, retry } = useLoad(() => api.test(sessionId), [sessionId]);
  const [filter, setFilter] = useState<Filter>("all");
  const [retaking, setRetaking] = useState(false);

  if (loading) return <Loader />;
  if (error || !s) return <ErrorState message={error ?? ""} onRetry={retry} />;

  const outcomes = s.questions.map(outcome);
  const right = outcomes.filter((o) => o === "right").length;
  const wrong = outcomes.filter((o) => o === "wrong").length;
  const skipped = outcomes.filter((o) => o === "skipped").length;
  const ungraded = outcomes.filter((o) => o === "ungraded").length;
  const pct = s.percent;
  const color = accuracyColor(pct);

  const shown = s.questions
    .map((q, i) => ({ q, i, o: outcomes[i] }))
    .filter(({ o }) => filter === "all" || (filter === "right" ? o === "right" : o === "wrong" || o === "skipped"));

  const retake = async () => {
    setRetaking(true);
    try {
      const next = await api.retakeTest(s.id);
      navigation.replace("TakeTest", { sessionId: next.id, title: next.title });
    } catch (err) {
      if (err instanceof ApiError && err.code === "SUBSCRIPTION_REQUIRED" && s.subjectId) {
        const go = await confirm("Эрх шаардлагатай", err.message, { confirmText: "Эрх авах" });
        if (go) navigation.navigate("Plans", { subjectId: s.subjectId, subjectName: s.subjectName ?? "" });
      } else {
        showMessage("Алдаа", describeError(err));
      }
    } finally {
      setRetaking(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card style={styles.scoreCard}>
        <Text style={styles.mode}>
          {MODE_LABELS[s.mode]}
          {s.subjectName ? ` · ${s.subjectName}` : ""}
        </Text>
        <Text style={styles.title}>{s.title}</Text>
        <View style={[styles.ring, { borderColor: color }]}>
          <Text style={[styles.pct, { color }]}>{pct === null ? "—" : `${pct}%`}</Text>
          <Text style={styles.score}>
            {s.scorePoints ?? 0} / {s.totalPoints ?? 0}
          </Text>
        </View>
        <Text style={styles.message}>{scoreMessage(pct)}</Text>
        <View style={styles.pills}>
          <Pill icon="checkmark-circle" color={colors.success} value={right} label="Зөв" />
          <Pill icon="close-circle" color={colors.danger} value={wrong} label="Буруу" />
          <Pill icon="remove-circle" color={colors.textMuted} value={skipped} label="Алгассан" />
        </View>
        <Text style={styles.meta}>
          <Ionicons name="time-outline" size={13} /> {formatDuration(s.durationSec)}
          {s.submittedAt ? `  ·  ${formatDateTime(s.submittedAt)}` : ""}
        </Text>
        {ungraded > 0 && (
          <Text style={styles.ungraded}>{ungraded} асуултад хариулт тодорхойгүй тул дүнд тооцогдоогүй.</Text>
        )}
      </Card>

      <View style={styles.actions}>
        <Button title="Дахин өгөх" icon="refresh" variant="secondary" loading={retaking} onPress={retake} style={{ flex: 1 }} />
        <Button title="Нүүр" icon="home" variant="ghost" onPress={() => navigation.popToTop()} style={{ flex: 1 }} />
      </View>

      <View style={styles.filters}>
        <Chip label={`Бүгд (${s.questions.length})`} selected={filter === "all"} onPress={() => setFilter("all")} />
        <Chip label={`Алдсан (${wrong + skipped})`} selected={filter === "wrong"} onPress={() => setFilter("wrong")} />
        <Chip label={`Зөв (${right})`} selected={filter === "right"} onPress={() => setFilter("right")} />
      </View>

      {shown.map(({ q, i, o }) => (
        <ReviewCard key={q.id} q={q} n={i + 1} o={o} />
      ))}
      {shown.length === 0 && <Text style={styles.none}>Энд харуулах асуулт алга.</Text>}
    </ScrollView>
  );
}

function Pill({ icon, color, value, label }: { icon: any; color: string; value: number; label: string }) {
  return (
    <View style={styles.pill}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={styles.pillValue}>{value}</Text>
      <Text style={styles.pillLabel}>{label}</Text>
    </View>
  );
}

function ReviewCard({ q, n, o }: { q: Question; n: number; o: ReturnType<typeof outcome> }) {
  const tone =
    o === "right"
      ? { fg: colors.success, bg: colors.successSoft, icon: "checkmark-circle" as const, text: "Зөв" }
      : o === "wrong"
        ? { fg: colors.danger, bg: colors.dangerSoft, icon: "close-circle" as const, text: "Буруу" }
        : o === "skipped"
          ? { fg: colors.textMuted, bg: colors.background, icon: "remove-circle" as const, text: "Хариулаагүй" }
          : { fg: colors.warning, bg: colors.warningSoft, icon: "help-circle" as const, text: "Үнэлэгдээгүй" };
  return (
    <Card style={styles.review}>
      <View style={styles.reviewHead}>
        <Text style={styles.reviewNum}>Асуулт {n}</Text>
        <View style={[styles.tag, { backgroundColor: tone.bg }]}>
          <Ionicons name={tone.icon} size={14} color={tone.fg} />
          <Text style={[styles.tagText, { color: tone.fg }]}>{tone.text}</Text>
        </View>
      </View>
      <Text style={styles.reviewPrompt}>{q.prompt}</Text>

      {q.type === "MULTIPLE_CHOICE" ? (
        q.choices.map((c) => {
          const mine = c.id === q.selectedChoiceId;
          const correct = Boolean(c.isCorrect);
          return (
            <View
              key={c.id}
              style={[styles.opt, correct && styles.optCorrect, mine && !correct && styles.optWrong]}
            >
              <Text style={[styles.optLabel, correct && { color: colors.success }, mine && !correct && { color: colors.danger }]}>{c.label}</Text>
              <Text style={styles.optText}>{c.text}</Text>
              {correct && <Ionicons name="checkmark" size={18} color={colors.success} />}
              {mine && !correct && <Ionicons name="close" size={18} color={colors.danger} />}
              {mine && <Text style={styles.mine}>Таны</Text>}
            </View>
          );
        })
      ) : (
        <View style={{ gap: spacing.xs }}>
          <Text style={styles.saLine}>
            <Text style={styles.saKey}>Таны хариулт: </Text>
            {q.answerText || "—"}
          </Text>
          {q.correctText && (
            <Text style={styles.saLine}>
              <Text style={[styles.saKey, { color: colors.success }]}>Зөв хариулт: </Text>
              {q.correctText}
            </Text>
          )}
        </View>
      )}

      {q.explanation && (
        <View style={styles.explain}>
          <Ionicons name="bulb-outline" size={16} color={colors.primary} />
          <Text style={styles.explainText}>{q.explanation}</Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl, maxWidth: 720, width: "100%", alignSelf: "center" },
  scoreCard: { alignItems: "center", paddingVertical: spacing.xxl },
  mode: { ...type.tiny, color: colors.textMuted, textTransform: "uppercase" },
  title: { ...type.h2, color: colors.textPrimary, marginTop: 4, textAlign: "center" },
  ring: {
    width: 148,
    height: 148,
    borderRadius: 74,
    borderWidth: 10,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: spacing.xl,
  },
  pct: { fontSize: 36, fontWeight: "800" },
  score: { ...type.small, color: colors.textSecondary },
  message: { ...type.h2, color: colors.textPrimary },
  pills: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  pill: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    minWidth: 84,
  },
  pillValue: { ...type.h2, color: colors.textPrimary, marginTop: 2 },
  pillLabel: { ...type.small, color: colors.textSecondary },
  meta: { ...type.small, color: colors.textMuted, marginTop: spacing.lg },
  ungraded: { ...type.small, color: colors.warning, marginTop: spacing.sm, textAlign: "center" },
  actions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
  filters: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xl, marginBottom: spacing.md, flexWrap: "wrap" },
  review: { marginBottom: spacing.md },
  reviewHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  reviewNum: { ...type.tiny, color: colors.textMuted, textTransform: "uppercase" },
  tag: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  tagText: { ...type.tiny },
  reviewPrompt: { ...type.bodyStrong, color: colors.textPrimary, marginTop: spacing.sm, marginBottom: spacing.md, lineHeight: 22 },
  opt: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 6,
  },
  optCorrect: { backgroundColor: colors.successSoft, borderColor: colors.success },
  optWrong: { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
  optLabel: { ...type.bodyStrong, color: colors.textSecondary, width: 22 },
  optText: { ...type.body, color: colors.textPrimary, flex: 1 },
  mine: { ...type.tiny, color: colors.textSecondary },
  saLine: { ...type.body, color: colors.textPrimary },
  saKey: { fontWeight: "700", color: colors.textSecondary },
  explain: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  explainText: { ...type.small, color: colors.textPrimary, flex: 1, lineHeight: 19 },
  none: { ...type.body, color: colors.textMuted, textAlign: "center", marginTop: spacing.lg },
});
