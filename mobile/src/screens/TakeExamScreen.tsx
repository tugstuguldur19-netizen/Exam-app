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
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { api, ApiError } from "../api/client";
import type { ExamDetail } from "../types";

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
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.title}>{exam.title}</Text>
        {exam.questions.map((q, idx) => (
          <View key={q.id} style={styles.card}>
            <Text style={styles.prompt}>
              {idx + 1}. {q.prompt}
            </Text>
            {q.type === "MULTIPLE_CHOICE" ? (
              q.choices.map((c) => {
                const selected = choiceAnswers[q.id] === c.id;
                return (
                  <Pressable
                    key={c.id}
                    style={[styles.choice, selected && styles.choiceSelected]}
                    onPress={() => setChoiceAnswers((prev) => ({ ...prev, [q.id]: c.id }))}
                  >
                    <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>
                      {c.label}. {c.text}
                    </Text>
                  </Pressable>
                );
              })
            ) : (
              <TextInput
                style={styles.textInput}
                placeholder="Your answer"
                multiline
                value={textAnswers[q.id] ?? ""}
                onChangeText={(text) => setTextAnswers((prev) => ({ ...prev, [q.id]: text }))}
              />
            )}
          </View>
        ))}
        <Pressable style={styles.submitButton} onPress={onSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Submit exam</Text>}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f8fa" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  prompt: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
  choice: { borderWidth: 1, borderColor: "#d0d5dd", borderRadius: 8, padding: 10, marginBottom: 8 },
  choiceSelected: { backgroundColor: "#eef2ff", borderColor: "#2563eb" },
  choiceText: { fontSize: 15 },
  choiceTextSelected: { color: "#2563eb", fontWeight: "600" },
  textInput: {
    borderWidth: 1,
    borderColor: "#d0d5dd",
    borderRadius: 8,
    padding: 10,
    minHeight: 80,
    textAlignVertical: "top",
  },
  submitButton: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 40,
  },
  submitButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
