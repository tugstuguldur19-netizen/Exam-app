import { Alert, Platform } from "react-native";

// Alert.alert is a no-op on react-native-web, so fall back to the browser's
// own dialogs there.

export function showMessage(title: string, message?: string) {
  if (Platform.OS === "web") {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message, [{ text: "За" }]);
}

export function confirm(
  title: string,
  message: string,
  opts: { confirmText?: string; cancelText?: string; destructive?: boolean } = {}
): Promise<boolean> {
  const { confirmText = "Тийм", cancelText = "Болих", destructive = false } = opts;
  if (Platform.OS === "web") {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelText, style: "cancel", onPress: () => resolve(false) },
        { text: confirmText, style: destructive ? "destructive" : "default", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}
