import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
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

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "PlannerPreferences">;
type ScreenRouteProp = RouteProp<RootStackParamList, "PlannerPreferences">;

const RHYTHM_OPTIONS = [
  { id: "RELAX", label: "Tranquille", icon: "sun", description: "1-2 activités/jour" },
  { id: "BALANCED", label: "Équilibré", icon: "compass", description: "2-3 activités/jour", recommended: true },
  { id: "INTENSE", label: "Intense", icon: "zap", description: "3-4 activités/jour" },
] as const;

const RHYTHM_COLORS: Record<string, string> = {
  RELAX: "#FFB74D",
  BALANCED: "#66BB6A",
  INTENSE: "#FF7043",
};

const RHYTHM_BG_COLORS: Record<string, string> = {
  RELAX: "rgba(255,183,77,0.15)",
  BALANCED: "rgba(102,187,106,0.15)",
  INTENSE: "rgba(255,112,67,0.15)",
};

const INTEREST_OPTIONS = [
  { id: "culture", label: "Culture", icon: "book" },
  { id: "nature", label: "Nature", icon: "sun" },
  { id: "sea", label: "Mer & aventure", icon: "anchor" },
  { id: "food", label: "Gastronomie", icon: "coffee" },
  { id: "wellness", label: "Bien-être", icon: "heart" },
  { id: "shopping", label: "Shopping", icon: "shopping-bag" },
  { id: "offbeat", label: "Hors des sentiers battus", icon: "map-pin", recommended: true },
];

const INTEREST_COLORS: Record<string, string> = {
  culture: "#9C6ADE",
  nature: "#66BB6A",
  sea: "#26C6DA",
  food: "#FF8C42",
  wellness: "#FF5DA2",
  shopping: "#FFB74D",
  offbeat: "#78909C",
};

const MAX_INTERESTS = 5;

export default function PlannerPreferencesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRouteProp>();
  const insets = useSafeAreaInsets();
  const { city } = route.params;
  const { tripPlan, updateTripPlan, saveDraft } = useTripPlan();
  const ct = useCityTheme();

  const [rhythm, setRhythm] = useState<"RELAX" | "BALANCED" | "INTENSE">(tripPlan.pace);
  const [interests, setInterests] = useState<string[]>(tripPlan.interests);

  const toggleInterest = (id: string) => {
    if (interests.includes(id)) {
      setInterests(interests.filter((i) => i !== id));
    } else if (interests.length < MAX_INTERESTS) {
      setInterests([...interests, id]);
    }
  };

  const handleContinue = async () => {
    updateTripPlan({ pace: rhythm, interests });
    await saveDraft();
    navigation.navigate("PlannerBudget", { city });
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
          <View style={[styles.progressDot, { backgroundColor: `rgba(${ct.accentRgb}, 0.3)` }, styles.progressDotActive, { backgroundColor: ct.secondary, width: 20 }]} />
          <View style={[styles.progressDot, { backgroundColor: `rgba(${ct.accentRgb}, 0.3)` }]} />
          <View style={[styles.progressDot, { backgroundColor: `rgba(${ct.accentRgb}, 0.3)` }]} />
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <View style={styles.iconWrapper}>
            <Feather name="sliders" size={32} color={"#9C6ADE"} />
          </View>
          <ThemedText style={styles.title}>Vos préférences</ThemedText>
          <ThemedText style={styles.subtitle}>
            Personnalisez votre expérience de voyage
          </ThemedText>
        </Animated.View>

        <Animated.View style={styles.section} entering={FadeInUp.delay(200).duration(400)}>
          <ThemedText style={styles.sectionTitle}>Rythme du séjour</ThemedText>
          <View style={styles.rhythmContainer}>
            {RHYTHM_OPTIONS.map((option) => (
              <Pressable
                key={option.id}
                style={[
                  styles.rhythmOption,
                  rhythm === option.id && { backgroundColor: RHYTHM_BG_COLORS[option.id], borderColor: RHYTHM_COLORS[option.id] },
                ]}
                onPress={() => setRhythm(option.id)}
              >
                {"recommended" in option && option.recommended && (
                  <View style={styles.rhythmBadge}>
                    <Feather name="star" size={10} color="#071A1A" />
                  </View>
                )}
                <View style={[
                  styles.rhythmIcon,
                  { backgroundColor: RHYTHM_BG_COLORS[option.id] },
                  rhythm === option.id && { backgroundColor: RHYTHM_COLORS[option.id] },
                ]}>
                  <Feather
                    name={option.icon as any}
                    size={20}
                    color={rhythm === option.id ? "#071A1A" : RHYTHM_COLORS[option.id]}
                  />
                </View>
                <ThemedText style={[
                  styles.rhythmLabel,
                  rhythm === option.id && { color: RHYTHM_COLORS[option.id] },
                ]}>
                  {option.label}
                </ThemedText>
                <ThemedText style={styles.rhythmDescription}>
                  {option.description}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        <Animated.View style={styles.section} entering={FadeInUp.delay(300).duration(400)}>
          <View style={styles.sectionTitleRow}>
            <ThemedText style={styles.sectionTitle}>Centres d'intérêt</ThemedText>
            <ThemedText style={[styles.interestCount, { color: ct.accent }]}>{interests.length}/{MAX_INTERESTS}</ThemedText>
          </View>
          <ThemedText style={styles.sectionHint}>Sélectionnez jusqu'à 5 options</ThemedText>
          <View style={styles.interestsGrid}>
            {INTEREST_OPTIONS.map((option) => (
              <Pressable
                key={option.id}
                style={[
                  styles.interestChip,
                  interests.includes(option.id) && { backgroundColor: INTEREST_COLORS[option.id], borderColor: INTEREST_COLORS[option.id] },
                  interests.length >= MAX_INTERESTS && !interests.includes(option.id) && styles.interestChipDisabled,
                ]}
                onPress={() => toggleInterest(option.id)}
                disabled={interests.length >= MAX_INTERESTS && !interests.includes(option.id)}
              >
                {option.recommended && !interests.includes(option.id) && (
                  <Feather name="star" size={12} color={INTEREST_COLORS[option.id]} style={styles.interestStar} />
                )}
                <Feather
                  name={option.icon as any}
                  size={16}
                  color={interests.includes(option.id) ? ct.background : INTEREST_COLORS[option.id]}
                />
                <ThemedText style={[
                  styles.interestLabel,
                  interests.includes(option.id) && styles.interestLabelSelected,
                ]}>
                  {option.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg, backgroundColor: `rgba(${ct.backgroundRgb}, 0.95)`, borderTopColor: `rgba(${ct.accentRgb}, 0.1)` }]}>
        <Pressable
          style={({ pressed }) => [
            styles.continueButton,
            pressed && styles.continueButtonPressed,
            interests.length === 0 && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={interests.length === 0}
        >
          <LinearGradient
            colors={interests.length > 0 ? [ct.secondary, ct.accent] : ["#555", "#444"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.continueGradient}
          >
            <ThemedText style={[
              styles.continueText,
              { color: ct.background },
              interests.length === 0 && styles.continueTextDisabled,
            ]}>
              Continuer
            </ThemedText>
            <Feather name="arrow-right" size={20} color={interests.length > 0 ? ct.background : "#888"} />
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
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(156,106,222,0.2)",
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
    marginBottom: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: AppColors.white,
    marginBottom: Spacing.xs,
  },
  interestCount: {
    fontSize: 13,
    color: "#9C6ADE",
    fontWeight: "600",
  },
  sectionHint: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.5)",
    marginBottom: Spacing.md,
  },
  rhythmContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  rhythmOption: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  rhythmBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: AppColors.sand,
    justifyContent: "center",
    alignItems: "center",
  },
  rhythmIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  rhythmLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: AppColors.white,
    marginBottom: 2,
  },
  rhythmDescription: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "center",
  },
  interestsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  interestChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "transparent",
  },
  interestChipDisabled: {
    opacity: 0.4,
  },
  interestStar: {
    marginRight: -2,
  },
  interestLabel: {
    fontSize: 13,
    color: AppColors.white,
  },
  interestLabelSelected: {
    color: "#071A1A",
    fontWeight: "600",
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
  continueButtonDisabled: {
    opacity: 0.6,
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
  continueTextDisabled: {
    color: "#888",
  },
});
