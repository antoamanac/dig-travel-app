import React from "react";
import { View, StyleSheet, Pressable, Dimensions } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { getCityTheme } from "@/constants/cityThemes";
import { formatPrice, type City } from "@/data/mockData";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.md) / 2;

interface ActivityBase {
  id: string;
  title: string;
  price: number;
  rating: number;
  reviewCount: number;
  category: string;
  image: string;
  operator?: string;
  operatorName?: string;
}

interface ActivityCardProps {
  activity: ActivityBase;
  city: City;
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const categoryLabels: Record<string, string> = {
  plage: "Plage",
  restaurant: "Restaurant",
  aventure: "Aventure",
  spa: "Spa",
  nightlife: "Vie nocturne",
  circuits: "Circuit",
  location: "Véhicule",
};

const formatRating = (rating: number): string => {
  return Number(rating).toFixed(1);
};

export function ActivityCard({ activity, city, onPress }: ActivityCardProps) {
  const scale = useSharedValue(1);
  const ct = getCityTheme(city.id);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.card, animatedStyle, { borderColor: ct.cardBorder }]}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: activity.image }}
          style={styles.image}
          contentFit="cover"
          transition={300}
        />
        <LinearGradient
          colors={["transparent", `rgba(${ct.backgroundRgb}, 0.95)`]}
          style={styles.imageOverlay}
        />
        <View style={[styles.ratingBadge, { backgroundColor: `rgba(${ct.backgroundRgb}, 0.85)` }]}>
          <Feather name="star" size={10} color="#FFD700" />
          <ThemedText style={styles.ratingBadgeText}>
            {formatRating(activity.rating)}
          </ThemedText>
        </View>
        <View style={[styles.categoryBadge, { backgroundColor: ct.secondary }]}>
          <ThemedText style={styles.categoryText}>
            {categoryLabels[activity.category] || activity.category}
          </ThemedText>
        </View>
      </View>

      <View style={styles.content}>
        <ThemedText style={styles.title} numberOfLines={2}>
          {activity.title}
        </ThemedText>

        <View style={styles.bottomRow}>
          <View style={styles.priceContainer}>
            <ThemedText style={styles.priceLabel}>dès</ThemedText>
            <ThemedText style={[styles.price, { color: ct.accent }]}>
              {formatPrice(activity.price, city.currency)}
            </ThemedText>
          </View>
          <View style={styles.reviewContainer}>
            <Feather name="message-circle" size={10} color="rgba(255,255,255,0.5)" />
            <ThemedText style={styles.reviewText}>
              {activity.reviewCount}
            </ThemedText>
          </View>
        </View>

        <View style={[styles.operatorRow, { borderTopColor: ct.accentSoft }]}>
          <Feather name="shield" size={10} color={ct.secondary} />
          <ThemedText style={styles.operatorText} numberOfLines={1}>
            {activity.operator || activity.operatorName || "DIG TRAVEL"}
          </ThemedText>
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: "#1a2a3a",
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: AppColors.sand20,
  },
  imageContainer: {
    width: "100%",
    aspectRatio: 4 / 3,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "50%",
  },
  ratingBadge: {
    position: "absolute",
    top: Spacing.xs,
    left: Spacing.xs,
    backgroundColor: "rgba(7, 26, 26, 0.85)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingBadgeText: {
    fontSize: 11,
    color: "#FFD700",
    fontWeight: "700",
  },
  categoryBadge: {
    position: "absolute",
    top: Spacing.xs,
    right: Spacing.xs,
    backgroundColor: AppColors.sand,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 9,
    color: "#0f1c2e",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  content: {
    padding: Spacing.sm,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    color: AppColors.white,
    minHeight: 34,
    lineHeight: 17,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.xs,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  priceLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.5)",
  },
  price: {
    fontSize: 16,
    fontWeight: "800",
    color: AppColors.sand,
  },
  reviewContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  reviewText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
  },
  operatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 212, 170, 0.15)",
  },
  operatorText: {
    fontSize: 10,
    color: "rgba(255,255,255,0.6)",
    flex: 1,
  },
});
