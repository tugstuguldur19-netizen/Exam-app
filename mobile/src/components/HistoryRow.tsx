import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card, IconBubble } from "./ui";
import { formatDateTime, formatDuration, MODE_LABELS } from "../format";
import { accuracyColor, colors, IconName, spacing, type } from "../theme";
import type { TestSummary } from "../types";

const MODE_ICONS: Record<string, IconName> = {
  TRIAL: "gift-outline",
  LESSON: "book-outline",
  MIXED: "shuffle",
  MISTAKES: "refresh-circle-outline",
  UPLOAD: "document-text-outline",
};

export function HistoryRow({ item, onPress }: { item: TestSummary; onPress: () => void }) {
  const color = accuracyColor(item.percent);
  return (
    <Card style={styles.row} onPress={onPress}>
      <IconBubble icon={MODE_ICONS[item.mode] ?? "document-outline"} fg={colors.primary} bg={colors.primarySoft} size={40} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {MODE_LABELS[item.mode]} · {item.submittedAt ? formatDateTime(item.submittedAt) : ""} · {formatDuration(item.durationSec)}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={[styles.pct, { color }]}>{item.percent === null ? "—" : `${item.percent}%`}</Text>
        <Text style={styles.score}>
          {item.scorePoints ?? 0}/{item.totalPoints ?? 0}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.sm, padding: spacing.md },
  title: { ...type.bodyStrong, color: colors.textPrimary },
  meta: { ...type.small, color: colors.textSecondary, marginTop: 2 },
  pct: { ...type.h2 },
  score: { ...type.small, color: colors.textMuted },
});
