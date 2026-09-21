import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { api, ApiError } from "../api/client";
import type { Subject } from "../types";
import { useAuth } from "../context/AuthContext";
import { colors, radius, spacing, type, shadow, shadowStrong, accentForSubject } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Subjects">;

export default function SubjectsScreen({ navigation }: Props) {
  const { logout } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [planPickerSubject, setPlanPickerSubject] = useState<Subject | null>(null);
  const [purchasingPlanId, setPurchasingPlanId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setSubjects(await api.listSubjects());
    } catch (err) {
      Alert.alert("Couldn't load subjects", err instanceof ApiError ? err.message : "Check your connection");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const purchase = async (subjectId: string, planId: string) => {
    setPurchasingPlanId(planId);
    try {
      await api.subscribe(subjectId, planId);
      setPlanPickerSubject(null);
      await load();
    } catch (err) {
      Alert.alert("Purchase failed", err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setPurchasingPlanId(null);
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
        data={subjects}
        keyExtractor={(s) => s.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={{ padding: spacing.lg }}
        ListHeaderComponent={
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>Welcome back</Text>
              <Text style={styles.title}>Your subjects</Text>
            </View>
            <Pressable
              onPress={logout}
              hitSlop={8}
              style={styles.logoutButton}
              accessibilityRole="button"
              accessibilityLabel="Log out"
            >
              <Ionicons name="log-out-outline" size={22} color={colors.danger} />
            </Pressable>
          </View>
        }
        renderItem={({ item, index }) => {
          const accent = accentForSubject(index);
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={[styles.iconBadge, { backgroundColor: accent.bg }]}>
                  <Ionicons name={accent.icon} size={22} color={accent.fg} />
                </View>
                <View style={styles.cardHeaderText}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardDesc} numberOfLines={2}>
                    {item.description}
                  </Text>
                </View>
              </View>

              {item.subscription.active ? (
                <>
                  <View style={styles.activePill}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                    <Text style={styles.activePillText}>
                      Active until {new Date(item.subscription.endAt!).toLocaleDateString()}
                    </Text>
                  </View>
                  <Pressable
                    style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
                    onPress={() => navigation.navigate("SubjectDetail", { subjectId: item.id, subjectName: item.name })}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${item.name}`}
                  >
                    <Text style={styles.primaryButtonText}>Open</Text>
                    <Ionicons name="arrow-forward" size={16} color={colors.white} />
                  </Pressable>
                </>
              ) : (
                <>
                  <View style={styles.lockedPill}>
                    <Ionicons name="lock-closed" size={12} color={colors.textMuted} />
                    <Text style={styles.lockedPillText}>Locked</Text>
                  </View>
                  <Pressable
                    style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryButtonPressed]}
                    onPress={() => setPlanPickerSubject(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Subscribe to ${item.name}`}
                  >
                    <Text style={styles.secondaryButtonText}>Subscribe</Text>
                  </Pressable>
                </>
              )}
            </View>
          );
        }}
      />

      <Modal
        visible={planPickerSubject !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPlanPickerSubject(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setPlanPickerSubject(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Subscribe to {planPickerSubject?.name}</Text>
            <Text style={styles.modalSubtitle}>Choose how long you want access for</Text>
            {planPickerSubject?.plans.map((plan) => (
              <Pressable
                key={plan.id}
                style={({ pressed }) => [styles.planRow, pressed && styles.planRowPressed]}
                onPress={() => purchase(planPickerSubject.id, plan.id)}
                disabled={purchasingPlanId !== null}
                accessibilityRole="button"
                accessibilityLabel={`${plan.name}, $${(plan.priceCents / 100).toFixed(2)}`}
              >
                <Text style={styles.planName}>{plan.name}</Text>
                {purchasingPlanId === plan.id ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Text style={styles.planPrice}>${(plan.priceCents / 100).toFixed(2)}</Text>
                )}
              </Pressable>
            ))}
            <Pressable
              style={styles.modalCancel}
              onPress={() => setPlanPickerSubject(null)}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
    paddingTop: spacing.xs,
  },
  eyebrow: { ...type.small, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.6 },
  title: { ...type.display, color: colors.textPrimary, marginTop: 2 },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow,
  },
  cardTop: { flexDirection: "row", marginBottom: spacing.md },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  cardHeaderText: { flex: 1 },
  cardTitle: { ...type.h2, color: colors.textPrimary },
  cardDesc: { ...type.small, color: colors.textSecondary, marginTop: 2, fontWeight: "400" },
  activePill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.successSoft,
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
    gap: 5,
  },
  activePillText: { ...type.small, color: colors.success },
  lockedPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.background,
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
    gap: 5,
  },
  lockedPillText: { ...type.small, color: colors.textMuted },
  primaryButton: {
    flexDirection: "row",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  primaryButtonPressed: { backgroundColor: colors.primaryDark },
  primaryButtonText: { color: colors.white, fontWeight: "700" },
  secondaryButton: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonPressed: { backgroundColor: "#E0E4FB" },
  secondaryButtonText: { color: colors.primary, fontWeight: "700" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(15,15,35,0.45)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    ...shadowStrong,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: spacing.lg,
  },
  modalTitle: { ...type.h1, color: colors.textPrimary },
  modalSubtitle: { ...type.body, color: colors.textSecondary, marginTop: 2, marginBottom: spacing.md },
  planRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  planRowPressed: { backgroundColor: colors.background },
  planName: { ...type.bodyStrong, color: colors.textPrimary },
  planPrice: { ...type.bodyStrong, color: colors.primary },
  modalCancel: { alignItems: "center", paddingVertical: spacing.md, marginTop: spacing.xs },
  modalCancelText: { color: colors.textSecondary, fontWeight: "600" },
});
