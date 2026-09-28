import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Switch, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { api } from "../api/client";
import { useLoad } from "../hooks/useLoad";
import { useStartTest } from "../hooks/useStartTest";
import { Badge, Button, Card, Chip, ErrorState, IconBubble, Loader, Stepper } from "../components/ui";
import { distributeQuestions } from "../distribute";
import { colors, radius, spacing, type } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "MixedBuilder">;

const PRESETS = [2, 5, 10];
const AUTO_PRESETS = [20, 50, 100];

export default function MixedBuilderScreen({ route }: Props) {
  const { subjectId, subjectName } = route.params;
  const { data: subject, error, loading, retry } = useLoad(() => api.subject(subjectId), [subjectId]);
  const { start, starting } = useStartTest({ id: subjectId, name: subjectName });
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [shuffle, setShuffle] = useState(true);
  const [autoTotal, setAutoTotal] = useState("");
  const [autoNote, setAutoNote] = useState<string | null>(null);

  useEffect(() => {
    if (subject && Object.keys(counts).length === 0) {
      setCounts(Object.fromEntries(subject.lessons.map((l) => [l.id, Math.min(5, l.questionCount)])));
    }
  }, [subject]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <Loader />;
  if (error || !subject) return <ErrorState message={error ?? ""} onRetry={retry} />;

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const applyAll = (n: number | "all") => {
    setAutoNote(null);
    setCounts(Object.fromEntries(subject.lessons.map((l) => [l.id, n === "all" ? l.questionCount : Math.min(n, l.questionCount)])));
  };
  const allEqual = (n: number | "all") =>
    subject.lessons.every((l) => counts[l.id] === (n === "all" ? l.questionCount : Math.min(n, l.questionCount)));
  const available = subject.lessons.reduce((n, l) => n + l.questionCount, 0);

  // The user only gives a total; the app decides how many from each lesson.
  const autoDistribute = (raw: string | number) => {
    const total = Math.min(Number(raw) || 0, available);
    if (total <= 0) return;
    setAutoTotal(String(total));
    const result = distributeQuestions(
      total,
      subject.lessons.map((l) => ({ id: l.id, available: l.questionCount }))
    );
    setCounts(result);
    const used = Object.values(result).filter((n) => n > 0).length;
    setAutoNote(`${total} асуултыг ${used} сэдэвт хуваарилав. Доор өөрчилж болно.`);
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.lead}>
          Сэдэв бүрээс хэдэн асуулт авахаа сонгоно уу. Асуултууд тухай бүрд санамсаргүй сонгогдоно.
        </Text>

        <Card style={styles.auto}>
          <View style={styles.autoHead}>
            <IconBubble icon="sparkles" fg={colors.primary} bg={colors.white} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={styles.autoTitle}>Автоматаар хуваарилах</Text>
              <Text style={styles.autoText}>Нийт асуултын тоогоо оруулахад апп сэдэв бүрээс хэдийг авахыг өөрөө шийднэ.</Text>
            </View>
          </View>
          <View style={styles.autoRow}>
            <TextInput
              style={styles.autoInput}
              value={autoTotal}
              onChangeText={(t) => setAutoTotal(t.replace(/[^0-9]/g, ""))}
              onSubmitEditing={() => autoDistribute(autoTotal)}
              keyboardType="number-pad"
              placeholder={`Дээд тал нь ${available}`}
              placeholderTextColor={colors.textMuted}
              maxLength={3}
              accessibilityLabel="Нийт асуултын тоо"
            />
            <Button title="Хуваарилах" small onPress={() => autoDistribute(autoTotal)} disabled={!Number(autoTotal) || available === 0} />
          </View>
          <View style={styles.chips}>
            {AUTO_PRESETS.filter((n) => n < available).map((n) => (
              <Chip key={n} label={`${n} асуулт`} selected={autoTotal === String(n)} onPress={() => autoDistribute(n)} />
            ))}
            {available > 0 && (
              <Chip label={`Бүгд (${available})`} selected={autoTotal === String(available)} onPress={() => autoDistribute(available)} />
            )}
          </View>
          {autoNote && <Text style={styles.autoNote}>{autoNote}</Text>}
        </Card>

        <Text style={styles.label}>Эсвэл сэдэв бүрт нэг дор</Text>
        <View style={styles.chips}>
          {PRESETS.map((n) => (
            <Chip key={n} label={`${n}-г`} selected={allEqual(n)} onPress={() => applyAll(n)} />
          ))}
          <Chip label="Бүгдийг" selected={allEqual("all")} onPress={() => applyAll("all")} />
          <Chip label="Цэвэрлэх" selected={total === 0} onPress={() => applyAll(0)} />
        </View>

        {subject.lessons.map((l) => (
          <Card key={l.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.lessonName}>{l.name}</Text>
              <Text style={styles.lessonMeta}>{l.questionCount > 0 ? `Нийт ${l.questionCount} асуулт` : "Асуулт удахгүй нэмэгдэнэ"}</Text>
            </View>
            {l.questionCount > 0 ? (
              <Stepper
                value={counts[l.id] ?? 0}
                max={l.questionCount}
                onChange={(v) => {
                  setAutoNote(null);
                  setCounts((c) => ({ ...c, [l.id]: v }));
                }}
              />
            ) : (
              <Badge text="Удахгүй" color={colors.textMuted} bg={colors.background} />
            )}
          </Card>
        ))}

        <Card style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.lessonName}>Асуултуудыг холих</Text>
            <Text style={styles.lessonMeta}>{shuffle ? "Сэдвүүд холилдож гарна" : "Сэдвээр нь дарааллаар гарна"}</Text>
          </View>
          <Switch
            value={shuffle}
            onValueChange={setShuffle}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor={colors.white}
          />
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <View>
          <Text style={styles.totalLabel}>Нийт</Text>
          <Text style={styles.total}>{total} асуулт</Text>
        </View>
        <Button
          title="Эхлүүлэх"
          icon="play"
          disabled={total === 0}
          loading={Boolean(starting)}
          style={{ flex: 1 }}
          onPress={() =>
            start({
              mode: "MIXED",
              subjectId,
              shuffle,
              lessons: subject.lessons.map((l) => ({ lessonId: l.id, count: counts[l.id] ?? 0 })).filter((l) => l.count > 0),
            })
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl, maxWidth: 720, width: "100%", alignSelf: "center" },
  lead: { ...type.body, color: colors.textSecondary, lineHeight: 21 },
  label: { ...type.tiny, color: colors.textMuted, marginTop: spacing.xl, marginBottom: spacing.sm, textTransform: "uppercase" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg },
  auto: { backgroundColor: colors.primarySoft, borderColor: "#C7D2FE", marginTop: spacing.lg },
  autoHead: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  autoTitle: { ...type.bodyStrong, color: colors.textPrimary },
  autoText: { ...type.small, color: colors.textSecondary, marginTop: 2, lineHeight: 18 },
  autoRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.md },
  autoInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    fontSize: 16,
    color: colors.textPrimary,
  },
  autoNote: { ...type.small, color: colors.primary, fontWeight: "600", marginTop: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md, padding: spacing.md },
  lessonName: { ...type.bodyStrong, color: colors.textPrimary },
  lessonMeta: { ...type.small, color: colors.textSecondary, marginTop: 2 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  totalLabel: { ...type.small, color: colors.textSecondary },
  total: { ...type.h2, color: colors.textPrimary },
});
