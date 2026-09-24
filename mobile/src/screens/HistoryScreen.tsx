import React from "react";
import { FlatList, RefreshControl, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { api } from "../api/client";
import { useLoad } from "../hooks/useLoad";
import { EmptyState, ErrorState, Loader } from "../components/ui";
import { HistoryRow } from "../components/HistoryRow";
import { colors, spacing } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "History">;

export default function HistoryScreen({ navigation }: Props) {
  const { data, error, loading, refreshing, refresh, retry } = useLoad(() => api.history(100));
  if (loading) return <Loader />;
  if (error || !data) return <ErrorState message={error ?? ""} onRetry={retry} />;
  return (
    <FlatList
      data={data}
      keyExtractor={(t) => t.id}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      renderItem={({ item }) => <HistoryRow item={item} onPress={() => navigation.navigate("Result", { sessionId: item.id })} />}
      ListEmptyComponent={<EmptyState icon="time-outline" title="Түүх хоосон" text="Өгсөн тестүүд тань энд харагдана." />}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl, maxWidth: 720, width: "100%", alignSelf: "center" },
});
