import React, { useEffect } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { FontAwesome5 } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { AppColors, Spacing } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Splash">;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function SplashScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();

  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.85);
  const planeX = useSharedValue(0);
  const planeY = useSharedValue(0);
  const planeRotate = useSharedValue(-45);
  const planeScale = useSharedValue(1);
  const planeOpacity = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);
  const subtitleY = useSharedValue(20);
  const loaderOpacity = useSharedValue(0);
  const contentOpacity = useSharedValue(1);

  const navigateToMain = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "CitySelector" }],
    });
  };

  useEffect(() => {
    // Phase 1: Logo and plane appear together (0-800ms)
    logoOpacity.value = withDelay(200, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
    logoScale.value = withDelay(200, withSpring(1, { damping: 12, stiffness: 80 }));
    planeOpacity.value = withDelay(200, withTiming(1, { duration: 700 }));

    // Phase 2: Plane does a small "taxi" animation (800-1600ms)
    planeX.value = withDelay(
      800,
      withSequence(
        withTiming(8, { duration: 300, easing: Easing.inOut(Easing.ease) }),
        withTiming(-4, { duration: 250, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 250, easing: Easing.inOut(Easing.ease) })
      )
    );

    // Phase 3: Subtitle and loader appear (1200-1800ms)
    subtitleOpacity.value = withDelay(1200, withTiming(1, { duration: 500 }));
    subtitleY.value = withDelay(1200, withSpring(0, { damping: 15, stiffness: 100 }));
    loaderOpacity.value = withDelay(1500, withTiming(1, { duration: 400 }));

    // Phase 4: Plane flies off screen (2600-3200ms)
    planeX.value = withDelay(
      2600,
      withTiming(SCREEN_WIDTH + 100, { duration: 600, easing: Easing.in(Easing.cubic) })
    );
    planeY.value = withDelay(
      2600,
      withTiming(-SCREEN_HEIGHT / 3, { duration: 600, easing: Easing.in(Easing.cubic) })
    );
    planeRotate.value = withDelay(
      2600,
      withTiming(-25, { duration: 600, easing: Easing.in(Easing.cubic) })
    );
    planeScale.value = withDelay(
      2600,
      withTiming(0.6, { duration: 600, easing: Easing.in(Easing.cubic) })
    );

    // Fade out content slightly as plane flies
    contentOpacity.value = withDelay(
      2800,
      withTiming(0.4, { duration: 400, easing: Easing.out(Easing.ease) })
    );

    // Navigate after plane flies off
    const timer = setTimeout(() => {
      navigateToMain();
    }, 3300);

    return () => clearTimeout(timer);
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const planeStyle = useAnimatedStyle(() => ({
    opacity: planeOpacity.value,
    transform: [
      { translateX: planeX.value },
      { translateY: planeY.value },
      { rotate: `${planeRotate.value}deg` },
      { scale: planeScale.value },
    ],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleY.value }],
  }));

  const loaderStyle = useAnimatedStyle(() => ({
    opacity: loaderOpacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  return (
    <LinearGradient
      colors={["#071A1A", AppColors.primary, "#1e3a5f"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Animated.View style={[styles.content, contentStyle]}>
        <Animated.View style={[styles.logoContainer, logoStyle]}>
          <View style={styles.logoRow}>
            <ThemedText style={styles.logoDig}>DIG</ThemedText>
            <Animated.View style={[styles.planeInLogo, planeStyle]}>
              <FontAwesome5 name="plane" size={32} color="#00D9C0" />
            </Animated.View>
          </View>
          <ThemedText style={styles.logoTravel}>TRAVEL</ThemedText>
        </Animated.View>

        <Animated.View style={subtitleStyle}>
          <ThemedText style={styles.subtitle}>
            Vivez des expériences inoubliables
          </ThemedText>
        </Animated.View>
      </Animated.View>

      <Animated.View style={[styles.loaderContainer, { bottom: insets.bottom + 60 }, loaderStyle]}>
        <View style={styles.loaderDots}>
          <LoadingDot delay={0} />
          <LoadingDot delay={200} />
          <LoadingDot delay={400} />
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

function LoadingDot({ delay }: { delay: number }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    const animate = () => {
      opacity.value = withDelay(
        delay,
        withSequence(
          withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 400, easing: Easing.inOut(Easing.ease) })
        )
      );
    };
    animate();
    const interval = setInterval(animate, 800);
    return () => clearInterval(interval);
  }, [delay]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.dot, dotStyle]} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
  },
  logoContainer: {
    alignItems: "center",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoDig: {
    fontSize: 64,
    fontWeight: "900",
    color: AppColors.white,
    letterSpacing: 8,
    textShadowColor: "rgba(0, 217, 192, 0.4)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  planeInLogo: {
    marginLeft: 12,
  },
  logoTravel: {
    fontSize: 42,
    fontWeight: "300",
    color: "#00D9C0",
    letterSpacing: 14,
    marginTop: -2,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: Spacing.xl,
    textAlign: "center",
    fontWeight: "400",
    letterSpacing: 1,
  },
  loaderContainer: {
    position: "absolute",
    alignItems: "center",
  },
  loaderDots: {
    flexDirection: "row",
    gap: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#00D9C0",
  },
});
