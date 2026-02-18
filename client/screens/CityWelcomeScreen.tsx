import React, { useEffect } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { AppColors, Spacing } from "@/constants/theme";
import { getCityTheme } from "@/constants/cityThemes";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "CityWelcome">;
type RouteProps = RouteProp<RootStackParamList, "CityWelcome">;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function CityWelcomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { city } = route.params;
  const ct = getCityTheme(city.id);
  const insets = useSafeAreaInsets();

  const imageScale = useSharedValue(1.15);
  const overlayOpacity = useSharedValue(0);
  const welcomeY = useSharedValue(40);
  const welcomeOpacity = useSharedValue(0);
  const cityNameScale = useSharedValue(0.85);
  const cityNameOpacity = useSharedValue(0);
  const messageY = useSharedValue(20);
  const messageOpacity = useSharedValue(0);
  const brandingY = useSharedValue(15);
  const brandingOpacity = useSharedValue(0);
  const lineWidth = useSharedValue(0);

  const navigateToLanding = () => {
    navigation.replace("ModeSelection", { city });
  };

  useEffect(() => {
    imageScale.value = withTiming(1, { duration: 2800, easing: Easing.out(Easing.cubic) });
    overlayOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) });

    welcomeOpacity.value = withDelay(200, withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) }));
    welcomeY.value = withDelay(200, withSpring(0, { damping: 18, stiffness: 90 }));

    cityNameOpacity.value = withDelay(500, withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) }));
    cityNameScale.value = withDelay(500, withSpring(1, { damping: 14, stiffness: 70 }));

    lineWidth.value = withDelay(800, withTiming(100, { duration: 700, easing: Easing.out(Easing.cubic) }));

    messageOpacity.value = withDelay(1800, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
    messageY.value = withDelay(1800, withSpring(0, { damping: 20, stiffness: 80 }));

    brandingOpacity.value = withDelay(2800, withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) }));
    brandingY.value = withDelay(2800, withSpring(0, { damping: 18, stiffness: 90 }));

    const timer = setTimeout(() => {
      navigateToLanding();
    }, 5200);

    return () => clearTimeout(timer);
  }, []);

  const imageStyle = useAnimatedStyle(() => ({
    transform: [{ scale: imageScale.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const welcomeStyle = useAnimatedStyle(() => ({
    opacity: welcomeOpacity.value,
    transform: [{ translateY: welcomeY.value }],
  }));

  const cityNameStyle = useAnimatedStyle(() => ({
    opacity: cityNameOpacity.value,
    transform: [{ scale: cityNameScale.value }],
  }));

  const lineStyle = useAnimatedStyle(() => ({
    width: lineWidth.value,
  }));

  const messageStyle = useAnimatedStyle(() => ({
    opacity: messageOpacity.value,
    transform: [{ translateY: messageY.value }],
  }));

  const brandingStyle = useAnimatedStyle(() => ({
    opacity: brandingOpacity.value,
    transform: [{ translateY: brandingY.value }],
  }));

  return (
    <View style={[styles.container, { backgroundColor: ct.background }]}>
      <Animated.View style={[styles.imageContainer, imageStyle]}>
        <Image
          source={typeof city.image === "string" ? { uri: city.image } : city.image}
          style={styles.backgroundImage}
          contentFit="cover"
        />
      </Animated.View>

      <Animated.View style={[styles.overlay, overlayStyle]}>
        <LinearGradient
          colors={[ct.gradientOverlay[0], ct.gradientOverlay[1], ct.gradientOverlay[2]]}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <View style={styles.content}>
        <View style={styles.mainContent}>
          <Animated.View style={welcomeStyle}>
            <ThemedText style={styles.welcomeText}>BIENVENUE A</ThemedText>
          </Animated.View>

          <Animated.View style={cityNameStyle}>
            <ThemedText style={[styles.cityName, { textShadowColor: `rgba(${ct.accentRgb}, 0.3)` }]}>{city.name.toUpperCase()}</ThemedText>
          </Animated.View>

          <Animated.View style={[styles.decorativeLine, lineStyle, { backgroundColor: ct.accent }]} />
        </View>

        <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + Spacing.xl }]}>
          <Animated.View style={[styles.messageContainer, messageStyle]}>
            <ThemedText style={[styles.messageText, { color: `rgba(${ct.accentRgb}, 0.95)` }]}>
              Nous préparons la meilleure expérience pour votre séjour.
            </ThemedText>
          </Animated.View>
          <Animated.View style={[styles.brandingContent, brandingStyle, { backgroundColor: `rgba(${ct.accentRgb}, 0.1)`, borderColor: `rgba(${ct.accentRgb}, 0.2)` }]}>
            <ThemedText style={styles.brandingText}>
              Opéré par{" "}
              <ThemedText style={[styles.brandingHighlight, { color: ct.accent }]}>{city.operator}</ThemedText>
            </ThemedText>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#071A1A",
  },
  imageContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
  },
  mainContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.85)",
    letterSpacing: 4,
  },
  cityName: {
    fontSize: 48,
    fontWeight: "900",
    color: AppColors.white,
    letterSpacing: 4,
    marginTop: Spacing.sm,
    textAlign: "center",
    textShadowColor: "rgba(0, 217, 192, 0.3)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  decorativeLine: {
    height: 3,
    backgroundColor: "#00D9C0",
    marginTop: Spacing.lg,
    borderRadius: 2,
  },
  bottomContainer: {
    alignItems: "center",
    gap: Spacing.lg,
  },
  messageContainer: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  messageText: {
    fontSize: 15,
    color: "rgba(0, 217, 192, 0.95)",
    textAlign: "center",
    lineHeight: 24,
    fontStyle: "italic",
    fontWeight: "300",
    letterSpacing: 0.3,
  },
  aiHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: "rgba(0, 217, 192, 0.1)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 16,
  },
  aiHintText: {
    fontSize: 12,
    color: AppColors.secondary,
    fontWeight: "600",
  },
  brandingContent: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 217, 192, 0.1)",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0, 217, 192, 0.2)",
  },
  brandingText: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
    marginLeft: Spacing.xs,
    fontWeight: "500",
  },
  brandingHighlight: {
    color: "#00D9C0",
    fontWeight: "700",
  },
});
