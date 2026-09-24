import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList, TabParamList } from "../navigation/types";
import { api } from "../api/client";
import { useLoad } from "../hooks/useLoad";
import { Card, EmptyState, ErrorState, IconBubble, Loader, ProgressBar, SectionTitle, StatTile } from "../components/ui";
import { HistoryRow } from "../components/HistoryRow";
import { formatDuration, WEEKDAYS_SHORT } from "../format";
import { accentForSlug, accuracyColor, colors, radius, spacing, type } from "../theme";

type Props = CompositeScreenProps<BottomTabScreenProps<TabParamList, "Progress">, NativeStackScreenProps<RootStackParamList>>;

export default function ProgressScreen({ navigation }: Props) {
  const { data, error, loading, refreshing, refresh, retry } = useLoad(async () => {
    const [stats, history] = await Promise.all([api.stats(), api.history(5)]);
    return { stats, history };
  });
  const [open, setOpen] = useState<string | null>(null);

  if (loading) return <Loader />;
  if (error || !data) return <ErrorState message={error ?? ""} onRetry={retry} />;
  const { stats, history } = data;
  const maxTests = Math.max(1, ...stats.last7Days.map((d) => d.tests));

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        <Text style={styles.h1}>Ахиц</Text>

        <View style={styles.tiles}>
          <StatTile icon="document-text" value={String(stats.testsTaken)} label="Өгсөн тест" />
          <StatTile
            icon="checkmark-done"
            value={stats.accuracy === null ? "—" : `${stats.accuracy}%`}
            label="Зөв хариулт"
            color={colors.success}
            bg={colors.successSoft}
          />
        </View>
        <View style={styles.tiles}>
          <StatTile icon="flame" value={`${stats.streakDays} өдөр`} label="Дараалал" color={colors.gold} bg={colors.goldSoft} />
          <StatTile icon="time" value={formatDuration(stats.totalTimeSec)} label="Нийт хугацаа" color={colors.warning} bg={colors.warningSoft} />
        </View>

        <SectionTitle title="Сүүлийн 7 хоног" />
        <Card>
          <View style={styles.chart}>
            {stats.last7Days.map((d) => {
              const h = (d.tests / maxTests) * 100;
              const pct = d.total ? Math.round((d.correct / d.total) * 100) : null;
              const weekday = WEEKDAYS_SHORT[new Date(`${d.date}T00:00:00Z`).getUTCDay()];
              return (
                <View key={d.date} style={styles.barCol}>
                  <Text style={styles.barValue}>{d.tests || ""}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.bar, { height: `${Math.max(h, d.tests ? 8 : 0)}%`, backgroundColor: pct === null ? colors.border : accuracyColor(pct) }]} />
                  </View>
                  <Text style={styles.barLabel}>{weekday}</Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.chartNote}>Өдөр бүр өгсөн тестийн тоо · өнгө нь зөв хариултын хувь</Text>
        </Card>

        <SectionTitle title="Хичээлээр" />
        {stats.subjects.map((s, i) => {
          const accent = accentForSlug(s.slug, i);
          const isOpen = open === s.id;
          return (
            <Card key={s.id} style={styles.subject}>
              <Pressable style={styles.subjectHead} onPress={() => setOpen(isOpen ? null : s.id)}>
                <IconBubble icon={accent.icon} fg={accent.fg} bg={accent.bg} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.subjectName}>{s.name}</Text>
                  <Text style={styles.subjectMeta}>
                    {s.stats.attempted ? `${s.stats.correct}/${s.stats.attempted} зөв` : "Одоогоор тест өгөөгүй"}
                  </Text>
                </View>
                <Text style={[styles.subjectPct, { color: accuracyColor(s.stats.accuracy) }]}>
                  {s.stats.accuracy === null ? "—" : `${s.stats.accuracy}%`}
                </Text>
                <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={18} color={colors.textMuted} />
              </Pressable>
              {s.weakestLesson && (
                <Pressable
                  style={styles.weak}
                  onPress={() => navigation.navigate("SubjectDetail", { subjectId: s.id, subjectName: s.name })}
                >
                  <Ionicons name="trending-up" size={16} color={colors.warning} />
                  <Text style={styles.weakText}>
                    Анхаарах сэдэв: <Text style={{ fontWeight: "700" }}>{s.weakestLesson.name}</Text> ({s.weakestLesson.accuracy}%)
                  </Text>
                </Pressable>
              )}
              {isOpen &&
                s.lessons.map((l) => (
                  <View key={l.id} style={styles.lessonRow}>
                    <Text style={styles.lessonName} numberOfLines={1}>
                      {l.name}
                    </Text>
                    <View style={{ width: 90 }}>
                      <ProgressBar value={l.stats.accuracy ?? 0} color={accuracyColor(l.stats.accuracy)} height={6} />
                    </View>
                    <Text style={styles.lessonPct}>{l.stats.accuracy === null ? "—" : `${l.stats.accuracy}%`}</Text>
                  </View>
                ))}
            </Card>
          );
        })}

        <SectionTitle title="Сүүлд өгсөн" action={history.length ? "Бүгд" : undefined} onAction={() => navigation.navigate("History")} />
        {history.length === 0 ? (
          <EmptyState icon="time-outline" title="Одоогоор тест өгөөгүй" text="Хичээлийн туршилтын тестээс эхлээрэй." />
        ) : (
          history.map((t) => <HistoryRow key={t.id} item={t} onPress={() => navigation.navigate("Result", { sessionId: t.id })} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl, maxWidth: 720, width: "100%", alignSelf: "center" },
  h1: { ...type.h1, color: colors.textPrimary, marginBottom: spacing.lg },
  tiles: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md },
  chart: { flexDirection: "row", gap: spacing.sm, height: 150, alignItems: "flex-end" },
  barCol: { flex: 1, alignItems: "center", height: "100%" },
  barValue: { ...type.tiny, color: colors.textSecondary, height: 16 },
  barTrack: { flex: 1, width: "70%", justifyContent: "flex-end", backgroundColor: colors.background, borderRadius: radius.sm, overflow: "hidden" },
  bar: { width: "100%", borderRadius: radius.sm },
  barLabel: { ...type.small, color: colors.textMuted, marginTop: 6 },
  chartNote: { ...type.small, color: colors.textMuted, marginTop: spacing.md, textAlign: "center" },
  subject: { marginBottom: spacing.md },
  subjectHead: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  subjectName: { ...type.bodyStrong, color: colors.textPrimary },
  subjectMeta: { ...type.small, color: colors.textSecondary, marginTop: 2 },
  subjectPct: { ...type.h2 },
  weak: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.md,
  },
  weakText: { ...type.small, color: colors.textPrimary, flex: 1 },
  lessonRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.md },
  lessonName: { ...type.small, color: colors.textPrimary, flex: 1 },
  lessonPct: { ...type.small, color: colors.textSecondary, width: 38, textAlign: "right" },
});
