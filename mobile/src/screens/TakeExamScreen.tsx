import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { api, ApiError } from "../api/client";
import type { ExamDetail } from "../types";
import { colors, radius, spacing, type, shadow } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "TakeExam">;

export default function TakeExamScreen({ route, navigation }: Props) {
  const { examId } = route.params;
  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [choiceAnswers, setChoiceAnswers] = useState<Record<string, string>>({});
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .getExam(examId)
      .then(setExam)
      .catch((err) => Alert.alert("Couldn't load exam", err instanceof ApiError ? err.message : "Error"))
      .finally(() => setLoading(false));
  }, [examId]);

  const answeredCount = exam
    ? exam.questions.filter((q) => choiceAnswers[q.id] || textAnswers[q.id]?.trim()).length
    : 0;
  const progress = exam && exam.questions.length > 0 ? answeredCount / exam.questions.length : 0;

  const onSubmit = async () => {
    if (!exam) return;
    const unanswered = exam.questions.filter(
      (q) => !choiceAnswers[q.id] && !textAnswers[q.id]?.trim()
    );
    if (unanswered.length > 0) {
      const proceed = await new Promise<boolean>((resolve) =>
        Alert.alert(
          "Unanswered questions",
          `You haven't answered ${unanswered.length} question(s). Submit anyway?`,
          [
            { text: "Keep working", onPress: () => resolve(false), style: "cancel" },
            { text: "Submit", onPress: () => resolve(true) },
          ]
        )
      );
      if (!proceed) return;
    }

    setSubmitting(true);
    try {
      const attempt = await api.startAttempt(examId);
      const answers = exam.questions.map((q) => ({
        questionId: q.id,
        choiceId: choiceAnswers[q.id],
        answerText: textAnswers[q.id],
      }));
      await api.submitAttempt(attempt.attemptId, answers);
      navigation.replace("Results", { attemptId: attempt.attemptId });
    } catch (err) {
      Alert.alert("Couldn't submit", err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !exam) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{exam.title}</Text>
          <View style={styles.progressPill}>
            <Text style={styles.progressPillText}>
              {answeredCount}/{exam.questions.length}
            </Text>
          </View>
        </View>

        {exam.questions.map((q, idx) => {
          const answered = Boolean(choiceAnswers[q.id] || textAnswers[q.id]?.trim());
          return (
            <View key={q.id} style={styles.card}>
              <View style={styles.promptRow}>
                <View style={[styles.numberBadge, answered && styles.numberBadgeDone]}>
                  {answered ? (
                    <Ionicons name="checkmark" size={14} color={colors.white} />
                  ) : (
                    <Text style={styles.numberBadgeText}>{idx + 1}</Text>
                  )}
                </View>
                <Text style={styles.prompt}>{q.prompt}</Text>
              </View>

              {q.type === "MULTIPLE_CHOICE" ? (
                <View style={{ gap: spacing.sm }}>
                  {q.choices.map((c) => {
                    const selected = choiceAnswers[q.id] === c.id;
                    return (
                      <Pressable
                        key={c.id}
                        style={[styles.choice, selected && styles.choiceSelected]}
                        onPress={() => setChoiceAnswers((prev) => ({ ...prev, [q.id]: c.id }))}
                      >
                        <View style={[styles.radio, selected && styles.radioSelected]}>
                          {selected && <View style={styles.radioDot} />}
                        </View>
                        <Text style={styles.choiceLabel}>{c.label}</Text>
                        <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{c.text}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <TextInput
                  style={styles.textInput}
                  placeholder="Your answer"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  value={textAnswers[q.id] ?? ""}
                  onChangeText={(text) => setTextAnswers((prev) => ({ ...prev, [q.id]: text }))}
                />
              )}
            </View>
          );
        })}

        <Pressable style={({ pressed }) => [styles.submitButton, pressed && styles.submitButtonPressed]} onPress={onSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.submitButtonText}>Submit exam</Text>}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  progressBar: { height: 4, backgroundColor: colors.border },
  progressFill: { height: 4, backgroundColor: colors.primary },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg },
  title: { ...type.h1, color: colors.textPrimary, flex: 1, marginRight: spacing.sm },
  progressPill: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingVertical: 5, paddingHorizontal: spacing.md },
  progressPillText: { ...type.small, color: colors.primary },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow,
  },
  promptRow: { flexDirection: "row", marginBottom: spacing.md },
  numberBadge: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
    marginTop: 1,
  },
  numberBadgeDone: { backgroundColor: colors.success, borderColor: colors.success },
  numberBadgeText: { ...type.tiny, color: colors.textSecondary },
  prompt: { ...type.bodyStrong, color: colors.textPrimary, flex: 1, lineHeight: 21 },
  choice: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  choiceSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  radio: {
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  radioSelected: { borderColor: colors.primary },
  radioDot: { width: 9, height: 9, borderRadius: radius.pill, backgroundColor: colors.primary },
  choiceLabel: { ...type.small, color: colors.textMuted, marginRight: spacing.sm },
  choiceText: { ...type.body, color: colors.textPrimary, flex: 1 },
  choiceTextSelected: { color: colors.primaryDark, fontWeight: "600" },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 88,
    textAlignVertical: "top",
    fontSize: 15,
    color: colors.textPrimary,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.xxxl,
    ...shadow,
  },
  submitButtonPressed: { backgroundColor: colors.primaryDark },
  submitButtonText: { color: colors.white, fontWeight: "700", fontSize: 16 },
});
