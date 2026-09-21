import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Alert } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { api, ApiError } from "../api/client";
import type { AttemptResult } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Results">;

export default function ResultsScreen({ route, navigation }: Props) {
  const { attemptId } = route.params;
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getAttempt(attemptId)
      .then(setResult)
      .catch((err) => Alert.alert("Couldn't load results", err instanceof ApiError ? err.message : "Error"))
      .finally(() => setLoading(false));
  }, [attemptId]);

  if (loading || !result) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const pct =
    result.totalPoints && result.totalPoints > 0
      ? Math.round(((result.scorePoints ?? 0) / result.totalPoints) * 100)
      : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>{result.examTitle}</Text>
      <View style={styles.scoreCard}>
        <Text style={styles.scoreText}>
          {result.scorePoints} / {result.totalPoints} {pct !== null ? `(${pct}%)` : ""}
        </Text>
        <Text style={styles.scoreSub}>Graded questions only — ungraded questions aren't counted.</Text>
      </View>
      {result.responses.map((r, idx) => (
        <View key={r.questionId} style={[styles.card, r.isCorrect === false && styles.cardWrong, r.isCorrect === true && styles.cardRight]}>
          <Text style={styles.prompt}>
            {idx + 1}. {r.prompt}
          </Text>
          {r.type === "MULTIPLE_CHOICE" ? (
            <>
              <Text style={styles.answerLine}>Your answer: {r.yourChoiceId ?? "(none)"}</Text>
              {r.isCorrect === false && (
                <Text style={styles.correctLine}>Correct: {r.correctChoiceId}</Text>
              )}
            </>
          ) : (
            <>
              <Text style={styles.answerLine}>Your answer: {r.yourAnswerText || "(none)"}</Text>
              {r.isCorrect === false && <Text style={styles.correctLine}>Expected: {r.correctText}</Text>}
            </>
          )}
          <Text style={styles.verdict}>
            {r.isCorrect === null ? "Ungraded" : r.isCorrect ? "Correct" : "Incorrect"}
          </Text>
        </View>
      ))}
      <Pressable style={styles.doneButton} onPress={() => navigation.popToTop()}>
        <Text style={styles.doneButtonText}>Back to subjects</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f8fa" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  scoreCard: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 16, alignItems: "center" },
  scoreText: { fontSize: 28, fontWeight: "700" },
  scoreSub: { color: "#667085", marginTop: 4, fontSize: 12, textAlign: "center" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cardRight: { borderColor: "#86efac" },
  cardWrong: { borderColor: "#fca5a5" },
  prompt: { fontSize: 15, fontWeight: "600", marginBottom: 8 },
  answerLine: { color: "#344054", marginBottom: 4 },
  correctLine: { color: "#15803d", marginBottom: 4 },
  verdict: { fontWeight: "600", marginTop: 4 },
  doneButton: { backgroundColor: "#2563eb", borderRadius: 8, padding: 14, alignItems: "center", marginVertical: 24 },
  doneButtonText: { color: "#fff", fontWeight: "700" },
});
