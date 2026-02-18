import React, { useState, useEffect } from "react";
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

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "PlannerContext">;
type ScreenRouteProp = RouteProp<RootStackParamList, "PlannerContext">;

const ALL_CONTEXT_OPTIONS = [
  { id: "COUPLE", label: "En couple", icon: "heart", description: "Voyage romantique" },
  { id: "FAMILY", label: "En famille", icon: "users", description: "Avec vos enfants" },
  { id: "FRIENDS", label: "Entre amis", icon: "smile", description: "Entre potes" },
  { id: "SOLO", label: "En solo", icon: "user", description: "Aventure solo" },
] as const;

const OPTION_COLORS: Record<string, string> = {
  COUPLE: "#FF5DA2",
  FAMILY: "#FF8C42",
  FRIENDS: "#9C6ADE",
  SOLO: "#26C6DA",
};

const getOptionBg = (id: string) => {
  const colors: Record<string, string> = {
    COUPLE: "rgba(255,107,138,0.12)",
    FAMILY: "rgba(255,140,66,0.12)",
    FRIENDS: "rgba(156,106,222,0.12)",
    SOLO: "rgba(38,198,218,0.12)",
  };
  return colors[id] || "rgba(135,206,235,0.12)";
};

const getOptionSelectedBg = (id: string) => {
  const colors: Record<string, string> = {
    COUPLE: "rgba(255,107,138,0.15)",
    FAMILY: "rgba(255,140,66,0.15)",
    FRIENDS: "rgba(156,106,222,0.15)",
    SOLO: "rgba(38,198,218,0.15)",
  };
  return colors[id] || "rgba(135,206,235,0.15)";
};

export default function PlannerContextScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRouteProp>();
  const insets = useSafeAreaInsets();
  const { city } = route.params;
  const { tripPlan, updateTripPlan, saveDraft } = useTripPlan();
  const ct = useCityTheme();

  const totalPeople = tripPlan.travelers.adults + tripPlan.travelers.children;
  
  const contextOptions = totalPeople > 2 
    ? ALL_CONTEXT_OPTIONS.filter(opt => opt.id !== "SOLO")
    : ALL_CONTEXT_OPTIONS;

  const [selectedContext, setSelectedContext] = useState<typeof tripPlan.context>(tripPlan.context);

  useEffect(() => {
    if (totalPeople === 1) {
      updateTripPlan({ context: "SOLO" });
      saveDraft().then(() => {
        navigation.replace("PlannerPreferences", { 
          city, 
          startDate: tripPlan.startDate || "", 
          endDate: tripPlan.endDate || "", 
          numPeople: totalPeople 
        });
      });
    }
  }, []);

  const handleSkip = async () => {
    updateTripPlan({ context: null });
    await saveDraft();
    navigation.navigate("PlannerPreferences", { 
      city, 
      startDate: tripPlan.startDate || "", 
      endDate: tripPlan.endDate || "", 
      numPeople: tripPlan.travelers.adults + tripPlan.travelers.children 
    });
  };

  const handleContinue = async () => {
    updateTripPlan({ context: selectedContext });
    await saveDraft();
    navigation.navigate("PlannerPreferences", { 
      city, 
      startDate: tripPlan.startDate || "", 
      endDate: tripPlan.endDate || "", 
      numPeople: tripPlan.travelers.adults + tripPlan.travelers.children 
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
          <View style={[styles.progressDot, { backgroundColor: `rgba(${ct.accentRgb}, 0.3)` }, styles.progressDotActive, { backgroundColor: ct.secondary, width: 20 }]} />
          <View style={[styles.progressDot, { backgroundColor: `rgba(${ct.accentRgb}, 0.3)` }]} />
          <View style={[styles.progressDot, { backgroundColor: `rgba(${ct.accentRgb}, 0.3)` }]} />
          <View style={[styles.progressDot, { backgroundColor: `rgba(${ct.accentRgb}, 0.3)` }]} />
        </View>
        <Pressable style={[styles.skipButton, { backgroundColor: `rgba(${ct.accentRgb}, 0.15)`, borderColor: `rgba(${ct.accentRgb}, 0.4)` }]} onPress={handleSkip}>
          <ThemedText style={[styles.skipText, { color: ct.accent }]}>Passer</ThemedText>
        </Pressable>
      </View>

      <View style={[styles.content, { paddingBottom: insets.bottom + 100 }]}>
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <View style={styles.iconWrapper}>
            <Feather name="heart" size={32} color="#FF5DA2" />
          </View>
          <ThemedText style={styles.title}>Avec qui partez-vous ?</ThemedText>
          <ThemedText style={styles.subtitle}>
            Optionnel - pour affiner votre voyage
          </ThemedText>
        </Animated.View>

        <View style={styles.optionsContainer}>
          <View style={styles.optionsRow}>
            {contextOptions.slice(0, 2).map((option, index) => (
              <Animated.View 
                key={option.id} 
                style={styles.optionWrapper}
                entering={FadeInUp.delay(200 + index * 100).duration(400)}
              >
                <Pressable
                  style={[
                    styles.optionCard,
                    { borderColor: `rgba(${ct.accentRgb}, 0.15)` },
                    selectedContext === option.id && { backgroundColor: getOptionSelectedBg(option.id), borderColor: OPTION_COLORS[option.id], borderWidth: 2 },
                  ]}
                  onPress={() => setSelectedContext(option.id)}
                >
                  <View style={[
                    styles.optionIcon,
                    { backgroundColor: getOptionBg(option.id) },
                    selectedContext === option.id && { backgroundColor: OPTION_COLORS[option.id] },
                  ]}>
                    <Feather 
                      name={option.icon as any} 
                      size={24} 
                      color={selectedContext === option.id ? ct.background : OPTION_COLORS[option.id]} 
                    />
                  </View>
                  <ThemedText style={[
                    styles.optionLabel,
                    selectedContext === option.id && { color: OPTION_COLORS[option.id] },
                  ]}>
                    {option.label}
                  </ThemedText>
                  <ThemedText style={styles.optionDescription} numberOfLines={1}>
                    {option.description}
                  </ThemedText>
                </Pressable>
              </Animated.View>
            ))}
          </View>
          <View style={styles.optionsRow}>
            {contextOptions.slice(2).map((option, index) => (
              <Animated.View 
                key={option.id} 
                style={styles.optionWrapper}
                entering={FadeInUp.delay(400 + index * 100).duration(400)}
              >
                <Pressable
                  style={[
                    styles.optionCard,
                    { borderColor: `rgba(${ct.accentRgb}, 0.15)` },
                    selectedContext === option.id && { backgroundColor: getOptionSelectedBg(option.id), borderColor: OPTION_COLORS[option.id], borderWidth: 2 },
                  ]}
                  onPress={() => setSelectedContext(option.id)}
                >
                  <View style={[
                    styles.optionIcon,
                    { backgroundColor: getOptionBg(option.id) },
                    selectedContext === option.id && { backgroundColor: OPTION_COLORS[option.id] },
                  ]}>
                    <Feather 
                      name={option.icon as any} 
                      size={24} 
                      color={selectedContext === option.id ? ct.background : OPTION_COLORS[option.id]} 
                    />
                  </View>
                  <ThemedText style={[
                    styles.optionLabel,
                    selectedContext === option.id && { color: OPTION_COLORS[option.id] },
                  ]}>
                    {option.label}
                  </ThemedText>
                  <ThemedText style={styles.optionDescription} numberOfLines={1}>
                    {option.description}
                  </ThemedText>
                </Pressable>
              </Animated.View>
            ))}
          </View>
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
  skipButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: "rgba(0, 217, 192, 0.15)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0, 217, 192, 0.4)",
  },
  skipText: {
    fontSize: 14,
    fontWeight: "600",
    color: AppColors.secondary,
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
    backgroundColor: "rgba(255,107,138,0.2)",
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
  optionsContainer: {
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  optionsRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  optionWrapper: {
    flex: 1,
  },
  optionCard: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    alignItems: "center",
    justifyContent: "flex-start",
    borderWidth: 1.5,
    borderColor: "rgba(0, 217, 192, 0.15)",
    height: 140,
  },
  optionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: AppColors.white,
    marginBottom: 4,
    textAlign: "center",
  },
  optionDescription: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "center",
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
