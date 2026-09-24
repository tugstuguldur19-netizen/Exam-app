import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, Modal, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList, TabParamList } from "../navigation/types";
import { useAuth } from "../context/AuthContext";
import { APP_VERSION } from "../config";
import { api, describeError } from "../api/client";
import { useLoad } from "../hooks/useLoad";
import { Button, Card, EmptyState, ErrorState, IconBubble, Loader, SectionTitle } from "../components/ui";
import { confirm, showMessage } from "../components/dialog";
import { daysLeft, formatDate } from "../format";
import { accentForSlug, colors, IconName, radius, spacing, type } from "../theme";

type Props = CompositeScreenProps<BottomTabScreenProps<TabParamList, "Profile">, NativeStackScreenProps<RootStackParamList>>;

export default function ProfileScreen({ navigation }: Props) {
  const { logout, setUser } = useAuth();
  const { data, error, loading, refreshing, refresh, retry, setData } = useLoad(() => api.me());
  const [editing, setEditing] = useState(false);

  if (loading) return <Loader />;
  if (error || !data) return <ErrorState message={error ?? ""} onRetry={retry} />;
  const { user, subscriptions } = data;

  const onLogout = async () => {
    if (await confirm("Гарах уу?", "Дахин нэвтрэхэд и-мэйл, нууц үгээ оруулна.", { confirmText: "Гарах", destructive: true })) {
      await logout();
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user.name || "?").slice(0, 1).toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
          {user.createdAt && <Text style={styles.since}>{formatDate(user.createdAt)}-с хойш гишүүн</Text>}
        </View>

        <SectionTitle title="Миний эрхүүд" />
        {subscriptions.length === 0 ? (
          <Card>
            <EmptyState icon="sparkles-outline" title="Идэвхтэй эрх алга" text="Хичээлийн эрх авбал бүх тест нээгдэж, файлаа хязгааргүй оруулна.">
              <Button title="Хичээлүүд үзэх" small onPress={() => navigation.navigate("Home")} style={{ marginTop: spacing.lg }} />
            </EmptyState>
          </Card>
        ) : (
          subscriptions.map((s, i) => {
            const accent = accentForSlug(s.subjectSlug, i);
            const left = daysLeft(s.endAt);
            return (
              <Card
                key={s.subjectId}
                style={styles.sub}
                onPress={() => navigation.navigate("SubjectDetail", { subjectId: s.subjectId, subjectName: s.subjectName })}
              >
                <IconBubble icon={accent.icon} fg={accent.fg} bg={accent.bg} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.subName}>{s.subjectName}</Text>
                  <Text style={styles.subMeta}>
                    {s.planName} · {formatDate(s.endAt)} хүртэл
                  </Text>
                </View>
                <Text style={[styles.left, left <= 7 && { color: colors.warning }]}>{left} хоног</Text>
              </Card>
            );
          })
        )}

        <SectionTitle title="Тохиргоо" />
        <Card style={{ padding: 0 }}>
          <Row icon="person-outline" label="Нэр солих" onPress={() => setEditing(true)} />
          <Row icon="key-outline" label="Нууц үг солих" onPress={() => navigation.navigate("ChangePassword")} />
          <Row icon="time-outline" label="Тестийн түүх" onPress={() => navigation.navigate("History")} />
          <Row icon="help-circle-outline" label="Файлаа хэрхэн бэлдэх вэ?" onPress={() => navigation.navigate("UploadHelp")} last />
        </Card>

        <Button title="Гарах" icon="log-out-outline" variant="danger" onPress={onLogout} style={{ marginTop: spacing.xl }} />
        <Text style={styles.version}>Сорил · хувилбар {APP_VERSION}</Text>
      </ScrollView>

      <EditNameModal
        visible={editing}
        initial={user.name}
        onClose={() => setEditing(false)}
        onSaved={(u) => {
          setUser(u);
          setData({ ...data, user: u });
          setEditing(false);
        }}
      />
    </SafeAreaView>
  );
}

function Row({ icon, label, onPress, last }: { icon: IconName; label: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, !last && styles.rowBorder, pressed && { backgroundColor: colors.background }]}>
      <Ionicons name={icon} size={20} color={colors.textSecondary} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

function EditNameModal({
  visible,
  initial,
  onClose,
  onSaved,
}: {
  visible: boolean;
  initial: string;
  onClose: () => void;
  onSaved: (u: { id: string; email: string; name: string }) => void;
}) {
  const [name, setName] = useState(initial);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      const res = await api.updateMe(name.trim());
      onSaved(res.user);
    } catch (err) {
      showMessage("Алдаа", describeError(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose} onShow={() => setName(initial)}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.dialog} onPress={() => {}}>
          <Text style={styles.dialogTitle}>Нэр солих</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} autoFocus placeholder="Нэр" placeholderTextColor={colors.textMuted} />
          <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.lg }}>
            <Button title="Болих" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
            <Button title="Хадгалах" onPress={save} loading={saving} disabled={!name.trim()} style={{ flex: 1 }} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl, maxWidth: 720, width: "100%", alignSelf: "center" },
  header: { alignItems: "center", paddingVertical: spacing.lg },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 34, fontWeight: "800", color: colors.white },
  name: { ...type.h1, color: colors.textPrimary, marginTop: spacing.md },
  email: { ...type.body, color: colors.textSecondary, marginTop: 2 },
  since: { ...type.small, color: colors.textMuted, marginTop: spacing.xs },
  sub: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.sm, padding: spacing.md },
  subName: { ...type.bodyStrong, color: colors.textPrimary },
  subMeta: { ...type.small, color: colors.textSecondary, marginTop: 2 },
  left: { ...type.bodyStrong, color: colors.success },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { ...type.body, color: colors.textPrimary, flex: 1 },
  version: { ...type.small, color: colors.textMuted, textAlign: "center", marginTop: spacing.lg },
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: "center", padding: spacing.xl },
  dialog: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, width: "100%", maxWidth: 420, alignSelf: "center" },
  dialogTitle: { ...type.h2, color: colors.textPrimary, marginBottom: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.textPrimary,
  },
});
