import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { useCityTheme } from "@/context/CityContext";
import { useTripPlan } from "@/context/TripPlanContext";
import type { RootStackParamList, PlannerPreferences } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "PlannerTransport">;
type ScreenRouteProp = RouteProp<RootStackParamList, "PlannerTransport">;

const TRANSPORT_OPTIONS = [
  { id: "SELF" as const, label: "Je me débrouille", icon: "map-pin", iconType: "feather", description: "Transports en commun, à pied" },
  { id: "CAR_RENTAL" as const, label: "Location de voiture", icon: "car-side", iconType: "material", description: "Liberté totale de mouvement" },
  { id: "DRIVER" as const, label: "Chauffeur privé", icon: "user-check", iconType: "feather", description: "Le confort absolu" },
  { id: "UNSURE" as const, label: "Je verrai sur place", icon: "help-circle", iconType: "feather", description: "Pas encore décidé" },
];

const TRANSPORT_COLORS: Record<string, string> = {
  SELF: "#26C6DA",
  CAR_RENTAL: "#FF8C42",
  DRIVER: "#9C6ADE",
  UNSURE: "#78909C",
};

const TRANSPORT_BG_COLORS: Record<string, string> = {
  SELF: "rgba(38,198,218,0.15)",
  CAR_RENTAL: "rgba(255,140,66,0.15)",
  DRIVER: "rgba(156,106,222,0.15)",
  UNSURE: "rgba(120,144,156,0.15)",
};

export default function PlannerTransportScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRouteProp>();
  const insets = useSafeAreaInsets();
  const { city } = route.params;
  const { tripPlan, updateTripPlan, saveDraft } = useTripPlan();
  const ct = useCityTheme();

  const [selectedTransport, setSelectedTransport] = useState(tripPlan.transport);

  const handleSkip = () => {
    handleGenerate(null);
  };

  const handleGenerate = async (transport: typeof selectedTransport) => {
    updateTripPlan({ transport });
    await saveDraft();
    
    const preferences: PlannerPreferences = {
      rhythm: tripPlan.pace.toLowerCase(),
      interests: tripPlan.interests,
      budget: tripPlan.budgetTier.toLowerCase(),
      carRental: transport === "CAR_RENTAL",
      driver: transport === "DRIVER",
    };

    navigation.navigate("PlannerGeneration", {
      city,
      startDate: tripPlan.startDate || "",
      endDate: tripPlan.endDate || "",
      numPeople: tripPlan.travelers.adults + tripPlan.travelers.children,
      context: tripPlan.context || undefined,
      preferences,
    });
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
          <View style={[styles.progressDot, { backgroundColor: `rgba(${ct.accentRgb}, 0.3)` }, styles.progressDotCompleted, { backgroundColor: ct.secondary }]} />
          <View style={[styles.progressDot, { backgroundColor: `rgba(${ct.accentRgb}, 0.3)` }, styles.progressDotActive, { backgroundColor: ct.secondary, width: 20 }]} />
        </View>
        <Pressable style={[styles.skipButton, { backgroundColor: `rgba(${ct.accentRgb}, 0.15)`, borderColor: `rgba(${ct.accentRgb}, 0.4)` }]} onPress={handleSkip}>
          <ThemedText style={[styles.skipText, { color: ct.accent }]}>Passer</ThemedText>
        </Pressable>
      </View>

      <View style={[styles.content, { paddingBottom: insets.bottom + 100 }]}>
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <View style={styles.iconWrapper}>
            <Feather name="navigation" size={32} color={"#26C6DA"} />
          </View>
          <ThemedText style={styles.title}>Comment vous déplacez-vous ?</ThemedText>
          <ThemedText style={styles.subtitle}>
            Optionnel, pour mieux optimiser vos trajets
          </ThemedText>
        </Animated.View>

        <View style={styles.optionsList}>
          {TRANSPORT_OPTIONS.map((option, index) => (
            <Animated.View 
              key={option.id}
              entering={FadeInUp.delay(200 + index * 80).duration(400)}
            >
              <Pressable
                style={[
                  styles.optionCard,
                  selectedTransport === option.id && { backgroundColor: `${TRANSPORT_BG_COLORS[option.id]}`, borderColor: TRANSPORT_COLORS[option.id] },
                ]}
                onPress={() => setSelectedTransport(option.id)}
              >
                <View style={[
                  styles.optionIcon,
                  { backgroundColor: TRANSPORT_BG_COLORS[option.id] },
                  selectedTransport === option.id && { backgroundColor: TRANSPORT_COLORS[option.id] },
                ]}>
                  {option.iconType === "material" ? (
                    <MaterialCommunityIcons 
                      name={option.icon as any} 
                      size={22} 
                      color={selectedTransport === option.id ? ct.background : TRANSPORT_COLORS[option.id]} 
                    />
                  ) : (
                    <Feather 
                      name={option.icon as any} 
                      size={20} 
                      color={selectedTransport === option.id ? ct.background : TRANSPORT_COLORS[option.id]} 
                    />
                  )}
                </View>
                <View style={styles.optionInfo}>
                  <ThemedText style={[
                    styles.optionLabel,
                    selectedTransport === option.id && { color: TRANSPORT_COLORS[option.id] },
                  ]}>
                    {option.label}
                  </ThemedText>
                  <ThemedText style={styles.optionDescription}>{option.description}</ThemedText>
                </View>
                <View style={[
                  styles.radioOuter,
                  selectedTransport === option.id && { borderColor: TRANSPORT_COLORS[option.id] },
                ]}>
                  {selectedTransport === option.id ? <View style={[styles.radioInner, { backgroundColor: TRANSPORT_COLORS[option.id] }]} /> : null}
                </View>
              </Pressable>
            </Animated.View>
          ))}
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg, backgroundColor: `rgba(${ct.backgroundRgb}, 0.95)`, borderTopColor: `rgba(${ct.accentRgb}, 0.1)` }]}>
        <Pressable
          style={({ pressed }) => [
            styles.generateButton,
            pressed && styles.generateButtonPressed,
          ]}
          onPress={() => handleGenerate(selectedTransport)}
        >
          <LinearGradient
            colors={[ct.secondary, ct.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.generateGradient}
          >
            <ThemedText style={[styles.generateText, { color: ct.background }]}>Générer mon planning</ThemedText>
            <Feather name="zap" size={20} color={ct.background} />
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
  skipButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: "rgba(38,198,218,0.15)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(38,198,218,0.4)",
  },
  skipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#26C6DA",
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
    backgroundColor: "rgba(38,198,218,0.2)",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 24,
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
    gap: Spacing.sm,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "transparent",
    gap: Spacing.md,
  },
  optionIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  optionInfo: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: AppColors.white,
  },
  optionDescription: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
    marginTop: 2,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
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
  generateButton: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    shadowColor: AppColors.sand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  generateButtonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  generateGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.xl,
  },
  generateText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#071A1A",
  },
});
