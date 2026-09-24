import React, { useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { api, describeError } from "../api/client";
import { Button, Field } from "../components/ui";
import { showMessage } from "../components/dialog";
import { colors, spacing, type } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "ChangePassword">;

export default function ChangePasswordScreen({ navigation }: Props) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (next.length < 8) return setError("Шинэ нууц үг хамгийн багадаа 8 тэмдэгт байна.");
    if (next !== repeat) return setError("Шинэ нууц үг таарахгүй байна.");
    setSaving(true);
    setError(null);
    try {
      await api.changePassword(current, next);
      showMessage("Амжилттай", "Нууц үг солигдлоо.");
      navigation.goBack();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Field icon="lock-closed-outline" placeholder="Одоогийн нууц үг" secureTextEntry value={current} onChangeText={setCurrent} />
      <Field icon="key-outline" placeholder="Шинэ нууц үг (8+ тэмдэгт)" secureTextEntry value={next} onChangeText={setNext} />
      <Field icon="key-outline" placeholder="Шинэ нууц үг дахин" secureTextEntry value={repeat} onChangeText={setRepeat} onSubmitEditing={save} />
      {error && <Text style={styles.error}>{error}</Text>}
      <Button title="Хадгалах" onPress={save} loading={saving} disabled={!current || !next} style={{ marginTop: spacing.sm }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, maxWidth: 480, width: "100%", alignSelf: "center" },
  error: { ...type.small, color: colors.danger, marginBottom: spacing.sm },
});
