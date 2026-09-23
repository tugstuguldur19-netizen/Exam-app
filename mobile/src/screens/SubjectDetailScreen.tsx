import React, { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as DocumentPicker from "expo-document-picker";
import type { RootStackParamList } from "../navigation/types";
import { api, ApiError, describeError } from "../api/client";
import type { ExamSummary } from "../types";
import { colors, radius, spacing, type, shadow } from "../theme";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

type Props = NativeStackScreenProps<RootStackParamList, "SubjectDetail">;

export default function SubjectDetailScreen({ route, navigation }: Props) {
  const { subjectId, subjectName } = route.params;
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    try {
      setExams(await api.listExams(subjectId));
    } catch (err) {
      Alert.alert("Couldn't load exams", describeError(err));
    } finally {
      setLoading(false);
    }
  }, [subjectId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onUpload = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;

    const file = result.assets[0];
    // Matches the backend's multer limit (see backend/src/routes/exams.ts) —
    // catch it here so a large file fails instantly instead of after a
    // full upload the server was always going to reject.
    if (file.size !== undefined && file.size > MAX_UPLOAD_BYTES) {
      Alert.alert(
        "File too large",
        `"${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`
      );
      return;
    }

    setUploading(true);
    try {
      const res = await api.uploadExam(subjectId, {
        uri: file.uri,
        name: file.name,
        mimeType: file.mimeType,
        webFile: file.file,
      });
      if (res.warnings.length > 0) {
        Alert.alert(
          "Exam uploaded with warnings",
          `${res.questionCount} question(s) extracted.\n\n${res.warnings.join("\n")}`
        );
      } else {
        Alert.alert("Exam ready", `${res.questionCount} question(s) extracted.`);
      }
      await load();
    } catch (err) {
      Alert.alert(
        "Upload failed",
        describeError(err) + (err instanceof ApiError && err.body?.warnings ? `\n${err.body.warnings.join("\n")}` : "")
      );
    } finally {
      setUploading(false);
    }
  };

  const onTakeExam = async (exam: ExamSummary) => {
    try {
      await api.startAttempt(exam.id);
      navigation.navigate("TakeExam", { examId: exam.id, examTitle: exam.title });
    } catch (err) {
      Alert.alert("Couldn't start exam", describeError(err));
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={exams}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: spacing.lg }}
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.lg }}>
            <Text style={styles.eyebrow}>{subjectName}</Text>
            <Text style={styles.title}>Exams</Text>
            <Pressable
              style={({ pressed }) => [styles.uploadButton, pressed && styles.uploadButtonPressed]}
              onPress={onUpload}
              disabled={uploading}
              accessibilityRole="button"
              accessibilityLabel="Upload .docx exam"
              accessibilityState={{ disabled: uploading, busy: uploading }}
            >
              {uploading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={18} color={colors.white} />
                  <Text style={styles.uploadButtonText}>Upload .docx exam</Text>
                </>
              )}
            </Pressable>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="document-text-outline" size={28} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No exams yet</Text>
            <Text style={styles.emptyBody}>Upload a .docx file above to turn it into a gradable exam.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => onTakeExam(item)}
            accessibilityRole="button"
            accessibilityLabel={`${item.title}, ${item.questionCount} questions`}
          >
            <View style={styles.cardIcon}>
              <Ionicons name="document-text" size={20} color={colors.primary} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardMeta}>{item.questionCount} questions</Text>
              {item.warnings.length > 0 && (
                <View style={styles.warningRow}>
                  <Ionicons name="alert-circle" size={13} color="#C2540A" />
                  <Text style={styles.warningText}>
                    {item.warnings.length} question{item.warnings.length > 1 ? "s" : ""} need review
                  </Text>
                </View>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  eyebrow: { ...type.small, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.6 },
  title: { ...type.h1, color: colors.textPrimary, marginBottom: spacing.lg, marginTop: 2 },
  uploadButton: {
    flexDirection: "row",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...shadow,
  },
  uploadButtonPressed: { backgroundColor: colors.primaryDark },
  uploadButtonText: { color: colors.white, fontWeight: "700", fontSize: 15 },
  empty: { alignItems: "center", paddingTop: spacing.xxxl },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: { ...type.h2, color: colors.textPrimary, marginBottom: spacing.xs },
  emptyBody: { ...type.small, color: colors.textSecondary, fontWeight: "400", textAlign: "center", maxWidth: 240 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow,
  },
  cardPressed: { backgroundColor: colors.primarySoft },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  cardText: { flex: 1 },
  cardTitle: { ...type.bodyStrong, color: colors.textPrimary },
  cardMeta: { ...type.small, color: colors.textSecondary, marginTop: 2, fontWeight: "400" },
  warningRow: { flexDirection: "row", alignItems: "center", marginTop: 3, gap: 4 },
  warningText: { ...type.small, color: "#C2540A", fontWeight: "500" },
});
