import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { useCityTheme } from "@/context/CityContext";
import { useTripPlan } from "@/context/TripPlanContext";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "PlannerBudget">;
type ScreenRouteProp = RouteProp<RootStackParamList, "PlannerBudget">;

const BUDGET_COLORS: Record<string, string> = {
  ECONOMY: "#66BB6A",
  MODERATE: "#42A5F5",
  COMFORT: "#FFB74D",
};

const BUDGET_BG_COLORS: Record<string, string> = {
  ECONOMY: "rgba(102,187,106,0.15)",
  MODERATE: "rgba(66,165,245,0.15)",
  COMFORT: "rgba(255,183,77,0.15)",
};

const BUDGET_CARD_BG_COLORS: Record<string, string> = {
  ECONOMY: "rgba(102,187,106,0.1)",
  MODERATE: "rgba(66,165,245,0.1)",
  COMFORT: "rgba(255,183,77,0.1)",
};

const BUDGET_OPTIONS = [
  { 
    id: "ECONOMY" as const, 
    label: "Économique", 
    range: "~50-80 €/jour",
    description: "L'essentiel sans se ruiner",
    icon: "tag"
  },
  { 
    id: "MODERATE" as const, 
    label: "Modéré", 
    range: "~80-150 €/jour",
    description: "Le bon équilibre qualité/prix",
    icon: "star",
    recommended: true
  },
  { 
    id: "COMFORT" as const, 
    label: "Confort", 
    range: "~150-300 €/jour",
    description: "Des expériences premium",
    icon: "award"
  },
];

export default function PlannerBudgetScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRouteProp>();
  const insets = useSafeAreaInsets();
  const { city } = route.params;
  const { tripPlan, updateTripPlan, saveDraft } = useTripPlan();
  const ct = useCityTheme();

  const [selectedBudget, setSelectedBudget] = useState(tripPlan.budgetTier);

  const handleContinue = async () => {
    updateTripPlan({ budgetTier: selectedBudget });
    await saveDraft();
    navigation.navigate("PlannerTransport", { city });
  };

  return (
    <View style={[styles.container, { backgroundColor: ct.background }]}>
      <LinearGradient
        colors={[ct.background, ct.backgroundLight, ct.background]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={24} color={AppColors.white} />
        </Pressable>
        <View style={styles.progressContainer}>
          <View style={[styles.progressDot, { backgroundColor: `rgba(${ct.accentRgb}, 0.3)` }, styles.progressDotCompleted, { backgroundColor: ct.secondary }]} />
          <View style={[styles.progressDot, { backgroundColor: `rgba(${ct.accentRgb}, 0.3)` }, styles.progressDotCompleted, { backgroundColor: ct.secondary }]} />
          <View style={[styles.progressDot, { backgroundColor: `rgba(${ct.accentRgb}, 0.3)` }, styles.progressDotCompleted, { backgroundColor: ct.secondary }]} />
          <View style={[styles.progressDot, { backgroundColor: `rgba(${ct.accentRgb}, 0.3)` }, styles.progressDotActive, { backgroundColor: ct.secondary, width: 20 }]} />
          <View style={[styles.progressDot, { backgroundColor: `rgba(${ct.accentRgb}, 0.3)` }]} />
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={[styles.content, { paddingBottom: insets.bottom + 100 }]}>
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <View style={styles.iconWrapper}>
            <Feather name="dollar-sign" size={32} color="#4CAF50" />
          </View>
          <ThemedText style={styles.title}>Votre budget</ThemedText>
          <ThemedText style={styles.subtitle}>
            Budget quotidien par personne
          </ThemedText>
        </Animated.View>

        <View style={styles.optionsList}>
          {BUDGET_OPTIONS.map((option, index) => (
            <Animated.View 
              key={option.id}
              entering={FadeInUp.delay(200 + index * 100).duration(400)}
            >
              <Pressable
                style={[
                  styles.optionCard,
                  selectedBudget === option.id && { backgroundColor: BUDGET_CARD_BG_COLORS[option.id], borderColor: BUDGET_COLORS[option.id] },
                ]}
                onPress={() => setSelectedBudget(option.id)}
              >
                <View style={[
                  styles.optionIcon,
                  { backgroundColor: BUDGET_BG_COLORS[option.id] },
                  selectedBudget === option.id && { backgroundColor: BUDGET_COLORS[option.id] },
                ]}>
                  <Feather 
                    name={option.icon as any} 
                    size={22} 
                    color={selectedBudget === option.id ? ct.background : BUDGET_COLORS[option.id]} 
                  />
                </View>
                <View style={styles.optionInfo}>
                  <View style={styles.optionLabelRow}>
                    <ThemedText style={[
                      styles.optionLabel,
                      selectedBudget === option.id && { color: BUDGET_COLORS[option.id] },
                    ]}>
                      {option.label}
                    </ThemedText>
                    {option.recommended ? (
                      <View style={styles.recommendedBadge}>
                        <ThemedText style={styles.recommendedText}>Populaire</ThemedText>
                      </View>
                    ) : null}
                  </View>
                  <ThemedText style={styles.optionRange}>{option.range}</ThemedText>
                  <ThemedText style={styles.optionDescription}>{option.description}</ThemedText>
                </View>
                <View style={[
                  styles.radioOuter,
                  selectedBudget === option.id && { borderColor: BUDGET_COLORS[option.id] },
                ]}>
                  {selectedBudget === option.id ? <View style={[styles.radioInner, { backgroundColor: BUDGET_COLORS[option.id] }]} /> : null}
                </View>
              </Pressable>
            </Animated.View>
          ))}
        </View>

        </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg, backgroundColor: `rgba(${ct.backgroundRgb}, 0.95)`, borderTopColor: `rgba(${ct.accentRgb}, 0.1)` }]}>
        <Pressable
          style={({ pressed }) => [
            styles.continueButton,
            pressed && styles.continueButtonPressed,
          ]}
          onPress={handleContinue}
        >
          <LinearGradient
            colors={[ct.secondary, ct.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.continueGradient}
          >
            <ThemedText style={[styles.continueText, { color: ct.background }]}>Continuer</ThemedText>
            <Feather name="arrow-right" size={20} color={ct.background} />
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#071A1A",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  progressContainer: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(0, 217, 192, 0.3)",
  },
  progressDotActive: {
    backgroundColor: AppColors.sand,
    width: 20,
  },
  progressDotCompleted: {
    backgroundColor: AppColors.sand,
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(76,175,80,0.2)",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: AppColors.white,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  optionsList: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "transparent",
    gap: Spacing.md,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  optionInfo: {
    flex: 1,
  },
  optionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: AppColors.white,
  },
  recommendedBadge: {
    backgroundColor: AppColors.sand20,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: "700",
    color: AppColors.sand,
  },
  optionRange: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 2,
  },
  optionDescription: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
    marginTop: 2,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    backgroundColor: "rgba(7, 26, 26, 0.95)",
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 217, 192, 0.1)",
  },
  continueButton: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  continueButtonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  continueGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  continueText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#071A1A",
  },
});
