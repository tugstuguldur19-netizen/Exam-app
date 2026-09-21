import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, type, shadow } from "../theme";

type Props = { children: React.ReactNode };
type State = { error: Error | null };

// React error boundaries must be class components — there's no hook
// equivalent to componentDidCatch/getDerivedStateFromError yet. Without
// this, any unhandled render error anywhere in the tree white-screens the
// whole app with no way back except a full reload.
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Unhandled render error:", error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <View style={styles.badge}>
            <Ionicons name="warning" size={28} color={colors.white} />
          </View>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>
            The app hit an unexpected error. You can try again — if it keeps happening, restarting the app usually helps.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={this.reset}
            accessibilityRole="button"
            accessibilityLabel="Try again"
          >
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.xxl, backgroundColor: colors.background },
  badge: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
    ...shadow,
  },
  title: { ...type.h1, color: colors.textPrimary, textAlign: "center", marginBottom: spacing.sm },
  body: { ...type.body, color: colors.textSecondary, textAlign: "center", marginBottom: spacing.xl },
  button: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: spacing.xxl, ...shadow },
  buttonPressed: { backgroundColor: colors.primaryDark },
  buttonText: { color: colors.white, fontWeight: "700", fontSize: 16 },
});
