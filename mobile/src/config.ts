// Backend base URL.
//
// - Web / iOS Simulator can use localhost directly.
// - Android emulator (AVD) must use 10.0.2.2 to reach the host machine.
// - A physical device needs your computer's LAN IP (e.g. http://192.168.1.20:4000)
//   with the phone on the same network — localhost on a phone means the phone itself.
import { Platform } from "react-native";

// `||` (not `??`) deliberately, so an empty string (e.g. an unset build
// input that still sets the env var to "") also falls through to the
// platform default instead of becoming a useless empty base URL.
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === "android" ? "http://10.0.2.2:4000" : "http://localhost:4000");

// Keep in sync with app.json's expo.version.
export const APP_VERSION = "2.0.0";
