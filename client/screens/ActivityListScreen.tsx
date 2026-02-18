import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ActivityCard } from "@/components/ActivityCard";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { useActivities, Activity } from "@/hooks/useActivities";
import { getActivitiesByCity, formatPrice } from "@/data/mockData";
import type { HomeStackParamList } from "@/navigation/MainTabNavigator";
import type { Activity as MockActivity } from "@/data/mockData";
import { useCityTheme } from "@/context/CityContext";

type NavigationProp = NativeStackNavigationProp<HomeStackParamList, "ActivityList">;
type ScreenRouteProp = RouteProp<HomeStackParamList, "ActivityList">;

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const filterCategories = [
  { id: "all", name: "Tous", icon: "grid" as const },
  { id: "circuits", name: "Circuits", icon: "map" as const },
  { id: "location", name: "Véhicules", icon: "navigation" as const },
  { id: "plage", name: "Plage", icon: "sun" as const },
  { id: "restaurant", name: "Restaurant", icon: "coffee" as const },
  { id: "aventure", name: "Aventure", icon: "compass" as const },
  { id: "spa", name: "Spa", icon: "droplet" as const },
  { id: "nightlife", name: "Vie nocturne", icon: "moon" as const },
];

export default function ActivityListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRouteProp>();
  const insets = useSafeAreaInsets();
  const { city } = route.params;
  const ct = useCityTheme();

  const [selectedFilter, setSelectedFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: apiActivities, isLoading, refetch, isRefetching } = useActivities(city.id);
  
  const mockActivities = useMemo(() => getActivitiesByCity(city.id), [city.id]);
  
  const allActivities: (Activity | MockActivity)[] = useMemo(() => {
    if (apiActivities && apiActivities.length > 0) {
      return apiActivities;
    }
    return mockActivities;
  }, [apiActivities, mockActivities]);

  const featuredActivities = useMemo(() => {
    return [...allActivities]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 5);
  }, [allActivities]);

  const filteredActivities = useMemo(() => {
    let result = allActivities;
    if (selectedFilter !== "all") {
      result = result.filter((activity) => activity.category === selectedFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((activity) =>
        activity.title.toLowerCase().includes(q) ||
        (activity.description && activity.description.toLowerCase().includes(q))
      );
    }
    return result;
  }, [allActivities, selectedFilter, searchQuery]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: city.name,
      headerTintColor: AppColors.white,
      headerStyle: {
        backgroundColor: ct.backgroundLight,
      },
      headerShadowVisible: false,
      headerTransparent: false,
    });
  }, [navigation, city.name, ct.backgroundLight]);

  const handleActivityPress = (activity: Activity | MockActivity) => {
    navigation.navigate("ActivityDetail", { activity: activity as any, city });
  };

  if (isLoading && !mockActivities.length) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: ct.backgroundLight }]}>
        <ActivityIndicator size="large" color={ct.secondary} />
        <ThemedText style={styles.loadingText}>Chargement des activités...</ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: ct.backgroundLight }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing || isRefetching}
            onRefresh={handleRefresh}
            tintColor={ct.secondary}
          />
        }
      >
        <Animated.View
          entering={FadeInDown.delay(50).duration(400)}
          style={styles.searchSection}
        >
          <View style={[styles.searchBar, { backgroundColor: ct.accentSoft, borderColor: ct.cardBorder }]}>
            <Feather name="search" size={18} color={ct.secondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher une activite..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {searchQuery.length > 0 ? (
              <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
                <Feather name="x-circle" size={18} color="rgba(255,255,255,0.5)" />
              </Pressable>
            ) : null}
          </View>
        </Animated.View>

        <Animated.View 
          entering={FadeInDown.delay(100).duration(400)}
          style={styles.featuredSection}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Feather name="star" size={18} color={ct.secondary} />
              <ThemedText style={styles.sectionTitle}>Activites vedettes</ThemedText>
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
                entering={FadeInRight.delay(150 * index).duration(400)}
              >
                <Pressable
                  style={styles.featuredCard}
                  onPress={() => handleActivityPress(activity)}
                >
                  <Image
                    source={{ uri: activity.image }}
                    style={styles.featuredImage}
                    contentFit="cover"
                    transition={300}
                  />
                  <LinearGradient
                    colors={["transparent", "rgba(0,0,0,0.85)"]}
                    style={styles.featuredGradient}
                  />
                  <View style={styles.featuredBadge}>
                    <Feather name="star" size={10} color={ct.secondary} />
                    <ThemedText style={[styles.featuredRating, { color: ct.secondary }]}>
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
                </Pressable>
              </Animated.View>
            ))}
          </ScrollView>
        </Animated.View>

        <Animated.View 
          entering={FadeInDown.delay(200).duration(400)}
          style={styles.categoriesSection}
        >
          <ThemedText style={styles.categoriesTitle}>Catégories</ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContent}
          >
            {filterCategories.map((filter, index) => (
              <Pressable
                key={filter.id}
                style={[
                  styles.categoryChip,
                  { backgroundColor: ct.accentSoft, borderColor: ct.cardBorder },
                  selectedFilter === filter.id && [styles.categoryChipSelected, { backgroundColor: ct.secondary, borderColor: ct.secondary }],
                ]}
                onPress={() => setSelectedFilter(filter.id)}
              >
                <View style={[
                  styles.categoryIcon,
                  { backgroundColor: `rgba(${ct.secondaryRgb}, 0.2)` },
                  selectedFilter === filter.id && styles.categoryIconSelected,
                ]}>
                  <Feather 
                    name={filter.icon} 
                    size={16} 
                    color={selectedFilter === filter.id ? ct.backgroundLight : ct.secondary} 
                  />
                </View>
                <ThemedText
                  style={[
                    styles.categoryText,
                    { color: ct.secondary },
                    selectedFilter === filter.id && [styles.categoryTextSelected, { color: ct.backgroundLight }],
                  ]}
                >
                  {filter.name}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </Animated.View>

        <Animated.View 
          entering={FadeInDown.delay(300).duration(400)}
          style={styles.allActivitiesSection}
        >
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>
              {selectedFilter === "all" ? "Toutes les activités" : filterCategories.find(f => f.id === selectedFilter)?.name}
            </ThemedText>
            <ThemedText style={styles.activityCount}>
              {filteredActivities.length} activité{filteredActivities.length > 1 ? "s" : ""}
            </ThemedText>
          </View>
          
          {filteredActivities.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="search" size={48} color="rgba(255,255,255,0.3)" />
              <ThemedText style={styles.emptyText}>
                Aucune activité dans cette catégorie
              </ThemedText>
            </View>
          ) : (
            <View style={styles.activitiesGrid}>
              {filteredActivities.map((activity, index) => (
                <Animated.View
                  key={activity.id}
                  entering={FadeInDown.delay(50 * Math.min(index, 10)).duration(300)}
                  style={[
                    styles.activityItem,
                    index % 2 === 0 ? styles.activityLeft : styles.activityRight,
                  ]}
                >
                  <ActivityCard
                    activity={activity}
                    city={city}
                    onPress={() => handleActivityPress(activity)}
                  />
                </Animated.View>
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f1c2e",
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: Spacing.md,
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
  },
  searchSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: AppColors.white,
    height: "100%",
  },
  featuredSection: {
    paddingTop: Spacing.md,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: AppColors.white,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
  },
  featuredList: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: 12,
  },
  featuredCard: {
    width: 200,
    height: 240,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    backgroundColor: "#1a2a3a",
  },
  featuredImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  featuredGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "60%",
  },
  featuredBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  featuredRating: {
    fontSize: 12,
    color: "#FFD700",
    fontWeight: "700",
  },
  featuredContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
  },
  featuredTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: AppColors.white,
    marginBottom: 6,
    lineHeight: 20,
  },
  featuredPrice: {
    fontSize: 16,
    fontWeight: "800",
    color: AppColors.sand,
  },
  categoriesSection: {
    paddingTop: Spacing.lg,
  },
  categoriesTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.white,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  categoriesContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: 10,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 25,
    backgroundColor: AppColors.sand10,
    borderWidth: 1,
    borderColor: AppColors.sand20,
    gap: 8,
  },
  categoryChipSelected: {
    backgroundColor: AppColors.sand,
    borderColor: AppColors.sand,
  },
  categoryIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: AppColors.sand20,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryIconSelected: {
    backgroundColor: "rgba(15, 28, 46, 0.2)",
  },
  categoryText: {
    fontSize: 13,
    color: AppColors.sand,
    fontWeight: "600",
  },
  categoryTextSelected: {
    color: "#0f1c2e",
  },
  allActivitiesSection: {
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  activityCount: {
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
    marginTop: 2,
  },
  activitiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: Spacing.md,
    justifyContent: "space-between",
  },
  activityItem: {
    width: (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.md) / 2,
    marginBottom: Spacing.lg,
  },
  activityLeft: {
    marginRight: 0,
  },
  activityRight: {
    marginLeft: 0,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.4)",
    marginTop: Spacing.md,
  },
});
