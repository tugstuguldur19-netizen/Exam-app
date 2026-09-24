import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, Modal, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { api } from "../api/client";
import { useLoad } from "../hooks/useLoad";
import { useStartTest } from "../hooks/useStartTest";
import { Badge, Button, Card, Chip, ErrorState, IconBubble, Loader, ProgressBar, SectionTitle } from "../components/ui";
import { daysLeft, formatDate, formatMNT } from "../format";
import { accentForSlug, accuracyColor, colors, IconName, radius, spacing, type } from "../theme";
import type { Lesson } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "SubjectDetail">;

export default function SubjectDetailScreen({ route, navigation }: Props) {
  const { subjectId, subjectName } = route.params;
  const { data: subject, error, loading, refreshing, refresh, retry } = useLoad(() => api.subject(subjectId), [subjectId]);
  const { start, starting } = useStartTest({ id: subjectId, name: subjectName });
  const [lessonPick, setLessonPick] = useState<Lesson | null>(null);

  if (loading) return <Loader />;
  if (error || !subject) return <ErrorState message={error ?? ""} onRetry={retry} />;

  const accent = accentForSlug(subject.slug);
  const subscribed = Boolean(subject.subscription);
  const cheapest = [...subject.plans].sort((a, b) => a.price - b.price)[0];
  const openPlans = () => navigation.navigate("Plans", { subjectId, subjectName: subject.name });

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        <View style={[styles.hero, { backgroundColor: accent.bg }]}>
          <IconBubble icon={accent.icon} fg={colors.white} bg={accent.fg} size={56} />
          <Text style={styles.heroTitle}>{subject.name}</Text>
          <Text style={styles.heroText}>{subject.description}</Text>
          <View style={styles.heroStats}>
            <HeroStat value={String(subject.lessonCount)} label="сэдэв" />
            <HeroStat value={String(subject.questionCount)} label="асуулт" />
            <HeroStat value={subject.stats.accuracy === null ? "—" : `${subject.stats.accuracy}%`} label="зөв" />
          </View>
          {subject.subscription ? (
            <Badge
              icon="checkmark-circle"
              text={`${subject.subscription.planName} эрх · ${formatDate(subject.subscription.endAt)} хүртэл (${daysLeft(subject.subscription.endAt)} хоног)`}
              color={colors.success}
              bg={colors.white}
            />
          ) : (
            <Badge icon="lock-closed" text="Туршилтын тест үнэгүй · бусад нь эрхтэй" color={colors.warning} bg={colors.white} />
          )}
        </View>

        <SectionTitle title="Тест өгөх" />
        <ModeCard
          icon="gift"
          color={colors.warning}
          bg={colors.warningSoft}
          title="Туршилтын тест"
          text={`${subject.trialQuestionCount} асуулт · сэдэв бүрээс · үнэгүй`}
          loading={starting === "TRIAL"}
          onPress={() => start({ mode: "TRIAL", subjectId })}
        />
        <ModeCard
          icon="shuffle"
          color={colors.primary}
          bg={colors.primarySoft}
          title="Холимог тест"
          text="Бүх сэдвээс өөрөө тоогоо сонгож холимог тест үүсгэнэ"
          locked={!subscribed}
          onPress={() => (subscribed ? navigation.navigate("MixedBuilder", { subjectId, subjectName: subject.name }) : openPlans())}
        />
        <ModeCard
          icon="refresh-circle"
          color={colors.danger}
          bg={colors.dangerSoft}
          title="Алдаагаа засах"
          text={subject.mistakeCount > 0 ? `${subject.mistakeCount} алдсан асуултаа дахин ажиллана` : "Одоогоор алдсан асуулт алга"}
          locked={!subscribed}
          disabled={subscribed && subject.mistakeCount === 0}
          loading={starting === "MISTAKES"}
          onPress={() => (subscribed ? start({ mode: "MISTAKES", subjectId }) : openPlans())}
        />

        <SectionTitle title="Сэдвүүд" />
        {subject.lessons.map((l, i) => (
          <Card key={l.id} style={styles.lesson} onPress={() => (subscribed ? setLessonPick(l) : openPlans())}>
            <View style={styles.lessonNum}>
              <Text style={styles.lessonNumText}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.lessonName}>{l.name}</Text>
              <Text style={styles.lessonMeta} numberOfLines={2}>
                {l.questionCount} асуулт{l.description ? ` · ${l.description}` : ""}
              </Text>
              {l.stats.attempted > 0 && (
                <View style={styles.lessonProgress}>
                  <View style={{ flex: 1 }}>
                    <ProgressBar value={l.stats.accuracy ?? 0} color={accuracyColor(l.stats.accuracy)} height={5} />
                  </View>
                  <Text style={[styles.lessonPct, { color: accuracyColor(l.stats.accuracy) }]}>{l.stats.accuracy}%</Text>
                </View>
              )}
            </View>
            <Ionicons
              name={subscribed ? "play-circle" : "lock-closed"}
              size={subscribed ? 30 : 20}
              color={subscribed ? colors.primary : colors.textMuted}
            />
          </Card>
        ))}

        {!subscribed && cheapest && (
          <Card style={styles.cta}>
            <Text style={styles.ctaTitle}>Бүх тестийг нээх</Text>
            <Text style={styles.ctaText}>
              Сэдвийн тест, холимог тест, алдаа засах горим болон файлаа хязгааргүй оруулах эрх.
            </Text>
            <Button title={`${formatMNT(cheapest.price)}-с эхэлнэ`} icon="sparkles" onPress={openPlans} style={{ marginTop: spacing.md }} />
          </Card>
        )}
      </ScrollView>

      <LessonSheet
        lesson={lessonPick}
        loading={starting === "LESSON"}
        onClose={() => setLessonPick(null)}
        onStart={async (count) => {
          const lesson = lessonPick!;
          setLessonPick(null);
          await start({ mode: "LESSON", lessonId: lesson.id, count }, "LESSON");
        }}
      />
    </View>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.heroStat}>
      <Text style={styles.heroStatValue}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

function ModeCard(props: {
  icon: IconName;
  color: string;
  bg: string;
  title: string;
  text: string;
  locked?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <Card style={[styles.mode, props.disabled && { opacity: 0.55 }]} onPress={props.disabled || props.loading ? undefined : props.onPress}>
      <IconBubble icon={props.icon} fg={props.color} bg={props.bg} />
      <View style={{ flex: 1 }}>
        <Text style={styles.modeTitle}>{props.title}</Text>
        <Text style={styles.modeText}>{props.text}</Text>
      </View>
      {props.loading ? (
        <Text style={styles.modeLoading}>…</Text>
      ) : (
        <Ionicons name={props.locked ? "lock-closed" : "chevron-forward"} size={20} color={colors.textMuted} />
      )}
    </Card>
  );
}

function LessonSheet({
  lesson,
  loading,
  onClose,
  onStart,
}: {
  lesson: Lesson | null;
  loading: boolean;
  onClose: () => void;
  onStart: (count: number | undefined) => void;
}) {
  const [count, setCount] = useState<number | undefined>(10);
  if (!lesson) return null;
  const options = [5, 10, 20].filter((n) => n < lesson.questionCount);
  const selected = count !== undefined && count < lesson.questionCount ? count : undefined;
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{lesson.name}</Text>
          <Text style={styles.sheetText}>Хэдэн асуулт ажиллах вэ? Асуултууд санамсаргүй дарааллаар гарна.</Text>
          <View style={styles.chips}>
            {options.map((n) => (
              <Chip key={n} label={`${n} асуулт`} selected={selected === n} onPress={() => setCount(n)} />
            ))}
            <Chip label={`Бүгд (${lesson.questionCount})`} selected={selected === undefined} onPress={() => setCount(undefined)} />
          </View>
          <Button title="Тест эхлүүлэх" icon="play" loading={loading} onPress={() => onStart(selected)} style={{ marginTop: spacing.xl }} />
          <Button title="Болих" variant="ghost" onPress={onClose} style={{ marginTop: spacing.sm }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl, maxWidth: 720, width: "100%", alignSelf: "center" },
  hero: { borderRadius: radius.lg, padding: spacing.xl, gap: spacing.sm },
  heroTitle: { ...type.h1, color: colors.textPrimary, marginTop: spacing.sm },
  heroText: { ...type.body, color: colors.textSecondary, lineHeight: 21 },
  heroStats: { flexDirection: "row", gap: spacing.sm, marginVertical: spacing.sm },
  heroStat: { flex: 1, backgroundColor: "rgba(255,255,255,0.75)", borderRadius: radius.sm, padding: spacing.sm, alignItems: "center" },
  heroStatValue: { ...type.h2, color: colors.textPrimary },
  heroStatLabel: { ...type.small, color: colors.textSecondary },
  mode: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md },
  modeTitle: { ...type.bodyStrong, color: colors.textPrimary },
  modeText: { ...type.small, color: colors.textSecondary, marginTop: 2 },
  modeLoading: { ...type.h2, color: colors.primary },
  lesson: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md, padding: spacing.md },
  lessonNum: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  lessonNumText: { ...type.bodyStrong, color: colors.primary },
  lessonName: { ...type.bodyStrong, color: colors.textPrimary },
  lessonMeta: { ...type.small, color: colors.textSecondary, marginTop: 2 },
  lessonProgress: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
  lessonPct: { ...type.tiny, minWidth: 32, textAlign: "right" },
  cta: { marginTop: spacing.lg, backgroundColor: colors.primarySoft, borderColor: colors.primarySoft },
  ctaTitle: { ...type.h2, color: colors.textPrimary },
  ctaText: { ...type.body, color: colors.textSecondary, marginTop: spacing.xs, lineHeight: 21 },
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
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: spacing.lg },
  sheetTitle: { ...type.h1, color: colors.textPrimary },
  sheetText: { ...type.body, color: colors.textSecondary, marginTop: spacing.xs, lineHeight: 21 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.lg },
});
