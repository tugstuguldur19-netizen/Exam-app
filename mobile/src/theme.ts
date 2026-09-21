import { Platform } from "react-native";

// Single source of truth for the app's look. Screens should pull from here
// instead of hardcoding hex values / spacing numbers, so a palette or
// density change is a one-file edit.

export const colors = {
  primary: "#4F46E5",
  primaryDark: "#4338CA",
  primarySoft: "#EEF2FF",
  background: "#F7F7FB",
  surface: "#FFFFFF",
  border: "#E7E7F0",
  textPrimary: "#16172B",
  textSecondary: "#6B6C82",
  textMuted: "#9497AC",
  success: "#12946F",
  successSoft: "#E4F7F0",
  danger: "#DC3D43",
  dangerSoft: "#FCEAEA",
  warningSoft: "#FFF6E5",
  white: "#FFFFFF",
} as const;

export const subjectAccents = [
  { icon: "calculator" as const, bg: "#EEF2FF", fg: "#4F46E5" },
  { icon: "leaf" as const, bg: "#E4F7F0", fg: "#12946F" },
  { icon: "book" as const, bg: "#FFF1E6", fg: "#C2540A" },
  { icon: "flask" as const, bg: "#FCEAEA", fg: "#DC3D43" },
  { icon: "globe" as const, bg: "#F1EAFC", fg: "#7C3AED" },
];

export function accentForSubject(index: number) {
  return subjectAccents[index % subjectAccents.length];
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  pill: 999,
} as const;

export const type = {
  display: { fontSize: 30, fontWeight: "800" as const, letterSpacing: -0.5 },
  h1: { fontSize: 24, fontWeight: "800" as const, letterSpacing: -0.3 },
  h2: { fontSize: 18, fontWeight: "700" as const },
  body: { fontSize: 15, fontWeight: "400" as const },
  bodyStrong: { fontSize: 15, fontWeight: "600" as const },
  small: { fontSize: 13, fontWeight: "500" as const },
  tiny: { fontSize: 11, fontWeight: "700" as const, letterSpacing: 0.4 },
};

export const shadow = Platform.select({
  ios: {
    shadowColor: "#1B1B3A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  android: { elevation: 2 },
  default: {},
});

export const shadowStrong = Platform.select({
  ios: {
    shadowColor: "#1B1B3A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
  },
  android: { elevation: 6 },
  default: {},
});
