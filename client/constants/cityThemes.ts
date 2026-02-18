import { AppColors } from "./theme";

export interface CityTheme {
  background: string;
  backgroundLight: string;
  accent: string;
  accentSoft: string;
  secondary: string;
  secondarySoft: string;
  gradientOverlay: [string, string, string];
  cardBg: string;
  cardBorder: string;
  accentRgb: string;
  secondaryRgb: string;
  backgroundRgb: string;
}

export const cityThemes: Record<string, CityTheme> = {
  alger: {
    background: "#071A2A",
    backgroundLight: "#0d2e44",
    accent: "#2E86AB",
    accentSoft: "rgba(46, 134, 171, 0.15)",
    secondary: "#4ECDC4",
    secondarySoft: "rgba(78, 205, 196, 0.15)",
    gradientOverlay: ["rgba(7, 26, 42, 0.3)", "rgba(7, 26, 42, 0.75)", "#071A2A"],
    cardBg: "rgba(13, 46, 68, 0.9)",
    cardBorder: "rgba(46, 134, 171, 0.25)",
    accentRgb: "46, 134, 171",
    secondaryRgb: "78, 205, 196",
    backgroundRgb: "7, 26, 42",
  },
  dubai: {
    background: "#1A1408",
    backgroundLight: "#2e2410",
    accent: "#D4A726",
    accentSoft: "rgba(212, 167, 38, 0.15)",
    secondary: "#FFD700",
    secondarySoft: "rgba(255, 215, 0, 0.15)",
    gradientOverlay: ["rgba(26, 20, 8, 0.3)", "rgba(26, 20, 8, 0.75)", "#1A1408"],
    cardBg: "rgba(46, 36, 16, 0.9)",
    cardBorder: "rgba(212, 167, 38, 0.25)",
    accentRgb: "212, 167, 38",
    secondaryRgb: "255, 215, 0",
    backgroundRgb: "26, 20, 8",
  },
  losangeles: {
    background: "#1A1210",
    backgroundLight: "#2e2220",
    accent: "#FEE440",
    accentSoft: "rgba(254, 228, 64, 0.15)",
    secondary: "#F5A623",
    secondarySoft: "rgba(245, 166, 35, 0.15)",
    gradientOverlay: ["rgba(26, 18, 16, 0.3)", "rgba(26, 18, 16, 0.75)", "#1A1210"],
    cardBg: "rgba(46, 34, 32, 0.9)",
    cardBorder: "rgba(254, 228, 64, 0.25)",
    accentRgb: "254, 228, 64",
    secondaryRgb: "245, 166, 35",
    backgroundRgb: "26, 18, 16",
  },
  phuket: {
    background: "#071A1A",
    backgroundLight: "#0d2e2e",
    accent: "#00D9C0",
    accentSoft: "rgba(0, 217, 192, 0.15)",
    secondary: "#FEE440",
    secondarySoft: "rgba(254, 228, 64, 0.15)",
    gradientOverlay: ["rgba(7, 26, 26, 0.3)", "rgba(7, 26, 26, 0.75)", "#071A1A"],
    cardBg: "rgba(13, 46, 46, 0.9)",
    cardBorder: "rgba(0, 217, 192, 0.25)",
    accentRgb: "0, 217, 192",
    secondaryRgb: "254, 228, 64",
    backgroundRgb: "7, 26, 26",
  },
  marrakech: {
    background: "#1A0F08",
    backgroundLight: "#2e1a10",
    accent: "#E87040",
    accentSoft: "rgba(232, 112, 64, 0.15)",
    secondary: "#DEB887",
    secondarySoft: "rgba(222, 184, 135, 0.15)",
    gradientOverlay: ["rgba(26, 15, 8, 0.3)", "rgba(26, 15, 8, 0.75)", "#1A0F08"],
    cardBg: "rgba(46, 26, 16, 0.9)",
    cardBorder: "rgba(232, 112, 64, 0.25)",
    accentRgb: "232, 112, 64",
    secondaryRgb: "222, 184, 135",
    backgroundRgb: "26, 15, 8",
  },
};

export const defaultCityTheme: CityTheme = cityThemes.phuket;

export function getCityTheme(cityId: string | undefined): CityTheme {
  if (!cityId) return defaultCityTheme;
  return cityThemes[cityId] || defaultCityTheme;
}
