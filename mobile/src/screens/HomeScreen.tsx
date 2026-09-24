import React from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList, TabParamList } from "../navigation/types";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { useLoad } from "../hooks/useLoad";
import { Badge, Card, ErrorState, IconBubble, Loader, ProgressBar, SectionTitle } from "../components/ui";
import { daysLeft, greeting } from "../format";
import { accentForSlug, accuracyColor, colors, radius, spacing, type, shadowStrong } from "../theme";
import type { Subject } from "../types";

type Props = CompositeScreenProps<BottomTabScreenProps<TabParamList, "Home">, NativeStackScreenProps<RootStackParamList>>;

export default function HomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { data, error, loading, refreshing, refresh, retry } = useLoad(async () => {
    const [subjects, stats] = await Promise.all([api.subjects(), api.stats()]);
    return { subjects, stats };
  });

  if (loading) return <Loader />;
  if (error || !data) return <ErrorState message={error ?? ""} onRetry={retry} />;
  const { subjects, stats } = data;
  const firstName = user?.name?.split(" ")[0] || "";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{greeting()}{firstName ? "," : ""}</Text>
            <Text style={styles.name} numberOfLines={1}>
              {firstName || "Сурагч"} 👋
            </Text>
          </View>
          <View style={[styles.streak, stats.activeToday && styles.streakActive]}>
            <Ionicons name="flame" size={18} color={stats.streakDays > 0 ? colors.gold : colors.textMuted} />
            <Text style={styles.streakText}>{stats.streakDays}</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroTitle}>
            {stats.testsTaken === 0
              ? "Эхний тестээ өгөөд үзээрэй!"
              : stats.activeToday
                ? "Өнөөдөр сайн ажиллалаа!"
                : "Өнөөдрийн тестээ өгөх үү?"}
          </Text>
          <Text style={styles.heroText}>
            {stats.testsTaken === 0
              ? "Хичээл бүрт үнэгүй туршилтын тест бий."
              : `${stats.testsTaken} тест · ${stats.accuracy ?? 0}% зөв · ${stats.streakDays} өдөр дараалан`}
          </Text>
          <View style={styles.heroRow}>
            {stats.last7Days.map((d) => (
              <View key={d.date} style={[styles.heroDot, d.tests > 0 && styles.heroDotOn]} />
            ))}
          </View>
        </View>

        <Card style={styles.uploadCard} onPress={() => navigation.navigate("Uploads")}>
          <IconBubble icon="cloud-upload" fg={colors.white} bg="rgba(255,255,255,0.18)" />
          <View style={{ flex: 1 }}>
            <Text style={styles.uploadTitle}>Өөрийн тестээ оруулах</Text>
            <Text style={styles.uploadText}>Word (.docx) файлаа оруулаад шууд тест болгоно</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.white} />
        </Card>

        <SectionTitle title="Хичээлүүд" />
        {subjects.map((s, i) => (
          <SubjectCard
            key={s.id}
            subject={s}
            index={i}
            onPress={() => navigation.navigate("SubjectDetail", { subjectId: s.id, subjectName: s.name })}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function SubjectCard({ subject: s, index, onPress }: { subject: Subject; index: number; onPress: () => void }) {
  const accent = accentForSlug(s.slug, index);
  const acc = s.stats.accuracy;
  return (
    <Card style={styles.subject} onPress={onPress}>
      <View style={styles.subjectTop}>
        <IconBubble icon={accent.icon} fg={accent.fg} bg={accent.bg} size={52} />
        <View style={{ flex: 1 }}>
          <Text style={styles.subjectName}>{s.name}</Text>
          <Text style={styles.subjectMeta}>
            {s.lessonCount} сэдэв · {s.questionCount} асуулт
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </View>
      <View style={styles.subjectBadges}>
        {s.subscription ? (
          <Badge icon="checkmark-circle" text={`Идэвхтэй · ${daysLeft(s.subscription.endAt)} хоног`} color={colors.success} bg={colors.successSoft} />
        ) : (
          <Badge icon="gift-outline" text={`Туршилт үнэгүй · ${s.trialQuestionCount} асуулт`} color={colors.warning} bg={colors.warningSoft} />
        )}
      </View>
      {s.stats.attempted > 0 && (
        <View style={styles.progressRow}>
          <View style={{ flex: 1 }}>
            <ProgressBar value={acc ?? 0} color={accuracyColor(acc)} height={6} />
          </View>
          <Text style={[styles.progressText, { color: accuracyColor(acc) }]}>{acc}%</Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl, maxWidth: 720, width: "100%", alignSelf: "center" },
  header: { flexDirection: "row", alignItems: "center", marginBottom: spacing.lg },
  greeting: { ...type.body, color: colors.textSecondary },
  name: { ...type.h1, color: colors.textPrimary },
  streak: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  streakActive: { backgroundColor: colors.goldSoft, borderColor: colors.goldSoft },
  streakText: { ...type.bodyStrong, color: colors.textPrimary },
  hero: {
    backgroundColor: colors.textPrimary,
    borderRadius: radius.lg,
    padding: spacing.xl,
    ...shadowStrong,
  },
  heroTitle: { ...type.h2, color: colors.white },
  heroText: { ...type.small, color: "rgba(255,255,255,0.7)", marginTop: 4 },
  heroRow: { flexDirection: "row", gap: 6, marginTop: spacing.lg },
  heroDot: { flex: 1, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.15)" },
  heroDotOn: { backgroundColor: colors.gold },
  uploadCard: {
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  uploadTitle: { ...type.bodyStrong, color: colors.white },
  uploadText: { ...type.small, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  subject: { marginBottom: spacing.md },
  subjectTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  subjectName: { ...type.h2, color: colors.textPrimary },
  subjectMeta: { ...type.small, color: colors.textSecondary, marginTop: 2 },
  subjectBadges: { flexDirection: "row", marginTop: spacing.md },
  progressRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md },
  progressText: { ...type.small, fontWeight: "700", minWidth: 36, textAlign: "right" },
});
