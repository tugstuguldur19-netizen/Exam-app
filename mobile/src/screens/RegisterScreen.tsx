import React, { useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { describeError } from "../api/client";
import { Button, Field } from "../components/ui";
import { colors, radius, spacing, type } from "../theme";

export default function RegisterScreen() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!name.trim()) return setError("Нэрээ оруулна уу.");
    if (!email.trim()) return setError("И-мэйл хаягаа оруулна уу.");
    if (password.length < 8) return setError("Нууц үг хамгийн багадаа 8 тэмдэгт байна.");
    setSubmitting(true);
    setError(null);
    try {
      await register(email.trim(), password, name.trim());
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Бүртгүүлэх</Text>
        <Text style={styles.subtitle}>Туршилтын тестүүд үнэгүй. Долоо хоногт 1 файл үнэгүй оруулна.</Text>

        <Field icon="person-outline" placeholder="Нэр" value={name} onChangeText={setName} accessibilityLabel="Нэр" />
        <Field
          icon="mail-outline"
          placeholder="И-мэйл"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          accessibilityLabel="И-мэйл"
        />
        <Field
          icon="lock-closed-outline"
          placeholder="Нууц үг (8+ тэмдэгт)"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={onSubmit}
          accessibilityLabel="Нууц үг"
        />

        {error && (
          <View style={styles.error}>
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Button title="Бүртгэл үүсгэх" onPress={onSubmit} loading={submitting} style={{ marginTop: spacing.sm }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, justifyContent: "center", padding: spacing.xxl, maxWidth: 480, width: "100%", alignSelf: "center" },
  title: { ...type.display, color: colors.textPrimary },
  subtitle: { ...type.body, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.xxl, lineHeight: 21 },
  error: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
    backgroundColor: colors.dangerSoft,
    padding: spacing.md,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  errorText: { ...type.small, color: colors.danger, flex: 1 },
});
