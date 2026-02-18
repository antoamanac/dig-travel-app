import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Dimensions,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn,
  FadeInLeft,
  SlideInUp,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  withDelay,
  interpolate,
  Easing,
  runOnJS,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { useCity } from "@/context/CityContext";
import { useTripPlan } from "@/context/TripPlanContext";
import { getCityTheme } from "@/constants/cityThemes";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "ModeSelection">;
type ScreenRouteProp = RouteProp<RootStackParamList, "ModeSelection">;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 48;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const modeLibreImage = require("@/assets/images/mode-libre.png");
const modePilotImage = require("@/assets/images/mode-pilot.png");

export default function ModeSelectionScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRouteProp>();
  const insets = useSafeAreaInsets();
  const { city } = route.params;
  const ct = getCityTheme(city.id);
  const { setCurrentCity } = useCity();
  const { pilotSeen, setPilotSeen, updateTripPlan, resetTripPlan } = useTripPlan();
  
  const [showPilotModal, setShowPilotModal] = useState(false);

  const pulseExplore = useSharedValue(1);
  const pulsePilot = useSharedValue(1);
  const shimmer = useSharedValue(0);

  useEffect(() => {
    pulseExplore.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    pulsePilot.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    shimmer.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const exploreAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseExplore.value }],
  }));

  const pilotAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulsePilot.value }],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 0.5, 1], [0.4, 1, 0.4]),
  }));

  const handleExploreMode = () => {
    setCurrentCity(city);
    updateTripPlan({ mode: "FREE", destination: city.name, destinationCity: city });
    navigation.replace("MainTabs", { city });
  };

  const handlePilotMode = () => {
    setCurrentCity(city);
    resetTripPlan();
    updateTripPlan({ mode: "PILOT", destination: city.name, destinationCity: city });
    
    if (!pilotSeen) {
      setShowPilotModal(true);
    } else {
      navigation.navigate("PlannerBasicInfo", { city });
    }
  };

  const handleModalContinue = () => {
    setPilotSeen();
    setShowPilotModal(false);
    navigation.navigate("PlannerBasicInfo", { city });
  };

  return (
    <View style={[styles.container, { backgroundColor: ct.background }]}>
      <Image
        source={typeof city.image === "string" ? { uri: city.image } : city.image}
        style={styles.backgroundImage}
        contentFit="cover"
      />
      <LinearGradient
        colors={ct.gradientOverlay}
        locations={[0, 0.45, 0.85]}
        style={StyleSheet.absoluteFill}
      />

      <Pressable
        style={[styles.backButton, { top: insets.top + Spacing.sm }]}
        onPress={() => navigation.goBack()}
      >
        <Feather name="chevron-left" size={24} color={AppColors.white} />
      </Pressable>

      <View style={[styles.content, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + Spacing.lg }]}>
        <Animated.View 
          style={styles.header}
          entering={FadeInDown.delay(100).duration(500).springify()}
        >
          <ThemedText style={styles.welcomeText}>
            {city.name}
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Choisissez votre mode d'exploration
          </ThemedText>
        </Animated.View>

        <View style={styles.optionsContainer}>
          <Animated.View entering={FadeInUp.delay(300).duration(600).springify()}>
            <AnimatedPressable
              style={[exploreAnimStyle, styles.optionCard]}
              onPress={handleExploreMode}
            >
              <View style={styles.cardImageContainer}>
                <Image
                  source={modeLibreImage}
                  style={styles.cardImage}
                  contentFit="cover"
                />
                <LinearGradient
                  colors={["transparent", `rgba(${ct.backgroundRgb}, 0.6)`, `rgba(${ct.backgroundRgb}, 0.95)`]}
                  locations={[0, 0.5, 1]}
                  style={styles.cardImageOverlay}
                />
              </View>
              <View style={styles.cardContent}>
                <View style={styles.cardTitleRow}>
                  <View style={[styles.exploreIconCircle, { backgroundColor: ct.secondarySoft, borderColor: `rgba(${ct.secondaryRgb}, 0.2)` }]}>
                    <Feather name="compass" size={18} color={ct.secondary} />
                  </View>
                  <ThemedText style={styles.cardTitle}>MODE LIBRE</ThemedText>
                </View>
                <ThemedText style={styles.cardDescription}>
                  Explorez les activités à votre rythme, sans contrainte
                </ThemedText>
                <View style={styles.cardFeatures}>
                  <View style={[styles.featureTag, { backgroundColor: ct.secondarySoft }]}>
                    <Feather name="map-pin" size={11} color={ct.secondary} />
                    <ThemedText style={[styles.featureText, { color: ct.secondary }]}>Libre</ThemedText>
                  </View>
                  <View style={[styles.featureTag, { backgroundColor: ct.secondarySoft }]}>
                    <Feather name="heart" size={11} color={ct.secondary} />
                    <ThemedText style={[styles.featureText, { color: ct.secondary }]}>Favoris</ThemedText>
                  </View>
                  <View style={[styles.featureTag, { backgroundColor: ct.secondarySoft }]}>
                    <Feather name="clock" size={11} color={ct.secondary} />
                    <ThemedText style={[styles.featureText, { color: ct.secondary }]}>Flexible</ThemedText>
                  </View>
                </View>
              </View>
              <View style={[styles.cardArrow, { backgroundColor: ct.secondarySoft }]}>
                <Feather name="arrow-right" size={18} color={ct.secondary} />
              </View>
            </AnimatedPressable>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(500).duration(600).springify()}>
            <AnimatedPressable
              style={[pilotAnimStyle, styles.optionCard, styles.pilotCard, { borderColor: `rgba(${ct.accentRgb}, 0.35)` }]}
              onPress={handlePilotMode}
            >
              <View style={styles.cardImageContainer}>
                <Image
                  source={modePilotImage}
                  style={styles.cardImage}
                  contentFit="cover"
                />
                <LinearGradient
                  colors={["transparent", `rgba(${ct.backgroundRgb}, 0.6)`, `rgba(${ct.backgroundRgb}, 0.95)`]}
                  locations={[0, 0.5, 1]}
                  style={styles.cardImageOverlay}
                />
                <Animated.View style={[styles.pilotGlow, shimmerStyle]}>
                  <LinearGradient
                    colors={["transparent", `rgba(${ct.accentRgb}, 0.15)`, "transparent"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                </Animated.View>
              </View>
              <View style={[styles.recommendedBadge, { backgroundColor: ct.accent }]}>
                <Feather name="star" size={10} color={ct.background} />
                <ThemedText style={[styles.recommendedText, { color: ct.background }]}>RECOMMAND{"\u00c9"}</ThemedText>
              </View>
              <View style={styles.cardContent}>
                <View style={styles.cardTitleRow}>
                  <View style={[styles.pilotIconCircle, { backgroundColor: ct.accent }]}>
                    <Feather name="navigation" size={16} color={ct.background} />
                  </View>
                  <ThemedText style={styles.cardTitle}>DIG PILOT</ThemedText>
                  <Animated.View style={shimmerStyle}>
                    <View style={[styles.aiBadge, { backgroundColor: `rgba(${ct.accentRgb}, 0.15)`, borderColor: `rgba(${ct.accentRgb}, 0.3)` }]}>
                      <Feather name="cpu" size={10} color={ct.accent} />
                      <ThemedText style={[styles.aiBadgeText, { color: ct.accent }]}>IA</ThemedText>
                    </View>
                  </Animated.View>
                </View>
                <ThemedText style={styles.cardDescription}>
                  Planning sur mesure, optimisé par intelligence artificielle
                </ThemedText>
                <View style={styles.cardFeatures}>
                  <View style={[styles.featureTag, styles.pilotFeatureTag, { backgroundColor: `rgba(${ct.accentRgb}, 0.1)` }]}>
                    <Feather name="zap" size={11} color={ct.accent} />
                    <ThemedText style={[styles.featureText, styles.pilotFeatureText, { color: ct.accent }]}>2 min</ThemedText>
                  </View>
                  <View style={[styles.featureTag, styles.pilotFeatureTag, { backgroundColor: `rgba(${ct.accentRgb}, 0.1)` }]}>
                    <Feather name="calendar" size={11} color={ct.accent} />
                    <ThemedText style={[styles.featureText, styles.pilotFeatureText, { color: ct.accent }]}>Jour par jour</ThemedText>
                  </View>
                  <View style={[styles.featureTag, styles.pilotFeatureTag, { backgroundColor: `rgba(${ct.accentRgb}, 0.1)` }]}>
                    <Feather name="target" size={11} color={ct.accent} />
                    <ThemedText style={[styles.featureText, styles.pilotFeatureText, { color: ct.accent }]}>Sur mesure</ThemedText>
                  </View>
                </View>
              </View>
              <View style={[styles.cardArrow, styles.pilotArrow, { backgroundColor: `rgba(${ct.accentRgb}, 0.15)` }]}>
                <Feather name="arrow-right" size={18} color={ct.accent} />
              </View>
            </AnimatedPressable>
          </Animated.View>
        </View>

        <Animated.View 
          style={styles.footer}
          entering={FadeInUp.delay(700).duration(400)}
        >
          <ThemedText style={styles.footerText}>
            Op{"\u00e9"}r{"\u00e9"} par {city.operator}
          </ThemedText>
        </Animated.View>
      </View>

      <Modal
        visible={showPilotModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPilotModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            style={[styles.modalContent, { borderColor: `rgba(${ct.accentRgb}, 0.15)` }]}
            entering={SlideInUp.duration(500).springify().damping(18)}
          >
            <LinearGradient
              colors={[`rgba(${ct.accentRgb}, 0.08)`, "transparent"]}
              style={styles.modalGlowTop}
            />

            <Animated.View 
              style={styles.modalIconWrapper}
              entering={ZoomIn.delay(200).duration(400).springify()}
            >
              <LinearGradient
                colors={[ct.accent, `rgba(${ct.accentRgb}, 0.7)`]}
                style={styles.modalIconGradient}
              >
                <Feather name="send" size={28} color={ct.background} />
              </LinearGradient>
              <View style={[styles.modalIconRing, { borderColor: `rgba(${ct.accentRgb}, 0.2)` }]} />
            </Animated.View>
            
            <Animated.View entering={FadeIn.delay(300).duration(400)}>
              <ThemedText style={styles.modalTitle}>
                DIG PILOT va cr{"\u00e9"}er votre{"\n"}planning parfait
              </ThemedText>
            </Animated.View>

            <View style={styles.modalBullets}>
              {[
                { icon: "calendar" as const, text: "Organiser votre s\u00e9jour jour par jour", accent: ct.accent },
                { icon: "navigation" as const, text: "Optimiser vos trajets (z\u00e9ro temps perdu)", accent: ct.secondary },
                { icon: "shield" as const, text: "Respecter votre budget", accent: "#4CAF50" },
                { icon: "target" as const, text: "S\u00e9lectionner uniquement ce qui VOUS pla\u00eet", accent: "#FF5DA2" },
              ].map((item, index) => (
                <Animated.View
                  key={index}
                  entering={FadeInLeft.delay(400 + index * 120).duration(400).springify()}
                >
                  <View style={styles.bulletItem}>
                    <View style={styles.bulletNumberContainer}>
                      <LinearGradient
                        colors={[item.accent, `${item.accent}88`]}
                        style={styles.bulletNumberGradient}
                      >
                        <Feather name={item.icon} size={15} color={ct.background} />
                      </LinearGradient>
                    </View>
                    <View style={styles.bulletTextContainer}>
                      <ThemedText style={styles.bulletText}>{item.text}</ThemedText>
                    </View>
                    <Feather name="check" size={14} color={item.accent} style={{ opacity: 0.7 }} />
                  </View>
                </Animated.View>
              ))}
            </View>

            <Animated.View 
              style={styles.modalTimeHint}
              entering={FadeIn.delay(900).duration(400)}
            >
              <View style={styles.timeChip}>
                <Feather name="zap" size={13} color={ct.secondary} />
                <ThemedText style={[styles.modalTimeText, { color: ct.secondary }]}>{"\u00c7"}a prend 2 minutes</ThemedText>
              </View>
            </Animated.View>

            <Animated.View 
              style={{ alignSelf: "stretch" }}
              entering={FadeInDown.delay(1000).duration(400).springify()}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.modalButton,
                  pressed && styles.modalButtonPressed,
                ]}
                onPress={handleModalContinue}
              >
                <LinearGradient
                  colors={[ct.accent, `rgba(${ct.accentRgb}, 0.7)`]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalButtonGradient}
                >
                  <ThemedText style={[styles.modalButtonText, { color: ct.background }]}>C'est parti</ThemedText>
                  <View style={styles.buttonArrowCircle}>
                    <Feather name="arrow-right" size={16} color={ct.accent} />
                  </View>
                </LinearGradient>
              </Pressable>
            </Animated.View>

            <Pressable 
              style={styles.modalCloseButton}
              onPress={() => setShowPilotModal(false)}
            >
              <ThemedText style={styles.modalCloseText}>Plus tard</ThemedText>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#071A1A",
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  backButton: {
    position: "absolute",
    left: Spacing.lg,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: "800",
    color: AppColors.white,
    textAlign: "center",
    marginBottom: Spacing.xs,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    lineHeight: 22,
  },
  optionsContainer: {
    gap: Spacing.md,
  },
  optionCard: {
    width: CARD_WIDTH,
    borderRadius: BorderRadius.lg,
    backgroundColor: "rgba(26, 42, 58, 0.9)",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: AppColors.sand20,
  },
  pilotCard: {
    borderColor: "rgba(0, 217, 192, 0.35)",
  },
  cardImageContainer: {
    width: "100%",
    height: 120,
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  cardImageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  pilotGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  cardContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    paddingTop: Spacing.xs,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: 6,
  },
  exploreIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: AppColors.sand10,
    borderWidth: 1,
    borderColor: AppColors.sand20,
    justifyContent: "center",
    alignItems: "center",
  },
  pilotIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: AppColors.secondary,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: AppColors.white,
    letterSpacing: 0.5,
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(0, 217, 192, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0, 217, 192, 0.3)",
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: AppColors.secondary,
  },
  cardDescription: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.6)",
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  cardFeatures: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  featureTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: AppColors.sand10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pilotFeatureTag: {
    backgroundColor: "rgba(0, 217, 192, 0.1)",
  },
  featureText: {
    fontSize: 11,
    color: AppColors.sand,
    fontWeight: "600",
  },
  pilotFeatureText: {
    color: AppColors.secondary,
  },
  cardArrow: {
    position: "absolute",
    right: Spacing.md,
    bottom: Spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AppColors.sand10,
    justifyContent: "center",
    alignItems: "center",
  },
  pilotArrow: {
    backgroundColor: "rgba(0, 217, 192, 0.15)",
  },
  recommendedBadge: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: AppColors.sand,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 2,
  },
  recommendedText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#071A1A",
    letterSpacing: 0.3,
  },
  footer: {
    alignItems: "center",
  },
  footerText: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.5)",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: "#0f1f38",
    borderRadius: 28,
    padding: 28,
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0, 217, 192, 0.15)",
    overflow: "hidden",
  },
  modalGlowTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  modalIconWrapper: {
    marginBottom: Spacing.lg,
    position: "relative",
  },
  modalIconGradient: {
    width: 68,
    height: 68,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  modalIconRing: {
    position: "absolute",
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "rgba(0, 217, 192, 0.2)",
  },
  modalTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: AppColors.white,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  modalBullets: {
    alignSelf: "stretch",
    gap: 12,
    marginBottom: 24,
  },
  bulletItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  bulletNumberContainer: {
    width: 36,
    height: 36,
  },
  bulletNumberGradient: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  bulletTextContainer: {
    flex: 1,
  },
  bulletText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 20,
    fontWeight: "500",
  },
  modalTimeHint: {
    alignItems: "center",
    marginBottom: 20,
  },
  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(254, 228, 64, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(254, 228, 64, 0.15)",
  },
  modalTimeText: {
    fontSize: 13,
    color: AppColors.sand,
    fontWeight: "600",
  },
  modalButton: {
    alignSelf: "stretch",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: Spacing.md,
  },
  modalButtonPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  modalButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: 16,
    paddingHorizontal: Spacing.xl,
  },
  modalButtonText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#071A1A",
    letterSpacing: 0.3,
  },
  buttonArrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(7, 26, 26, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  modalCloseText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.4)",
    fontWeight: "500",
  },
});
