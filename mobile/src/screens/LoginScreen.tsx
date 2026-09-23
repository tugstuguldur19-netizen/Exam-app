import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { useAuth } from "../context/AuthContext";
import { describeError } from "../api/client";
import { colors, radius, spacing, type, shadow } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState("demo@example.com");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      Alert.alert("Login failed", describeError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.container}>
        <View style={styles.badge}>
          <Ionicons name="school" size={30} color={colors.white} />
        </View>
        <Text style={styles.title}>Exam Prep</Text>
        <Text style={styles.subtitle}>Sign in to keep studying</Text>

        <View style={styles.field}>
          <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={styles.fieldIcon} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            accessibilityLabel="Email"
          />
        </View>
        <View style={styles.field}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.fieldIcon} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            accessibilityLabel="Password"
          />
        </View>

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={onSubmit}
          disabled={submitting}
          accessibilityRole="button"
          accessibilityLabel="Log in"
          accessibilityState={{ disabled: submitting, busy: submitting }}
        >
          {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Log in</Text>}
        </Pressable>
        <Pressable
          onPress={() => navigation.navigate("Register")}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Need an account? Register"
        >
          <Text style={styles.link}>Need an account? <Text style={styles.linkStrong}>Register</Text></Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, justifyContent: "center", padding: spacing.xxl },
  badge: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: spacing.lg,
    ...shadow,
  },
  title: { ...type.display, color: colors.textPrimary, textAlign: "center" },
  subtitle: { ...type.body, color: colors.textSecondary, textAlign: "center", marginTop: spacing.xs, marginBottom: spacing.xxl },
  field: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  fieldIcon: { marginRight: spacing.sm },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: colors.textPrimary },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: spacing.sm,
    ...shadow,
  },
  buttonPressed: { backgroundColor: colors.primaryDark },
  buttonText: { color: colors.white, fontWeight: "700", fontSize: 16 },
  link: { color: colors.textSecondary, textAlign: "center", marginTop: spacing.xl },
  linkStrong: { color: colors.primary, fontWeight: "700" },
});
