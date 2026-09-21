import React, { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as DocumentPicker from "expo-document-picker";
import type { RootStackParamList } from "../navigation/types";
import { api, ApiError } from "../api/client";
import type { ExamSummary } from "../types";

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
      Alert.alert("Couldn't load exams", err instanceof ApiError ? err.message : "Check your connection");
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
        err instanceof ApiError ? err.message + (err.body?.warnings ? `\n${err.body.warnings.join("\n")}` : "") : "Something went wrong"
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
      Alert.alert("Couldn't start exam", err instanceof ApiError ? err.message : "Something went wrong");
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={exams}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.title}>{subjectName}</Text>
            <Pressable style={styles.uploadButton} onPress={onUpload} disabled={uploading}>
              {uploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.uploadButtonText}>Upload .docx exam</Text>
              )}
            </Pressable>
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>No exams yet. Upload a .docx file to get started.</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => onTakeExam(item)}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardMeta}>{item.questionCount} questions</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f8fa" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 12 },
  uploadButton: { backgroundColor: "#2563eb", borderRadius: 8, padding: 12, alignItems: "center" },
  uploadButtonText: { color: "#fff", fontWeight: "600" },
  empty: { textAlign: "center", color: "#667085", marginTop: 40 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  cardMeta: { color: "#667085", marginTop: 4 },
});
