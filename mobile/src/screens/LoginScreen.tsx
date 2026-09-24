import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { useAuth } from "../context/AuthContext";
import { describeError } from "../api/client";
import { Button, Field } from "../components/ui";
import { colors, radius, spacing, type, shadowStrong } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!email.trim() || !password) {
      setError("И-мэйл болон нууц үгээ оруулна уу.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.badge}>
          <Ionicons name="school" size={34} color={colors.white} />
        </View>
        <Text style={styles.title}>Сорил</Text>
        <Text style={styles.subtitle}>Шалгалтандаа бэлдэх хамгийн хялбар арга</Text>

        <Field
          icon="mail-outline"
          placeholder="И-мэйл"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          accessibilityLabel="И-мэйл"
        />
        <Field
          icon="lock-closed-outline"
          placeholder="Нууц үг"
          secureTextEntry
          autoComplete="password"
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

        <Button title="Нэвтрэх" onPress={onSubmit} loading={submitting} style={{ marginTop: spacing.sm }} />

        <Pressable onPress={() => navigation.navigate("Register")} hitSlop={8} accessibilityRole="button">
          <Text style={styles.link}>
            Бүртгэл байхгүй юу? <Text style={styles.linkStrong}>Бүртгүүлэх</Text>
          </Text>
        </Pressable>

        <Pressable
          style={styles.demo}
          onPress={() => {
            setEmail("demo@example.com");
            setPassword("password123");
          }}
          accessibilityRole="button"
        >
          <Ionicons name="flash-outline" size={16} color={colors.primary} />
          <Text style={styles.demoText}>Туршилтын бүртгэлээр нэвтрэх</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, justifyContent: "center", padding: spacing.xxl, maxWidth: 480, width: "100%", alignSelf: "center" },
  badge: {
    width: 72,
    height: 72,
    borderRadius: radius.lg + 2,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: spacing.lg,
    ...shadowStrong,
  },
  title: { ...type.display, color: colors.textPrimary, textAlign: "center" },
  subtitle: { ...type.body, color: colors.textSecondary, textAlign: "center", marginTop: spacing.xs, marginBottom: spacing.xxl },
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
  link: { color: colors.textSecondary, textAlign: "center", marginTop: spacing.xl, fontSize: 15 },
  linkStrong: { color: colors.primary, fontWeight: "700" },
  demo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
  },
  demoText: { ...type.small, color: colors.primary },
});
