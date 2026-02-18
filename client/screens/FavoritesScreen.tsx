import React, { useMemo } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { useFavorites } from "@/context/FavoritesContext";
import { useCity, useCityTheme } from "@/context/CityContext";
import { formatPrice } from "@/data/mockData";
import type { Activity } from "@/data/mockData";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - Spacing.xl * 2 - Spacing.md) / 2;

export default function FavoritesScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { favorites, toggleFavorite } = useFavorites();
  const { currentCity } = useCity();
  const ct = useCityTheme();

  const cityFavorites = useMemo(() => {
    if (!currentCity) return [];
    return favorites.filter((a) => a.cityId === currentCity.id);
  }, [favorites, currentCity]);

  const handleActivityPress = (activity: Activity) => {
    if (currentCity) {
      navigation.navigate("HomeTab", {
        screen: "ActivityDetail",
        params: { activity, city: currentCity },
      });
    }
  };

  const handleRemoveFavorite = (activity: Activity) => {
    toggleFavorite(activity);
  };

  const handleExploreDestinations = () => {
    navigation.navigate("CitySelector");
  };

  const cityName = currentCity?.name || "cette ville";

  return (
    <View style={[styles.container, { backgroundColor: ct.background }]}>
      <LinearGradient
        colors={[ct.background, ct.backgroundLight, ct.background]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <ThemedText style={styles.headerTitle}>Mes favoris</ThemedText>
        {currentCity ? (
          <View style={[styles.cityBadge, { backgroundColor: `rgba(${ct.accentRgb}, 0.1)` }]}>
            <Feather name="map-pin" size={12} color={ct.accent} />
            <ThemedText style={[styles.cityBadgeText, { color: ct.accent }]}>{cityName}</ThemedText>
          </View>
        ) : null}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {cityFavorites.length === 0 ? (
          <Animated.View
            style={styles.emptyContainer}
            entering={FadeInDown.delay(100).duration(400)}
          >
            <View style={styles.emptyIconContainer}>
              <Ionicons name="heart-outline" size={48} color="#FF5DA2" />
            </View>
            <ThemedText style={styles.emptyTitle}>
              Pas de favoris à {cityName}
            </ThemedText>
            <ThemedText style={styles.emptySubtitle}>
              Explorez les activités de {cityName} et ajoutez vos coups de coeur
            </ThemedText>
            <Pressable
              style={[styles.exploreButton, { backgroundColor: ct.accent }]}
              onPress={handleExploreDestinations}
            >
              <Feather name="compass" size={18} color={AppColors.white} />
              <ThemedText style={styles.exploreButtonText}>
                Explorer d'autres destinations
              </ThemedText>
            </Pressable>
          </Animated.View>
        ) : (
          <>
            <Animated.View
              entering={FadeInDown.delay(100).duration(400)}
              style={styles.countBadge}
            >
              <Ionicons name="heart" size={14} color="#FF5DA2" />
              <ThemedText style={styles.countText}>
                {cityFavorites.length} favori{cityFavorites.length > 1 ? "s" : ""}
              </ThemedText>
            </Animated.View>

            <View style={styles.grid}>
              {cityFavorites.map((activity, index) => (
                <Animated.View
                  key={activity.id}
                  entering={FadeInUp.delay(150 + index * 50).duration(400)}
                  style={styles.cardContainer}
                >
                  <Pressable
                    style={[styles.card, { backgroundColor: ct.cardBg, borderColor: ct.cardBorder }]}
                    onPress={() => handleActivityPress(activity)}
                  >
                    <View style={styles.imageContainer}>
                      <Image
                        source={{ uri: activity.images[0] }}
                        style={styles.cardImage}
                        contentFit="cover"
                        transition={200}
                      />
                      <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.6)"]}
                        style={styles.cardGradient}
                      />
                      <Pressable
                        style={styles.favoriteButton}
                        onPress={() => handleRemoveFavorite(activity)}
                      >
                        <Ionicons name="heart" size={16} color="#FF5DA2" />
                      </Pressable>
                    </View>
                    <View style={styles.cardContent}>
                      <ThemedText style={styles.cardTitle} numberOfLines={2}>
                        {activity.title}
                      </ThemedText>
                      <View style={styles.cardMeta}>
                        <View style={styles.ratingBadge}>
                          <Feather name="star" size={10} color="#FFD700" />
                          <ThemedText style={styles.ratingText}>
                            {Number(activity.rating).toFixed(1)}
                          </ThemedText>
                        </View>
                        <ThemedText style={[styles.cardPrice, { color: ct.accent }]}>
                          {formatPrice(activity.price, currentCity?.currency || "EUR")}
                        </ThemedText>
                      </View>
                    </View>
                  </Pressable>
                </Animated.View>
              ))}
            </View>

            <Animated.View
              entering={FadeInDown.delay(400).duration(400)}
              style={[styles.bottomPrompt, { backgroundColor: `rgba(${ct.backgroundRgb}, 0.4)`, borderColor: `rgba(${ct.accentRgb}, 0.1)` }]}
            >
              <Feather name="search" size={18} color="rgba(255,255,255,0.4)" />
              <ThemedText style={styles.bottomPromptText}>
                Vous ne trouvez pas votre favori ?
              </ThemedText>
              <Pressable
                style={styles.bottomPromptButton}
                onPress={handleExploreDestinations}
              >
                <ThemedText style={[styles.bottomPromptButtonText, { color: ct.accent }]}>
                  Explorer d'autres destinations
                </ThemedText>
                <Feather name="arrow-right" size={14} color={ct.accent} />
              </Pressable>
            </Animated.View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#071A1A",
  },
  header: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: AppColors.white,
  },
  cityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    backgroundColor: "rgba(135,206,235,0.1)",
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  cityBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: AppColors.secondary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,107,138,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: AppColors.white,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  exploreButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: AppColors.secondary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  exploreButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: AppColors.white,
  },
  countBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,107,138,0.1)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.lg,
  },
  countText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FF5DA2",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  cardContainer: {
    width: CARD_WIDTH,
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  imageContainer: {
    width: "100%",
    height: CARD_WIDTH * 0.8,
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  cardGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  favoriteButton: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardContent: {
    padding: Spacing.md,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: AppColors.white,
    marginBottom: Spacing.xs,
    lineHeight: 18,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "600",
    color: AppColors.white,
  },
  cardPrice: {
    fontSize: 13,
    fontWeight: "700",
    color: AppColors.secondary,
  },
  bottomPrompt: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    gap: Spacing.sm,
  },
  bottomPromptText: {
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
  },
  bottomPromptButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  bottomPromptButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: AppColors.secondary,
  },
});
