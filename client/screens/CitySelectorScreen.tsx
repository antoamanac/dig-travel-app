import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withDelay,
  FadeInDown,
  Easing,
} from "react-native-reanimated";
import { Image } from "expo-image";
import { Feather, FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { AppColors, Spacing } from "@/constants/theme";
import { cities } from "@/data/mockData";
import { getCityTheme } from "@/constants/cityThemes";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { City } from "@/data/mockData";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "CitySelector">;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface CityCardProps {
  city: City;
  onPress: () => void;
  index: number;
  isSelected: boolean;
}

function CityCard({ city, onPress, index, isSelected }: CityCardProps) {
  const ct = getCityTheme(city.id);
  const scale = useSharedValue(1);
  const cardOpacity = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: cardOpacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 12, stiffness: 180 });
    glowOpacity.value = withTiming(1, { duration: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 180 });
    glowOpacity.value = withTiming(0, { duration: 300 });
  };

  const handlePress = () => {
    scale.value = withSpring(0.95, { damping: 10, stiffness: 150 });
    glowOpacity.value = withTiming(1, { duration: 150 });
    onPress();
  };

  return (
    <Animated.View 
      entering={FadeInDown.delay(index * 120).duration(500).springify()}
      style={styles.cardWrapper}
    >
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.cityCard, animatedStyle]}
      >
        <Image
          source={typeof city.image === "string" ? { uri: city.image } : city.image}
          style={styles.cityImage}
          contentFit="cover"
          transition={400}
        />
        
        <LinearGradient
          colors={["transparent", `rgba(${ct.backgroundRgb}, 0.6)`, `rgba(${ct.backgroundRgb}, 0.9)`]}
          locations={[0, 0.5, 1]}
          style={styles.cityGradient}
        />

        <Animated.View style={[styles.glowBorder, glowStyle, { borderColor: ct.accent }]} />

        <View style={styles.cityContent}>
          <View style={styles.cityInfo}>
            <ThemedText style={styles.cityName}>{city.name}</ThemedText>
            <View style={[styles.activityBadge, { backgroundColor: `rgba(${ct.accentRgb}, 0.15)` }]}>
              <Feather name="map-pin" size={12} color={ct.accent} />
              <ThemedText style={[styles.activityCount, { color: ct.accent }]}>
                {city.activityCount} activités
              </ThemedText>
            </View>
          </View>
          
          <View style={[styles.arrowCircle, { backgroundColor: `rgba(${ct.accentRgb}, 0.2)`, borderColor: `rgba(${ct.accentRgb}, 0.4)` }]}>
            <Feather name="chevron-right" size={20} color={AppColors.white} />
          </View>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function CitySelectorScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  const handleCityPress = async (city: City) => {
    setSelectedCity(city.id);
    
    try {
      await AsyncStorage.setItem("selectedCity", JSON.stringify(city));
    } catch (error) {
      console.error("Error saving city:", error);
    }

    setTimeout(() => {
      navigation.navigate("CityWelcome", { city });
    }, 400);
  };

  const handleProfilePress = () => {
    navigation.navigate("Profile");
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.lg }]}>
      <Pressable
        onPress={handleProfilePress}
        style={[styles.profileButton, { top: insets.top + Spacing.sm }]}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <View style={styles.profileIconContainer}>
          <Feather name="user" size={20} color="#00D9C0" />
        </View>
      </Pressable>

      <Animated.View 
        style={styles.header}
        entering={FadeInDown.delay(0).springify()}
      >
        <View style={styles.logoRow}>
          <FontAwesome5 name="plane" size={18} color="#00D9C0" style={styles.logoIcon} />
          <ThemedText style={styles.logoText}>DIG TRAVEL</ThemedText>
        </View>
        <ThemedText style={styles.title}>Ou voyages-tu ?</ThemedText>
        <ThemedText style={styles.subtitle}>Choisis ta destination</ThemedText>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {cities.map((city, index) => (
          <CityCard
            key={city.id}
            city={city}
            index={index}
            isSelected={selectedCity === city.id}
            onPress={() => handleCityPress(city)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  logoIcon: {
    marginRight: 8,
    transform: [{ rotate: "-45deg" }],
  },
  logoText: {
    fontSize: 14,
    fontWeight: "700",
    color: AppColors.primary,
    letterSpacing: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: AppColors.primary,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "400",
    color: "rgba(26, 26, 46, 0.5)",
    textAlign: "center",
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: 16,
  },
  cardWrapper: {
    borderRadius: 24,
  },
  cityCard: {
    height: 160,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#1a1a2e",
  },
  cityImage: {
    ...StyleSheet.absoluteFillObject,
  },
  cityGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  glowBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#00D9C0",
  },
  cityContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    padding: 20,
  },
  cityInfo: {
    flex: 1,
  },
  cityName: {
    fontSize: 26,
    fontWeight: "800",
    color: AppColors.white,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  activityBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 217, 192, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  activityCount: {
    fontSize: 12,
    color: "#00D9C0",
    marginLeft: 5,
    fontWeight: "600",
  },
  arrowCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 217, 192, 0.2)",
    borderWidth: 1.5,
    borderColor: "rgba(0, 217, 192, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  profileButton: {
    position: "absolute",
    top: 0,
    right: Spacing.lg,
    zIndex: 10,
    padding: Spacing.xs,
  },
  profileIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(7, 26, 26, 0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(0, 217, 192, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
});
