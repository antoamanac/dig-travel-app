import React from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInDown,
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { getActivitiesByCity, formatPrice, categories } from "@/data/mockData";
import type { HomeStackParamList } from "@/navigation/MainTabNavigator";
import { useCityTheme } from "@/context/CityContext";

type NavigationProp = NativeStackNavigationProp<HomeStackParamList, "CityLanding">;
type ScreenRouteProp = RouteProp<HomeStackParamList, "CityLanding">;

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function CityLandingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRouteProp>();
  const insets = useSafeAreaInsets();
  const { city } = route.params;
  const ct = useCityTheme();

  const activities = getActivitiesByCity(city.id);
  const featuredActivities = [...activities].sort((a, b) => b.rating - a.rating).slice(0, 3);
  const popularActivities = [...activities].sort((a, b) => b.reviewCount - a.reviewCount).slice(0, 4);

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleViewAllActivities = () => {
    navigation.navigate("ActivityList", { city });
  };

  const handleActivityPress = (activity: typeof activities[0]) => {
    navigation.navigate("ActivityDetail", { activity, city });
  };

  return (
    <View style={[styles.container, { backgroundColor: ct.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Image
            source={typeof city.image === "string" ? { uri: city.image } : city.image}
            style={styles.heroImage}
            contentFit="cover"
            transition={400}
          />
          <LinearGradient
            colors={ct.gradientOverlay as any}
            locations={[0, 0.6, 1]}
            style={styles.heroGradient}
          />
          
          <Pressable
            style={[styles.backButton, { top: insets.top + Spacing.sm }]}
            onPress={handleBackPress}
          >
            <Feather name="chevron-left" size={22} color="#FFF" />
          </Pressable>

          <Animated.View 
            style={styles.heroContent}
            entering={FadeInDown.delay(100).duration(500).springify()}
          >
            <ThemedText style={styles.heroTitle}>{city.name}</ThemedText>
            <View style={styles.heroMeta}>
              <View style={styles.metaItem}>
                <Feather name="map-pin" size={14} color={ct.accent} />
                <ThemedText style={styles.metaText}>{city.activityCount} activités</ThemedText>
              </View>
              <View style={styles.metaDot} />
              <View style={styles.metaItem}>
                <Feather name="star" size={14} color={ct.secondary} />
                <ThemedText style={styles.metaText}>4.9</ThemedText>
              </View>
              <View style={styles.metaDot} />
              <View style={styles.metaItem}>
                <Feather name="shield" size={14} color={ct.accent} />
                <ThemedText style={styles.metaText}>{city.operator}</ThemedText>
              </View>
            </View>
          </Animated.View>
        </View>

        <Animated.View 
          style={styles.section}
          entering={FadeInDown.delay(200).duration(400)}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Feather name="award" size={18} color={ct.secondary} />
              <ThemedText style={styles.sectionTitle}>En vedette</ThemedText>
            </View>
            <ThemedText style={styles.sectionSubtitle}>Les mieux notées</ThemedText>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredList}
          >
            {featuredActivities.map((activity, index) => (
              <Animated.View
                key={activity.id}
                entering={FadeInRight.delay(250 + index * 100).duration(400)}
              >
                <FeaturedCard
                  activity={activity}
                  city={city}
                  ct={ct}
                  onPress={() => handleActivityPress(activity)}
                />
              </Animated.View>
            ))}
          </ScrollView>
        </Animated.View>

        <Animated.View 
          style={styles.section}
          entering={FadeInDown.delay(350).duration(400)}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Feather name="grid" size={18} color={ct.accent} />
              <ThemedText style={styles.sectionTitle}>Catégories</ThemedText>
            </View>
          </View>

          <View style={styles.categoriesGrid}>
            {categories.slice(0, 6).map((category, index) => (
              <Animated.View
                key={category.id}
                entering={FadeInDown.delay(400 + index * 50).duration(300)}
              >
                <Pressable 
                  style={[styles.categoryCard, { backgroundColor: ct.accentSoft, borderColor: ct.cardBorder }]}
                  onPress={handleViewAllActivities}
                >
                  <View style={[styles.categoryIcon, { backgroundColor: `rgba(${ct.accentRgb}, 0.12)` }]}>
                    <Feather name={category.icon as any} size={20} color={ct.accent} />
                  </View>
                  <ThemedText style={styles.categoryName}>{category.name}</ThemedText>
                </Pressable>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        <Animated.View 
          style={styles.section}
          entering={FadeInDown.delay(500).duration(400)}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Feather name="trending-up" size={18} color="#FF6B6B" />
              <ThemedText style={styles.sectionTitle}>Populaires</ThemedText>
            </View>
            <Pressable onPress={handleViewAllActivities} style={styles.seeAllButton}>
              <ThemedText style={[styles.seeAllText, { color: ct.accent }]}>Voir tout</ThemedText>
              <Feather name="chevron-right" size={16} color={ct.accent} />
            </Pressable>
          </View>

          {popularActivities.map((activity, index) => (
            <Animated.View
              key={activity.id}
              entering={FadeInDown.delay(550 + index * 80).duration(400)}
            >
              <ActivityListItem
                activity={activity}
                city={city}
                ct={ct}
                onPress={() => handleActivityPress(activity)}
              />
            </Animated.View>
          ))}
        </Animated.View>

        <Animated.View 
          style={styles.ctaSection}
          entering={FadeInDown.delay(700).duration(400)}
        >
          <Pressable style={[styles.ctaButton, { backgroundColor: ct.accent }]} onPress={handleViewAllActivities}>
            <ThemedText style={[styles.ctaText, { color: ct.background }]}>
              Voir toutes les activités
            </ThemedText>
            <Feather name="arrow-right" size={18} color={ct.background} />
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function FeaturedCard({ 
  activity, 
  city, 
  ct,
  onPress 
}: { 
  activity: any; 
  city: any;
  ct: ReturnType<typeof useCityTheme>;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      style={[styles.featuredCard, animatedStyle, { borderColor: ct.cardBorder }]}
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.96, { damping: 15 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
    >
      <Image
        source={{ uri: activity.image }}
        style={styles.featuredImage}
        contentFit="cover"
        transition={300}
      />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.8)"]}
        style={styles.featuredGradient}
      />
      <View style={styles.featuredRating}>
        <Feather name="star" size={10} color={ct.secondary} />
        <ThemedText style={[styles.featuredRatingText, { color: ct.secondary }]}>
          {Number(activity.rating).toFixed(1)}
        </ThemedText>
      </View>
      <View style={styles.featuredContent}>
        <ThemedText style={styles.featuredTitle} numberOfLines={2}>
          {activity.title}
        </ThemedText>
        <ThemedText style={[styles.featuredPrice, { color: ct.secondary }]}>
          {formatPrice(activity.price, city.currency)}
        </ThemedText>
      </View>
    </AnimatedPressable>
  );
}

function ActivityListItem({ 
  activity, 
  city, 
  ct,
  onPress 
}: { 
  activity: any; 
  city: any;
  ct: ReturnType<typeof useCityTheme>;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      style={[styles.listItem, animatedStyle, { backgroundColor: ct.cardBg, borderColor: ct.cardBorder }]}
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.98, { damping: 15 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
    >
      <Image
        source={{ uri: activity.image }}
        style={styles.listItemImage}
        contentFit="cover"
        transition={300}
      />
      <View style={styles.listItemContent}>
        <ThemedText style={styles.listItemTitle} numberOfLines={2}>
          {activity.title}
        </ThemedText>
        <View style={styles.listItemMeta}>
          <View style={styles.listItemRating}>
            <Feather name="star" size={12} color={ct.secondary} />
            <ThemedText style={[styles.listItemRatingText, { color: ct.secondary }]}>
              {Number(activity.rating).toFixed(1)}
            </ThemedText>
          </View>
          <ThemedText style={styles.listItemReviews}>
            {activity.reviewCount} avis
          </ThemedText>
        </View>
        <ThemedText style={[styles.listItemPrice, { color: ct.secondary }]}>
          {formatPrice(activity.price, city.currency)}
        </ThemedText>
      </View>
      <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.3)" />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#071A1A",
  },
  scrollView: {
    flex: 1,
  },
  hero: {
    height: 260,
    position: "relative",
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  backButton: {
    position: "absolute",
    left: Spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: -0.5,
  },
  heroMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
    flexWrap: "wrap",
    gap: 8,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  section: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  sectionHeader: {
    marginBottom: Spacing.md,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFF",
  },
  sectionTitleAccent: {
    width: 40,
    height: 3,
    backgroundColor: AppColors.sand,
    borderRadius: 2,
    marginTop: 6,
    marginLeft: 26,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
    marginLeft: 26,
  },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
    position: "absolute",
    right: 0,
    top: 0,
  },
  seeAllText: {
    fontSize: 14,
    color: "#00D9C0",
  },
  featuredList: {
    gap: 12,
    paddingRight: Spacing.lg,
  },
  featuredCard: {
    width: 180,
    height: 220,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    backgroundColor: "#1a2a3a",
    borderWidth: 1,
    borderColor: AppColors.sand20,
  },
  featuredImage: {
    ...StyleSheet.absoluteFillObject,
  },
  featuredGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "55%",
  },
  featuredRating: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  featuredRatingText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFD700",
  },
  featuredContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  featuredTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
    lineHeight: 18,
    marginBottom: 4,
  },
  featuredPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: AppColors.sand,
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  categoryCard: {
    width: (SCREEN_WIDTH - Spacing.lg * 2 - 20) / 3,
    backgroundColor: AppColors.sand10,
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: AppColors.sand20,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 217, 192, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: "500",
    color: "#FFF",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f1c2e",
    borderRadius: BorderRadius.md,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: AppColors.sand20,
  },
  listItemImage: {
    width: 70,
    height: 70,
    borderRadius: BorderRadius.sm,
  },
  listItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  listItemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
    lineHeight: 18,
  },
  listItemMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 8,
  },
  listItemRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  listItemRatingText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFD700",
  },
  listItemReviews: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
  },
  listItemPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: AppColors.sand,
    marginTop: 4,
  },
  ctaSection: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    backgroundColor: "#00D9C0",
    borderRadius: BorderRadius.lg,
    gap: 8,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#071A1A",
  },
});
