import { Platform } from "react-native";

export const AppColors = {
  primary: "#071A1A",
  primaryLight: "#0d2e2e",
  secondary: "#00D9C0",
  sand: "#FEE440",
  sand20: "rgba(254, 228, 64, 0.2)",
  sand10: "rgba(254, 228, 64, 0.1)",
  highlight: "#FF5DA2",
  background: "#f5f5f5",
  success: "#00D9C0",
  error: "#F44336",
  white: "#FFFFFF",
  textPrimary: "#071A1A",
  textSecondary: "#666666",
  textMuted: "#999999",
  border: "#dddddd",
  overlay: "rgba(0, 0, 0, 0.4)",
  overlayDark: "rgba(0, 0, 0, 0.6)",
};

export const Colors = {
  light: {
    text: AppColors.textPrimary,
    buttonText: AppColors.white,
    tabIconDefault: "#687076",
    tabIconSelected: AppColors.secondary,
    link: AppColors.secondary,
    backgroundRoot: AppColors.white,
    backgroundDefault: AppColors.background,
    backgroundSecondary: "#E6E6E6",
    backgroundTertiary: "#D9D9D9",
  },
  dark: {
    text: "#ECEDEE",
    buttonText: AppColors.white,
    tabIconDefault: "#9BA1A6",
    tabIconSelected: AppColors.secondary,
    link: AppColors.secondary,
    backgroundRoot: AppColors.primary,
    backgroundDefault: "#0d2e2e",
    backgroundSecondary: "#143838",
    backgroundTertiary: "#1a4242",
  },
};

export const Spacing = {
  tiny: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  "4xl": 48,
  inputHeight: 48,
  buttonHeight: 50,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  full: 9999,
};

export const Typography = {
  hero: {
    fontSize: 32,
    fontWeight: "700" as const,
  },
  h1: {
    fontSize: 28,
    fontWeight: "700" as const,
  },
  h2: {
    fontSize: 24,
    fontWeight: "600" as const,
  },
  h3: {
    fontSize: 20,
    fontWeight: "600" as const,
  },
  h4: {
    fontSize: 18,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 14,
    fontWeight: "400" as const,
  },
  tiny: {
    fontSize: 12,
    fontWeight: "400" as const,
  },
  micro: {
    fontSize: 10,
    fontWeight: "400" as const,
  },
  link: {
    fontSize: 16,
    fontWeight: "400" as const,
  },
};

export const Shadows = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  elevated: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
