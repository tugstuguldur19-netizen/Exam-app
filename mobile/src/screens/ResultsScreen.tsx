import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { api, describeError } from "../api/client";
import type { AttemptResult } from "../types";
import { colors, radius, spacing, type, shadow } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Results">;

function scoreColor(pct: number) {
  if (pct >= 70) return colors.success;
  if (pct >= 40) return "#C2540A";
  return colors.danger;
}

export default function ResultsScreen({ route, navigation }: Props) {
  const { attemptId } = route.params;
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getAttempt(attemptId)
      .then(setResult)
      .catch((err) => Alert.alert("Couldn't load results", describeError(err)))
      .finally(() => setLoading(false));
  }, [attemptId]);

  if (loading || !result) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const pct =
    result.totalPoints && result.totalPoints > 0
      ? Math.round(((result.scorePoints ?? 0) / result.totalPoints) * 100)
      : 0;
  const ringColor = scoreColor(pct);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <Text style={styles.eyebrow}>{result.examTitle}</Text>
      <Text style={styles.title}>Results</Text>

      <View style={styles.scoreCard}>
        <View style={[styles.scoreCircle, { borderColor: ringColor }]}>
          <Text style={[styles.scorePct, { color: ringColor }]}>{pct}%</Text>
        </View>
        <Text style={styles.scoreFraction}>
          {result.scorePoints} of {result.totalPoints} correct
        </Text>
        <Text style={styles.scoreSub}>Graded questions only — ungraded questions aren't counted.</Text>
      </View>

      {result.responses.map((r, idx) => {
        const isUngraded = r.isCorrect === null;
        const isCorrect = r.isCorrect === true;
        return (
          <View
            key={r.questionId}
            style={[
              styles.card,
              isCorrect && styles.cardCorrect,
              r.isCorrect === false && styles.cardWrong,
            ]}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.prompt}>
                {idx + 1}. {r.prompt}
              </Text>
              {isUngraded ? (
                <View style={[styles.verdictBadge, { backgroundColor: colors.background }]}>
                  <Ionicons name="help-circle" size={14} color={colors.textMuted} />
                </View>
              ) : (
                <View style={[styles.verdictBadge, { backgroundColor: isCorrect ? colors.successSoft : colors.dangerSoft }]}>
                  <Ionicons
                    name={isCorrect ? "checkmark" : "close"}
                    size={14}
                    color={isCorrect ? colors.success : colors.danger}
                  />
                </View>
              )}
            </View>

            {r.type === "MULTIPLE_CHOICE" ? (
              <>
                <Text style={styles.answerLine}>Your answer: {r.yourChoiceLabel ?? "(none)"}</Text>
                {r.isCorrect === false && <Text style={styles.correctLine}>Correct: {r.correctChoiceLabel}</Text>}
              </>
            ) : (
              <>
                <Text style={styles.answerLine}>Your answer: {r.yourAnswerText || "(none)"}</Text>
                {r.isCorrect === false && <Text style={styles.correctLine}>Expected: {r.correctText}</Text>}
              </>
            )}
            <Text
              style={[
                styles.verdictText,
                isCorrect && { color: colors.success },
                r.isCorrect === false && { color: colors.danger },
                isUngraded && { color: colors.textMuted },
              ]}
            >
              {isUngraded ? "Ungraded" : isCorrect ? "Correct" : "Incorrect"}
            </Text>
          </View>
        );
      })}

      <Pressable
        style={({ pressed }) => [styles.doneButton, pressed && styles.doneButtonPressed]}
        onPress={() => navigation.popToTop()}
        accessibilityRole="button"
        accessibilityLabel="Back to subjects"
      >
        <Text style={styles.doneButtonText}>Back to subjects</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  eyebrow: { ...type.small, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.6 },
  title: { ...type.h1, color: colors.textPrimary, marginBottom: spacing.lg, marginTop: 2 },
  scoreCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, marginBottom: spacing.lg, alignItems: "center", ...shadow },
  scoreCircle: {
    width: 104,
    height: 104,
    borderRadius: radius.pill,
    borderWidth: 6,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  scorePct: { fontSize: 26, fontWeight: "800" },
  scoreFraction: { ...type.bodyStrong, color: colors.textPrimary },
  scoreSub: { ...type.small, color: colors.textMuted, marginTop: spacing.xs, fontWeight: "400", textAlign: "center" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardCorrect: { borderColor: "#BEEBDA" },
  cardWrong: { borderColor: "#F6C6C8" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.sm },
  verdictBadge: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.sm,
  },
  prompt: { ...type.bodyStrong, color: colors.textPrimary, flex: 1, lineHeight: 20 },
  answerLine: { ...type.body, color: colors.textSecondary, marginBottom: 4 },
  correctLine: { ...type.body, color: colors.success, marginBottom: 4, fontWeight: "600" },
  verdictText: { ...type.small, marginTop: spacing.xs },
  doneButton: { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md, alignItems: "center", marginVertical: spacing.xxl, ...shadow },
  doneButtonPressed: { backgroundColor: colors.primaryDark },
  doneButtonText: { color: colors.white, fontWeight: "700", fontSize: 16 },
});
