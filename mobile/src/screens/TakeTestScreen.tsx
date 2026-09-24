import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { api, describeError } from "../api/client";
import { useLoad } from "../hooks/useLoad";
import { Button, ErrorState, Loader, ProgressBar } from "../components/ui";
import { confirm, showMessage } from "../components/dialog";
import { formatClock } from "../format";
import { colors, radius, shadow, spacing, type } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "TakeTest">;
type Answer = { choiceId?: string; answerText?: string };

export default function TakeTestScreen({ route, navigation }: Props) {
  const { sessionId } = route.params;
  const { data: session, error, loading, retry } = useLoad(() => api.test(sessionId), [sessionId]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [elapsed, setElapsed] = useState(0);
  const [gridOpen, setGridOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const done = useRef(false);
  const scrollRef = useRef<ScrollView>(null);

  // Already submitted (e.g. reopened from history) → show the result instead.
  useEffect(() => {
    if (session?.status === "SUBMITTED") {
      done.current = true;
      navigation.replace("Result", { sessionId });
    }
  }, [session, navigation, sessionId]);

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.timer}>
          <Ionicons name="time-outline" size={15} color={colors.primary} />
          <Text style={styles.timerText}>{formatClock(elapsed)}</Text>
        </View>
      ),
    });
  }, [navigation, elapsed]);

  const answeredCount = session ? session.questions.filter((q) => isAnswered(answers[q.id])).length : 0;

  // Leaving mid-test loses the answers — ask first.
  useEffect(() => {
    return navigation.addListener("beforeRemove", (e) => {
      if (done.current || answeredCount === 0) return;
      e.preventDefault();
      confirm("Тестээс гарах уу?", "Таны хариултууд хадгалагдахгүй.", { confirmText: "Гарах", destructive: true }).then((ok) => {
        if (ok) {
          done.current = true;
          navigation.dispatch(e.data.action);
        }
      });
    });
  }, [navigation, answeredCount]);

  const goTo = useCallback((i: number) => {
    setIndex(i);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  if (loading || session?.status === "SUBMITTED") return <Loader />;
  if (error || !session) return <ErrorState message={error ?? ""} onRetry={retry} />;

  const questions = session.questions;
  const q = questions[index];
  const total = questions.length;
  const isLast = index === total - 1;
  const answer = answers[q.id];

  const setAnswer = (a: Answer) => setAnswers((prev) => ({ ...prev, [q.id]: a }));
  const toggleFlag = () =>
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(q.id)) next.delete(q.id);
      else next.add(q.id);
      return next;
    });

  const submit = async () => {
    const unanswered = total - answeredCount;
    const ok = await confirm(
      "Тестээ дуусгах уу?",
      unanswered > 0
        ? `${unanswered} асуултад хариулаагүй байна. Хариулаагүй асуулт бурууд тооцогдоно.`
        : "Бүх асуултад хариулсан байна. Дүнгээ харах уу?",
      { confirmText: "Дуусгах" }
    );
    if (!ok) return;
    setGridOpen(false);
    setSubmitting(true);
    try {
      await api.submitTest(
        session.id,
        questions.map((qq) => ({
          questionId: qq.id,
          choiceId: answers[qq.id]?.choiceId ?? null,
          answerText: answers[qq.id]?.answerText ?? null,
        })),
        elapsed
      );
      done.current = true;
      navigation.replace("Result", { sessionId: session.id, justSubmitted: true });
    } catch (err) {
      showMessage("Илгээж чадсангүй", describeError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.top}>
          <View style={styles.topRow}>
            <Pressable onPress={() => setGridOpen(true)} style={styles.counter} accessibilityRole="button" accessibilityLabel="Бүх асуулт">
              <Ionicons name="grid-outline" size={16} color={colors.primary} />
              <Text style={styles.counterText}>
                {index + 1} / {total}
              </Text>
            </Pressable>
            <Text style={styles.answered}>{answeredCount} хариулсан</Text>
            <Pressable onPress={toggleFlag} hitSlop={8} accessibilityRole="button" accessibilityLabel="Тэмдэглэх">
              <Ionicons name={flagged.has(q.id) ? "flag" : "flag-outline"} size={22} color={flagged.has(q.id) ? colors.gold : colors.textMuted} />
            </Pressable>
          </View>
          <ProgressBar value={((index + 1) / total) * 100} height={6} />
        </View>

        <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.qLabel}>Асуулт {index + 1}</Text>
          <Text style={styles.prompt}>{q.prompt}</Text>

          {q.type === "MULTIPLE_CHOICE" ? (
            q.choices.map((c) => {
              const selected = answer?.choiceId === c.id;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setAnswer({ choiceId: selected ? undefined : c.id })}
                  style={({ pressed }) => [styles.choice, selected && styles.choiceSelected, pressed && !selected && styles.choicePressed]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                >
                  <View style={[styles.choiceLabel, selected && styles.choiceLabelSelected]}>
                    <Text style={[styles.choiceLabelText, selected && { color: colors.white }]}>{c.label}</Text>
                  </View>
                  <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{c.text}</Text>
                </Pressable>
              );
            })
          ) : (
            <TextInput
              style={styles.textAnswer}
              placeholder="Хариултаа энд бичнэ үү…"
              placeholderTextColor={colors.textMuted}
              value={answer?.answerText ?? ""}
              onChangeText={(t) => setAnswer({ answerText: t })}
              multiline
              accessibilityLabel="Хариулт"
            />
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Button title="Өмнөх" icon="chevron-back" variant="ghost" disabled={index === 0} onPress={() => goTo(index - 1)} style={{ flex: 1 }} />
          {isLast ? (
            <Button title="Дуусгах" icon="checkmark-done" variant="success" loading={submitting} onPress={submit} style={{ flex: 1.4 }} />
          ) : (
            <Button title="Дараах" onPress={() => goTo(index + 1)} style={{ flex: 1.4 }} />
          )}
        </View>
      </KeyboardAvoidingView>

      <Modal transparent visible={gridOpen} animationType="fade" onRequestClose={() => setGridOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setGridOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>Асуултууд</Text>
            <View style={styles.legend}>
              <Legend color={colors.primary} label="Хариулсан" />
              <Legend color={colors.border} label="Хариулаагүй" />
              <Legend color={colors.gold} label="Тэмдэглэсэн" />
            </View>
            <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={styles.grid}>
              {questions.map((qq, i) => {
                const a = isAnswered(answers[qq.id]);
                const f = flagged.has(qq.id);
                return (
                  <Pressable
                    key={qq.id}
                    onPress={() => {
                      setGridOpen(false);
                      goTo(i);
                    }}
                    style={[
                      styles.cell,
                      a && styles.cellAnswered,
                      f && styles.cellFlagged,
                      i === index && styles.cellCurrent,
                    ]}
                  >
                    <Text style={[styles.cellText, (a || f) && { color: colors.white }]}>{i + 1}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Button title={`Дуусгах (${answeredCount}/${total})`} icon="checkmark-done" variant="success" loading={submitting} onPress={submit} style={{ marginTop: spacing.lg }} />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function isAnswered(a: Answer | undefined) {
  return Boolean(a?.choiceId || a?.answerText?.trim());
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: color }} />
      <Text style={{ ...type.small, color: colors.textSecondary }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  timer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginRight: Platform.OS === "web" ? spacing.lg : 0,
  },
  timerText: { ...type.small, color: colors.primary, fontWeight: "700", fontVariant: ["tabular-nums"] },
  top: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.sm, gap: spacing.sm, backgroundColor: colors.surface },
  topRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  counter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  counterText: { ...type.bodyStrong, color: colors.primary },
  answered: { ...type.small, color: colors.textSecondary, flex: 1 },
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl, maxWidth: 720, width: "100%", alignSelf: "center" },
  qLabel: { ...type.tiny, color: colors.textMuted, textTransform: "uppercase" },
  prompt: { fontSize: 19, fontWeight: "700", color: colors.textPrimary, lineHeight: 27, marginTop: spacing.sm, marginBottom: spacing.xl },
  choice: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  choicePressed: { backgroundColor: colors.background },
  choiceSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft, ...shadow },
  choiceLabel: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceLabelSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  choiceLabelText: { ...type.bodyStrong, color: colors.textSecondary },
  choiceText: { ...type.body, color: colors.textPrimary, flex: 1, fontSize: 16, lineHeight: 22 },
  choiceTextSelected: { fontWeight: "600" },
  textAnswer: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    minHeight: 120,
    fontSize: 16,
    color: colors.textPrimary,
    textAlignVertical: "top",
  },
  footer: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },
  sheetTitle: { ...type.h2, color: colors.textPrimary },
  legend: { flexDirection: "row", gap: spacing.lg, marginVertical: spacing.md, flexWrap: "wrap" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  cell: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cellAnswered: { backgroundColor: colors.primary, borderColor: colors.primary },
  cellFlagged: { backgroundColor: colors.gold, borderColor: colors.gold },
  cellCurrent: { borderWidth: 3, borderColor: colors.textPrimary },
  cellText: { ...type.bodyStrong, color: colors.textSecondary },
});
