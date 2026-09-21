import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { api, ApiError } from "../api/client";
import type { Subject } from "../types";
import { useAuth } from "../context/AuthContext";

type Props = NativeStackScreenProps<RootStackParamList, "Subjects">;

export default function SubjectsScreen({ navigation }: Props) {
  const { logout } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  const onSubscribe = (subject: Subject) => {
    Alert.alert(
      `Subscribe to ${subject.name}`,
      "Choose a plan",
      [
        ...subject.plans.map((plan) => ({
          text: `${plan.name} — $${(plan.priceCents / 100).toFixed(2)}`,
          onPress: () => purchase(subject.id, plan.id),
        })),
        { text: "Cancel", style: "cancel" as const },
      ],
      { cancelable: true }
    );
  };

  const purchase = async (subjectId: string, planId: string) => {
    setPurchasingPlanId(planId);
    try {
      await api.subscribe(subjectId, planId);
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
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={subjects}
        keyExtractor={(s) => s.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Subjects</Text>
            <Pressable onPress={logout}>
              <Text style={styles.logout}>Log out</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardDesc}>{item.description}</Text>
            {item.subscription.active ? (
              <>
                <Text style={styles.activeBadge}>
                  Active until {new Date(item.subscription.endAt!).toLocaleDateString()}
                </Text>
                <Pressable
                  style={styles.primaryButton}
                  onPress={() => navigation.navigate("SubjectDetail", { subjectId: item.id, subjectName: item.name })}
                >
                  <Text style={styles.primaryButtonText}>Open</Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                style={styles.secondaryButton}
                onPress={() => onSubscribe(item)}
                disabled={purchasingPlanId !== null}
              >
                <Text style={styles.secondaryButtonText}>Subscribe</Text>
              </Pressable>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f8fa" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 26, fontWeight: "700" },
  logout: { color: "#dc2626" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cardTitle: { fontSize: 18, fontWeight: "600" },
  cardDesc: { color: "#667085", marginTop: 4, marginBottom: 12 },
  activeBadge: { color: "#15803d", fontWeight: "500", marginBottom: 10 },
  primaryButton: { backgroundColor: "#2563eb", borderRadius: 8, padding: 10, alignItems: "center" },
  primaryButtonText: { color: "#fff", fontWeight: "600" },
  secondaryButton: { backgroundColor: "#eef2ff", borderRadius: 8, padding: 10, alignItems: "center" },
  secondaryButtonText: { color: "#2563eb", fontWeight: "600" },
});
