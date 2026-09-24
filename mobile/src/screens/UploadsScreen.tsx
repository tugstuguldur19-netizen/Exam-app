import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList, TabParamList } from "../navigation/types";
import { api, ApiError, describeError } from "../api/client";
import { useLoad } from "../hooks/useLoad";
import { useStartTest } from "../hooks/useStartTest";
import { Badge, Button, Card, EmptyState, ErrorState, IconBubble, Loader, SectionTitle } from "../components/ui";
import { confirm, showMessage } from "../components/dialog";
import { formatDate, formatUntil } from "../format";
import { accuracyColor, colors, radius, spacing, type } from "../theme";
import type { UploadQuota } from "../types";

type Props = CompositeScreenProps<BottomTabScreenProps<TabParamList, "Uploads">, NativeStackScreenProps<RootStackParamList>>;

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export default function UploadsScreen({ navigation }: Props) {
  const { data, error, loading, refreshing, refresh, retry, setData } = useLoad(async () => {
    const [uploads, quota] = await Promise.all([api.uploads(), api.uploadQuota()]);
    return { uploads, quota };
  });
  const [uploading, setUploading] = useState(false);
  const { start, starting } = useStartTest();

  if (loading) return <Loader />;
  if (error || !data) return <ErrorState message={error ?? ""} onRetry={retry} />;
  const { uploads, quota } = data;
  const canUpload = quota.unlimited || quota.remaining > 0;

  const offerSubscription = async (message: string) => {
    const go = await confirm("Долоо хоногийн эрх дууссан", message, { confirmText: "Хичээлүүд үзэх" });
    if (go) navigation.navigate("Home");
  };

  const pickAndUpload = async () => {
    if (!canUpload) {
      await offerSubscription(
        `Үнэгүй эрхээр ${quota.windowDays} хоногт ${quota.limit} файл оруулна. ` +
          (quota.nextAvailableAt ? `Дараагийн үнэгүй оруулалт ${formatUntil(quota.nextAvailableAt)}. ` : "") +
          "Аль нэг хичээлийн эрх авбал хязгааргүй оруулна."
      );
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({ type: DOCX_MIME, copyToCacheDirectory: true });
    if (result.canceled) return;
    const file = result.assets[0];
    if (!file.name.toLowerCase().endsWith(".docx")) {
      showMessage("Буруу файл", "Зөвхөн Word (.docx) файл оруулна уу.");
      return;
    }
    if (file.size !== undefined && file.size > MAX_UPLOAD_BYTES) {
      showMessage("Файл хэт том", `«${file.name}» ${(file.size / 1024 / 1024).toFixed(1)}MB байна. Дээд хэмжээ 15MB.`);
      return;
    }

    setUploading(true);
    try {
      const res = await api.upload({ uri: file.uri, name: file.name, mimeType: file.mimeType, webFile: file.file });
      const fresh = await api.uploads().catch(() => uploads);
      setData({ uploads: fresh, quota: res.quota });
      const warn = res.warnings.length ? `\n\nАнхааруулга:\n• ${res.warnings.slice(0, 5).join("\n• ")}` : "";
      const go = await confirm(
        "Тест бэлэн боллоо! ✅",
        `«${res.title}» — ${res.questionCount} асуулт олдлоо (${res.gradableCount} нь хариулттай).${warn}\n\nОдоо эхлүүлэх үү?`,
        { confirmText: "Эхлүүлэх", cancelText: "Дараа" }
      );
      if (go) start({ mode: "UPLOAD", uploadId: res.id });
    } catch (err) {
      if (err instanceof ApiError && err.code === "UPLOAD_LIMIT_REACHED") {
        if (err.body?.quota) setData({ uploads, quota: err.body.quota as UploadQuota });
        await offerSubscription(err.message);
      } else {
        const warnings: string[] = err instanceof ApiError && Array.isArray(err.body?.warnings) ? err.body.warnings : [];
        showMessage("Оруулж чадсангүй", describeError(err) + (warnings.length ? `\n\n• ${warnings.slice(0, 5).join("\n• ")}` : ""));
      }
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id: string, title: string) => {
    const ok = await confirm(
      "Устгах уу?",
      `«${title}» тестийг устгана.${quota.unlimited ? "" : " Устгасан ч энэ долоо хоногийн үнэгүй эрх сэргэхгүй."}`,
      { confirmText: "Устгах", destructive: true }
    );
    if (!ok) return;
    try {
      await api.deleteUpload(id);
      setData({ uploads: uploads.filter((u) => u.id !== id), quota });
    } catch (err) {
      showMessage("Алдаа", describeError(err));
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        <Text style={styles.h1}>Миний тест</Text>
        <Text style={styles.lead}>Word (.docx) файлаа оруулахад асуулт, хариултыг нь автоматаар таньж тест болгоно.</Text>

        <Card style={styles.uploadCard}>
          <View style={styles.uploadTop}>
            <IconBubble icon="cloud-upload" fg={colors.primary} bg={colors.primarySoft} size={52} />
            <View style={{ flex: 1 }}>
              <Text style={styles.uploadTitle}>Файл оруулах</Text>
              <QuotaLine quota={quota} />
            </View>
          </View>
          <Button
            title={uploading ? "Боловсруулж байна…" : "Файл сонгох"}
            icon="document-attach"
            loading={uploading}
            variant={canUpload ? "primary" : "secondary"}
            onPress={pickAndUpload}
            style={{ marginTop: spacing.lg }}
          />
          <Pressable onPress={() => navigation.navigate("UploadHelp")} style={styles.help} hitSlop={6}>
            <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
            <Text style={styles.helpText}>Файлаа хэрхэн бэлдэх вэ?</Text>
          </Pressable>
        </Card>

        <SectionTitle title={`Оруулсан тестүүд${uploads.length ? ` (${uploads.length})` : ""}`} />
        {uploads.length === 0 ? (
          <EmptyState icon="documents-outline" title="Одоогоор тест алга" text="Багшийн өгсөн эсвэл өөрийн бэлдсэн тестийн файлаа оруулаарай." />
        ) : (
          uploads.map((u) => (
            <Card key={u.id} style={styles.item}>
              <View style={styles.itemTop}>
                <IconBubble icon="document-text" fg={colors.primary} bg={colors.primarySoft} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle} numberOfLines={2}>
                    {u.title}
                  </Text>
                  <Text style={styles.itemMeta}>
                    {u.questionCount} асуулт · {formatDate(u.createdAt)}
                  </Text>
                </View>
                <Pressable onPress={() => remove(u.id, u.title)} hitSlop={10} accessibilityLabel="Устгах">
                  <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
                </Pressable>
              </View>
              <View style={styles.itemBottom}>
                {u.lastResult ? (
                  <Badge
                    icon="trophy-outline"
                    text={`Сүүлд: ${u.lastResult.percent ?? 0}%`}
                    color={accuracyColor(u.lastResult.percent)}
                    bg={colors.background}
                  />
                ) : (
                  <Badge text="Шинэ" />
                )}
                {u.warnings.length > 0 && <Badge icon="warning-outline" text={`${u.warnings.length} анхааруулга`} color={colors.warning} bg={colors.warningSoft} />}
                <View style={{ flex: 1 }} />
                <Button
                  small
                  title={u.lastResult ? "Дахин өгөх" : "Эхлүүлэх"}
                  icon="play"
                  loading={starting === u.id}
                  onPress={() => start({ mode: "UPLOAD", uploadId: u.id }, u.id)}
                />
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function QuotaLine({ quota }: { quota: UploadQuota }) {
  if (quota.unlimited) {
    return <Text style={[styles.quota, { color: colors.success }]}>Хязгааргүй — таны эрх идэвхтэй ✨</Text>;
  }
  if (quota.remaining > 0) {
    return (
      <Text style={styles.quota}>
        Энэ {quota.windowDays} хоногт <Text style={{ fontWeight: "700", color: colors.textPrimary }}>{quota.remaining}</Text> үнэгүй
        оруулалт үлдсэн
      </Text>
    );
  }
  return (
    <Text style={[styles.quota, { color: colors.warning }]}>
      Үнэгүй эрх дууссан{quota.nextAvailableAt ? ` · ${formatUntil(quota.nextAvailableAt)} сэргэнэ` : ""}. Хичээлийн эрх авбал хязгааргүй.
    </Text>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl, maxWidth: 720, width: "100%", alignSelf: "center" },
  h1: { ...type.h1, color: colors.textPrimary },
  lead: { ...type.body, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.lg, lineHeight: 21 },
  uploadCard: { borderStyle: "dashed", borderWidth: 2, borderColor: "#C7D2FE" },
  uploadTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  uploadTitle: { ...type.h2, color: colors.textPrimary },
  quota: { ...type.small, color: colors.textSecondary, marginTop: 2, lineHeight: 18 },
  help: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, marginTop: spacing.md },
  helpText: { ...type.small, color: colors.primary, fontWeight: "600" },
  item: { marginBottom: spacing.md },
  itemTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  itemTitle: { ...type.bodyStrong, color: colors.textPrimary },
  itemMeta: { ...type.small, color: colors.textSecondary, marginTop: 2 },
  itemBottom: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md, flexWrap: "wrap" },
  badgeRow: { borderRadius: radius.pill },
});
