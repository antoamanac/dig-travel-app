import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  Modal,
  ActivityIndicator,
  TextInput,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather, Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { formatPrice } from "@/data/mockData";
import { useFavorites } from "@/context/FavoritesContext";
import { useCityTheme } from "@/context/CityContext";
import { useAuth } from "@/context/AuthContext";
import { getApiUrl } from "@/lib/query-client";
import * as Sharing from "expo-sharing";
import type { HomeStackParamList } from "@/navigation/MainTabNavigator";

type NavigationProp = NativeStackNavigationProp<HomeStackParamList, "ActivityDetail">;
type ScreenRouteProp = RouteProp<HomeStackParamList, "ActivityDetail">;

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const getCategoryLabel = (category: string): string => {
  const labels: Record<string, string> = {
    plage: "Plage & Mer",
    restaurant: "Gastronomie",
    aventure: "Aventure",
    spa: "Bien-etre",
    nightlife: "Vie nocturne",
    circuits: "Visite guidee",
    location: "Transport",
    culture: "Culture",
    nature: "Nature",
    shopping: "Shopping",
  };
  return labels[category] || category;
};

const MONTHS_FR = [
  "Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Decembre"
];

const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "A l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} sem.`;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

type Review = {
  id: string;
  user_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export default function ActivityDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRouteProp>();
  const insets = useSafeAreaInsets();
  const { activity, city, preselectedDate } = route.params;
  const { isFavorite, toggleFavorite } = useFavorites();
  const ct = useCityTheme();
  const { isAuthenticated, token } = useAuth();

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const isActivityFavorite = isFavorite(activity.id);
  const heartScale = useSharedValue(1);
  const [descExpanded, setDescExpanded] = useState(false);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState(Number(activity.rating) || 4.5);
  const [totalReviews, setTotalReviews] = useState(activity.reviewCount || 0);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const handleToggleFavorite = async () => {
    heartScale.value = withSpring(1.3, { damping: 10 }, () => {
      heartScale.value = withSpring(1);
    });
    await toggleFavorite(activity);
  };

  const handleShare = async () => {
    const shareMessage = `Decouvre "${activity.title}" a ${city.name} sur DIG TRAVEL !`;
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(activity.images[0], {
          dialogTitle: shareMessage,
        });
      }
    } catch (error) {
      console.log("Share not available");
    }
  };

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    preselectedDate ? new Date(preselectedDate) : null
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<{id: string; startTime: string; endTime: string; capacity: number; booked: number; remaining: number; isFull: boolean}[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [availableDays, setAvailableDays] = useState<number[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);

  const isUuidActivity = /^[0-9a-f]{8}-/.test(activity.id);

  useEffect(() => {
    if (!isUuidActivity) return;
    const fetchAvailableDays = async () => {
      try {
        const res = await fetch(`${getApiUrl()}api/activities/${activity.id}/available-days`);
        if (res.ok) {
          const data = await res.json();
          setAvailableDays(data.availableDays || []);
          setBlockedDates(data.blockedDates || []);
        }
      } catch (e) {
        console.log("Failed to fetch available days", e);
      }
    };
    fetchAvailableDays();
  }, [activity.id]);

  useEffect(() => {
    if (!selectedDate || !isUuidActivity) return;
    setSelectedTimeSlot(null);
    setLoadingSlots(true);
    const fetchSlots = async () => {
      try {
        const dateStr = selectedDate.toISOString().split("T")[0];
        const res = await fetch(`${getApiUrl()}api/activities/${activity.id}/slots?date=${dateStr}`);
        if (res.ok) {
          const data = await res.json();
          setAvailableSlots(data.slots || []);
        } else {
          setAvailableSlots([]);
        }
      } catch (e) {
        console.log("Failed to fetch slots", e);
        setAvailableSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };
    fetchSlots();
  }, [selectedDate, activity.id]);

  const fetchReviews = useCallback(async () => {
    if (!isUuidActivity) return;
    setLoadingReviews(true);
    try {
      const res = await fetch(`${getApiUrl()}api/activities/${activity.id}/reviews`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
        setAverageRating(data.averageRating || Number(activity.rating) || 4.5);
        setTotalReviews(data.totalReviews || 0);
      }
    } catch (e) {
      console.log("Failed to fetch reviews", e);
    } finally {
      setLoadingReviews(false);
    }
  }, [activity.id, isUuidActivity]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleSubmitReview = async () => {
    if (!isAuthenticated || !token) {
      Alert.alert("Connexion requise", "Connectez-vous pour laisser un avis.");
      return;
    }
    if (!newComment.trim()) {
      Alert.alert("Commentaire requis", "Veuillez ecrire un commentaire.");
      return;
    }
    setSubmittingReview(true);
    try {
      const res = await fetch(`${getApiUrl()}api/activities/${activity.id}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating: newRating, comment: newComment.trim() }),
      });
      if (res.ok) {
        setNewComment("");
        setNewRating(5);
        setShowReviewForm(false);
        fetchReviews();
      } else {
        const data = await res.json();
        Alert.alert("Erreur", data.error || "Impossible de publier l'avis.");
      }
    } catch (e) {
      Alert.alert("Erreur", "Probleme de connexion.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleImageScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    setCurrentImageIndex(index);
  };

  const handleDateSelect = (day: number) => {
    const selected = new Date(currentYear, currentMonth, day);
    selected.setHours(0, 0, 0, 0);
    setSelectedDate(selected);
    setShowDatePicker(false);
  };

  const handleBookNow = () => {
    if (!selectedDate) {
      setShowDatePicker(true);
      return;
    }
    navigation.navigate("BookingForm", {
      activity,
      city,
      selectedDate: selectedDate.toISOString(),
      selectedTimeSlot,
    });
  };

  const formatSelectedDate = () => {
    if (!selectedDate) return "Choisir une date";
    const dateStr = selectedDate.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    if (selectedTimeSlot) {
      const slot = availableSlots.find(s => s.id === selectedTimeSlot);
      if (slot) return `${dateStr} - ${slot.startTime} - ${slot.endTime}`;
    }
    return dateStr;
  };

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const isDateDisabled = (day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    date.setHours(0, 0, 0, 0);
    if (date < today) return true;
    if (availableDays.length > 0) {
      const jsDay = date.getDay();
      const dayOfWeek = jsDay === 0 ? 7 : jsDay;
      if (!availableDays.includes(dayOfWeek)) return true;
    }
    if (blockedDates.length > 0) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      if (blockedDates.includes(dateStr)) return true;
    }
    return false;
  };

  const isDateSelected = (day: number) => {
    if (!selectedDate) return false;
    const date = new Date(currentYear, currentMonth, day);
    return date.getTime() === selectedDate.getTime();
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const disabled = isDateDisabled(day);
      const selected = isDateSelected(day);

      days.push(
        <Pressable
          key={day}
          style={[
            styles.calendarDay,
            selected && [styles.calendarDaySelected, { backgroundColor: ct.accent }],
            disabled && styles.calendarDayDisabled,
          ]}
          onPress={() => !disabled && handleDateSelect(day)}
          disabled={disabled}
        >
          <ThemedText
            style={[
              styles.calendarDayText,
              selected && [styles.calendarDayTextSelected, { color: ct.background }],
              disabled && styles.calendarDayTextDisabled,
            ]}
          >
            {day}
          </ThemedText>
        </Pressable>
      );
    }

    return days;
  };

  const renderStars = (rating: number, size: number = 14, interactive: boolean = false, onSelect?: (r: number) => void) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Pressable
          key={i}
          onPress={() => interactive && onSelect ? onSelect(i) : undefined}
          disabled={!interactive}
          hitSlop={interactive ? 8 : 0}
        >
          <Ionicons
            name={i <= rating ? "star" : i - 0.5 <= rating ? "star-half" : "star-outline"}
            size={size}
            color="#FFD700"
          />
        </Pressable>
      );
    }
    return <View style={{ flexDirection: "row", gap: 2 }}>{stars}</View>;
  };

  const activityLocation = (activity as any).location;
  const TAB_BAR_HEIGHT = 60 + insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: ct.background }]}>
      <LinearGradient
        colors={[ct.background, ct.backgroundLight, ct.background]}
        style={StyleSheet.absoluteFill}
      />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.carouselContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleImageScroll}
            scrollEventThrottle={16}
          >
            {activity.images.map((image, index) => (
              <Image
                key={index}
                source={{ uri: image }}
                style={styles.carouselImage}
                contentFit="cover"
                transition={300}
              />
            ))}
          </ScrollView>

          <LinearGradient
            colors={[`rgba(${ct.backgroundRgb}, 0.5)`, "transparent", "transparent", `rgba(${ct.backgroundRgb}, 1)`]}
            locations={[0, 0.2, 0.5, 1]}
            style={styles.carouselGradient}
            pointerEvents="none"
          />

          <Pressable
            style={[styles.backButton, { top: insets.top + Spacing.sm, backgroundColor: `rgba(${ct.backgroundRgb}, 0.6)`, borderColor: `rgba(${ct.accentRgb}, 0.3)` }]}
            onPress={handleBackPress}
          >
            <Feather name="chevron-left" size={24} color={AppColors.white} />
          </Pressable>

          <View style={[styles.heroActions, { top: insets.top + Spacing.sm }]}>
            <Pressable style={styles.heroActionButton} onPress={handleShare}>
              <Feather name="share-2" size={20} color={AppColors.white} />
            </Pressable>
            <AnimatedPressable style={[styles.heroActionButton, isActivityFavorite && styles.heroActionButtonFavorited, heartStyle]} onPress={handleToggleFavorite}>
              <Ionicons
                name={isActivityFavorite ? "heart" : "heart-outline"}
                size={22}
                color={isActivityFavorite ? "#FF5DA2" : AppColors.white}
              />
            </AnimatedPressable>
          </View>

          {activity.images.length > 1 ? (
            <View style={styles.dotsContainer}>
              {activity.images.map((_, index) => (
                <Animated.View
                  key={index}
                  style={[
                    styles.dot,
                    currentImageIndex === index && [styles.dotActive, { backgroundColor: ct.accent }],
                  ]}
                />
              ))}
            </View>
          ) : null}

          <View style={styles.categoryChip}>
            <Feather name="tag" size={12} color={ct.accent} />
            <ThemedText style={[styles.categoryChipText, { color: ct.accent }]}>
              {getCategoryLabel(activity.category)}
            </ThemedText>
          </View>
        </View>

        <Animated.View 
          style={styles.content}
          entering={FadeInDown.delay(100).duration(400).springify()}
        >
          <ThemedText style={styles.title}>{activity.title}</ThemedText>
          
          {activityLocation ? (
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={14} color={ct.accent} />
              <ThemedText style={[styles.locationText, { color: ct.accent }]}>{activityLocation}</ThemedText>
            </View>
          ) : null}

          <View style={styles.metaRow}>
            <Pressable style={styles.ratingBadge} onPress={() => {}}>
              {renderStars(averageRating, 13)}
              <ThemedText style={styles.ratingText}>
                {averageRating.toFixed(1)}
              </ThemedText>
              <ThemedText style={styles.reviewCount}>
                ({totalReviews} avis)
              </ThemedText>
            </Pressable>
            <View style={[styles.operatorBadge, { backgroundColor: `rgba(${ct.accentRgb}, 0.12)` }]}>
              <Feather name="shield" size={12} color={ct.accent} />
              <ThemedText style={[styles.operatorText, { color: ct.accent }]}>{activity.operator}</ThemedText>
            </View>
          </View>

          <View style={styles.keyInfoGrid}>
            <View style={[styles.keyInfoItem, { backgroundColor: `rgba(${ct.accentRgb}, 0.06)`, borderColor: `rgba(${ct.accentRgb}, 0.1)` }]}>
              <View style={[styles.keyInfoIcon, { backgroundColor: `rgba(${ct.secondaryRgb}, 0.12)` }]}>
                <Feather name="clock" size={18} color={ct.secondary} />
              </View>
              <ThemedText style={styles.keyInfoLabel}>Duree</ThemedText>
              <ThemedText style={styles.keyInfoValue}>{(activity as any).duration || "Variable"}</ThemedText>
            </View>
            <View style={[styles.keyInfoItem, { backgroundColor: `rgba(${ct.accentRgb}, 0.06)`, borderColor: `rgba(${ct.accentRgb}, 0.1)` }]}>
              <View style={[styles.keyInfoIcon, { backgroundColor: `rgba(${ct.secondaryRgb}, 0.12)` }]}>
                <Feather name="users" size={18} color={ct.secondary} />
              </View>
              <ThemedText style={styles.keyInfoLabel}>Capacite</ThemedText>
              <ThemedText style={styles.keyInfoValue}>{(activity as any).maxPeople || 10} pers.</ThemedText>
            </View>
            <View style={[styles.keyInfoItem, { backgroundColor: `rgba(${ct.accentRgb}, 0.06)`, borderColor: `rgba(${ct.accentRgb}, 0.1)` }]}>
              <View style={[styles.keyInfoIcon, { backgroundColor: `rgba(${ct.secondaryRgb}, 0.12)` }]}>
                <Feather name="zap" size={18} color={ct.secondary} />
              </View>
              <ThemedText style={styles.keyInfoLabel}>Confirmation</ThemedText>
              <ThemedText style={styles.keyInfoValue}>Instantanee</ThemedText>
            </View>
            <View style={[styles.keyInfoItem, { backgroundColor: `rgba(${ct.accentRgb}, 0.06)`, borderColor: `rgba(${ct.accentRgb}, 0.1)` }]}>
              <View style={[styles.keyInfoIcon, { backgroundColor: `rgba(${ct.secondaryRgb}, 0.12)` }]}>
                <Feather name="credit-card" size={18} color={ct.secondary} />
              </View>
              <ThemedText style={styles.keyInfoLabel}>Paiement</ThemedText>
              <ThemedText style={styles.keyInfoValue}>Sur place</ThemedText>
            </View>
          </View>

          <View style={[styles.priceCard, { backgroundColor: `rgba(${ct.accentRgb}, 0.08)`, borderColor: `rgba(${ct.accentRgb}, 0.2)` }]}>
            <View style={styles.priceRow}>
              <View style={styles.priceInfo}>
                <ThemedText style={styles.priceLabel}>Prix par personne</ThemedText>
                <ThemedText style={[styles.price, { color: ct.accent }]}>
                  {formatPrice(activity.price, city.currency)}
                </ThemedText>
              </View>
              <View style={[styles.priceBadge, { backgroundColor: `rgba(${ct.secondaryRgb}, 0.15)` }]}>
                <Feather name="trending-down" size={14} color={ct.secondary} />
                <ThemedText style={[styles.priceBadgeText, { color: ct.secondary }]}>Meilleur prix</ThemedText>
              </View>
            </View>
          </View>
        </Animated.View>

        <Animated.View 
          style={styles.section}
          entering={FadeInDown.delay(200).duration(400).springify()}
        >
          <View style={styles.sectionHeader}>
            <Feather name="file-text" size={16} color={ct.accent} />
            <ThemedText style={styles.sectionTitle}>Description</ThemedText>
          </View>
          <ThemedText 
            style={styles.description} 
            numberOfLines={descExpanded ? undefined : 4}
          >
            {activity.description}
          </ThemedText>
          {activity.description.length > 180 ? (
            <Pressable onPress={() => setDescExpanded(!descExpanded)} style={styles.readMoreBtn}>
              <ThemedText style={[styles.readMoreText, { color: ct.accent }]}>
                {descExpanded ? "Voir moins" : "Voir plus"}
              </ThemedText>
              <Feather name={descExpanded ? "chevron-up" : "chevron-down"} size={14} color={ct.accent} />
            </Pressable>
          ) : null}
        </Animated.View>

        <Animated.View 
          style={styles.section}
          entering={FadeInDown.delay(300).duration(400).springify()}
        >
          <View style={styles.sectionHeader}>
            <Feather name="check-circle" size={16} color={ct.secondary} />
            <ThemedText style={styles.sectionTitle}>Ce qui est inclus</ThemedText>
          </View>
          <View style={styles.includesGrid}>
            {activity.included.map((item, index) => (
              <View key={index} style={[styles.includeItem, { backgroundColor: `rgba(${ct.secondaryRgb}, 0.08)`, borderColor: `rgba(${ct.secondaryRgb}, 0.15)` }]}>
                <Feather name="check" size={14} color={ct.secondary} />
                <ThemedText style={styles.includeItemText}>{item}</ThemedText>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View 
          style={styles.section}
          entering={FadeInDown.delay(400).duration(400).springify()}
        >
          <View style={styles.sectionHeader}>
            <Feather name="calendar" size={16} color={ct.accent} />
            <ThemedText style={styles.sectionTitle}>Selectionner une date</ThemedText>
          </View>
          <DateButton
            label={formatSelectedDate()}
            selected={selectedDate !== null}
            onPress={() => setShowDatePicker(true)}
            ct={ct}
          />
        </Animated.View>

        {selectedDate ? (
          <Animated.View
            style={styles.section}
            entering={FadeInDown.delay(450).duration(400).springify()}
          >
            <View style={styles.sectionHeader}>
              <Feather name="clock" size={16} color={ct.accent} />
              <ThemedText style={styles.sectionTitle}>Choisir un horaire</ThemedText>
            </View>
            {loadingSlots ? (
              <View style={styles.timeSlotsLoading}>
                <ActivityIndicator size="small" color={ct.accent} />
              </View>
            ) : availableSlots.length === 0 ? (
              <View style={styles.timeSlotsEmpty}>
                <ThemedText style={styles.timeSlotsEmptyText}>
                  Pas de creneaux configures pour cette date
                </ThemedText>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.timeSlotsContainer}
              >
                {availableSlots.map((slot) => {
                  const isSelected = selectedTimeSlot === slot.id;
                  return (
                    <Pressable
                      key={slot.id}
                      style={[
                        styles.timeSlotChip,
                        { borderColor: `rgba(${ct.accentRgb}, 0.2)`, backgroundColor: `rgba(${ct.accentRgb}, 0.08)` },
                        isSelected && { backgroundColor: ct.accent, borderColor: ct.accent },
                        slot.isFull && styles.timeSlotChipFull,
                      ]}
                      onPress={() => !slot.isFull && setSelectedTimeSlot(isSelected ? null : slot.id)}
                      disabled={slot.isFull}
                    >
                      <ThemedText
                        style={[
                          styles.timeSlotTime,
                          isSelected && { color: ct.background },
                          slot.isFull && styles.timeSlotTimeFull,
                        ]}
                      >
                        {slot.startTime} - {slot.endTime}
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.timeSlotRemaining,
                          isSelected && { color: ct.background },
                          slot.isFull && styles.timeSlotRemainingFull,
                        ]}
                      >
                        {slot.isFull ? "Complet" : `${slot.remaining} place${slot.remaining > 1 ? "s" : ""}`}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </Animated.View>
        ) : null}

        <Animated.View
          style={styles.section}
          entering={FadeInDown.delay(500).duration(400).springify()}
        >
          <View style={styles.sectionHeader}>
            <Feather name="message-circle" size={16} color={ct.accent} />
            <ThemedText style={styles.sectionTitle}>Avis et commentaires</ThemedText>
            <View style={{ flex: 1 }} />
            {isAuthenticated && isUuidActivity ? (
              <Pressable
                style={[styles.addReviewBtn, { backgroundColor: `rgba(${ct.accentRgb}, 0.12)`, borderColor: `rgba(${ct.accentRgb}, 0.25)` }]}
                onPress={() => setShowReviewForm(!showReviewForm)}
              >
                <Feather name={showReviewForm ? "x" : "edit-3"} size={14} color={ct.accent} />
                <ThemedText style={[styles.addReviewBtnText, { color: ct.accent }]}>
                  {showReviewForm ? "Annuler" : "Ecrire"}
                </ThemedText>
              </Pressable>
            ) : null}
          </View>

          <View style={[styles.ratingSummary, { backgroundColor: `rgba(${ct.accentRgb}, 0.06)`, borderColor: `rgba(${ct.accentRgb}, 0.12)` }]}>
            <View style={styles.ratingSummaryLeft}>
              <ThemedText style={styles.ratingSummaryNumber}>{averageRating.toFixed(1)}</ThemedText>
              {renderStars(averageRating, 18)}
            </View>
            <View style={styles.ratingSummaryRight}>
              <ThemedText style={styles.ratingSummaryCount}>{totalReviews}</ThemedText>
              <ThemedText style={styles.ratingSummaryLabel}>avis</ThemedText>
            </View>
          </View>

          {showReviewForm ? (
            <Animated.View
              style={[styles.reviewForm, { backgroundColor: `rgba(${ct.accentRgb}, 0.06)`, borderColor: `rgba(${ct.accentRgb}, 0.15)` }]}
              entering={FadeInDown.duration(300).springify()}
            >
              <ThemedText style={styles.reviewFormLabel}>Votre note</ThemedText>
              <View style={styles.reviewFormStars}>
                {renderStars(newRating, 28, true, setNewRating)}
              </View>
              <ThemedText style={styles.reviewFormLabel}>Votre commentaire</ThemedText>
              <TextInput
                style={[styles.reviewInput, { borderColor: `rgba(${ct.accentRgb}, 0.2)`, color: AppColors.white }]}
                placeholder="Partagez votre experience..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                multiline
                numberOfLines={3}
                value={newComment}
                onChangeText={setNewComment}
                textAlignVertical="top"
              />
              <Pressable
                style={[styles.submitReviewBtn, { backgroundColor: ct.accent }]}
                onPress={handleSubmitReview}
                disabled={submittingReview}
              >
                {submittingReview ? (
                  <ActivityIndicator size="small" color={ct.background} />
                ) : (
                  <>
                    <Feather name="send" size={14} color={ct.background} />
                    <ThemedText style={[styles.submitReviewBtnText, { color: ct.background }]}>Publier</ThemedText>
                  </>
                )}
              </Pressable>
            </Animated.View>
          ) : null}

          {loadingReviews ? (
            <View style={styles.timeSlotsLoading}>
              <ActivityIndicator size="small" color={ct.accent} />
            </View>
          ) : reviews.length === 0 ? (
            <View style={styles.noReviewsContainer}>
              <Feather name="message-square" size={32} color="rgba(255,255,255,0.15)" />
              <ThemedText style={styles.noReviewsText}>Aucun avis pour le moment</ThemedText>
              {isAuthenticated && isUuidActivity ? (
                <ThemedText style={styles.noReviewsSubtext}>Soyez le premier a partager votre experience</ThemedText>
              ) : null}
            </View>
          ) : (
            <View style={styles.reviewsList}>
              {reviews.slice(0, 5).map((review, index) => (
                <Animated.View
                  key={review.id}
                  style={[styles.reviewCard, { borderColor: `rgba(${ct.accentRgb}, 0.1)` }]}
                  entering={FadeInDown.delay(index * 80).duration(300).springify()}
                >
                  <View style={styles.reviewHeader}>
                    <View style={[styles.reviewAvatar, { backgroundColor: `rgba(${ct.accentRgb}, 0.15)` }]}>
                      <ThemedText style={[styles.reviewAvatarText, { color: ct.accent }]}>
                        {(review.user_name || "U").charAt(0).toUpperCase()}
                      </ThemedText>
                    </View>
                    <View style={styles.reviewMeta}>
                      <ThemedText style={styles.reviewName}>{review.user_name || "Utilisateur"}</ThemedText>
                      <ThemedText style={styles.reviewDate}>{getRelativeTime(review.created_at)}</ThemedText>
                    </View>
                    {renderStars(review.rating, 12)}
                  </View>
                  {review.comment ? (
                    <ThemedText style={styles.reviewComment}>{review.comment}</ThemedText>
                  ) : null}
                </Animated.View>
              ))}
              {reviews.length > 5 ? (
                <ThemedText style={styles.moreReviewsText}>
                  +{reviews.length - 5} autres avis
                </ThemedText>
              ) : null}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      <View 
        style={[styles.bottomContainer, { paddingBottom: TAB_BAR_HEIGHT + Spacing.sm, backgroundColor: `rgba(${ct.backgroundRgb}, 0.98)`, borderTopColor: `rgba(${ct.accentRgb}, 0.15)` }]}
      >
        <View style={styles.bottomContent}>
          <View style={styles.bottomPriceInfo}>
            <ThemedText style={styles.bottomPriceLabel}>Total</ThemedText>
            <ThemedText style={[styles.bottomPrice, { color: ct.secondary }]}>
              {formatPrice(activity.price, city.currency)}
            </ThemedText>
          </View>
          <BookButton onPress={handleBookNow} ct={ct} />
        </View>
      </View>

      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowDatePicker(false)}
        >
          <Animated.View 
            style={[styles.modalContent, { backgroundColor: ct.backgroundLight, borderColor: `rgba(${ct.accentRgb}, 0.2)` }]}
            entering={FadeIn.duration(200)}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <ThemedText style={styles.modalTitle}>Choisir une date</ThemedText>
                <Pressable onPress={() => setShowDatePicker(false)} style={styles.modalCloseButton}>
                  <Feather name="x" size={24} color={AppColors.white} />
                </Pressable>
              </View>

              <View style={styles.monthNav}>
                <Pressable onPress={goToPrevMonth} style={[styles.monthNavButton, { backgroundColor: `rgba(${ct.accentRgb}, 0.12)` }]}>
                  <Feather name="chevron-left" size={24} color={AppColors.white} />
                </Pressable>
                <ThemedText style={styles.monthTitle}>
                  {MONTHS_FR[currentMonth]} {currentYear}
                </ThemedText>
                <Pressable onPress={goToNextMonth} style={[styles.monthNavButton, { backgroundColor: `rgba(${ct.accentRgb}, 0.12)` }]}>
                  <Feather name="chevron-right" size={24} color={AppColors.white} />
                </Pressable>
              </View>

              <View style={styles.daysHeader}>
                {DAYS_FR.map((day) => (
                  <View key={day} style={styles.dayHeaderCell}>
                    <ThemedText style={styles.dayHeaderText}>{day}</ThemedText>
                  </View>
                ))}
              </View>

              <View style={styles.calendarGrid}>
                {renderCalendar()}
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
}

function DateButton({ 
  label, 
  selected, 
  onPress,
  ct,
}: { 
  label: string; 
  selected: boolean; 
  onPress: () => void;
  ct: ReturnType<typeof useCityTheme>;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.98, { damping: 15 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
      style={[styles.dateButton, { backgroundColor: `rgba(${ct.accentRgb}, 0.08)`, borderColor: `rgba(${ct.accentRgb}, 0.2)` }, selected && { borderColor: ct.accent, backgroundColor: `rgba(${ct.accentRgb}, 0.15)` }, animatedStyle]}
    >
      <View style={[styles.dateIconContainer, { backgroundColor: `rgba(${ct.accentRgb}, 0.12)` }]}>
        <Feather name="calendar" size={20} color={selected ? ct.background : ct.accent} />
      </View>
      <ThemedText style={[styles.dateButtonText, selected && styles.dateButtonTextSelected]}>
        {label}
      </ThemedText>
      <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.5)" />
    </AnimatedPressable>
  );
}

function BookButton({ onPress, ct }: { onPress: () => void; ct: ReturnType<typeof useCityTheme> }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.97, { damping: 15 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
      style={[styles.bookButton, animatedStyle]}
    >
      <LinearGradient
        colors={[ct.accent, `rgba(${ct.accentRgb}, 0.8)`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.bookButtonGradient}
      >
        <ThemedText style={[styles.bookButtonText, { color: ct.background }]}>Reserver</ThemedText>
        <View style={[styles.bookButtonArrow, { backgroundColor: ct.background }]}>
          <Feather name="arrow-right" size={16} color={ct.accent} />
        </View>
      </LinearGradient>
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
  carouselContainer: {
    height: 340,
    position: "relative",
  },
  carouselImage: {
    width: SCREEN_WIDTH,
    height: 340,
  },
  carouselGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  backButton: {
    position: "absolute",
    left: Spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(7, 26, 26, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(0, 217, 192, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroActions: {
    position: "absolute",
    right: Spacing.lg,
    flexDirection: "row",
    gap: Spacing.sm,
  },
  heroActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(7, 26, 26, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroActionButtonFavorited: {
    backgroundColor: "rgba(255,107,138,0.25)",
    borderColor: "rgba(255,107,138,0.4)",
  },
  dotsContainer: {
    position: "absolute",
    bottom: Spacing.xl + 30,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.4)",
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: AppColors.secondary,
    width: 24,
  },
  categoryChip: {
    position: "absolute",
    bottom: Spacing.lg + 4,
    left: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  content: {
    padding: Spacing.lg,
    paddingTop: Spacing.md,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: AppColors.white,
    marginBottom: Spacing.xs,
    letterSpacing: -0.5,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: Spacing.md,
  },
  locationText: {
    fontSize: 13,
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    flexWrap: "wrap",
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFD700",
  },
  reviewCount: {
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
  },
  operatorBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 217, 192, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 4,
  },
  operatorText: {
    fontSize: 11,
    color: AppColors.secondary,
    fontWeight: "600",
  },
  keyInfoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  keyInfoItem: {
    width: "48%",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  keyInfoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  keyInfoLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.45)",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  keyInfoValue: {
    fontSize: 13,
    fontWeight: "700",
    color: AppColors.white,
    textAlign: "center",
  },
  priceCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  priceInfo: {},
  priceLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 4,
  },
  price: {
    fontSize: 28,
    fontWeight: "800",
    color: AppColors.secondary,
  },
  priceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  priceBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: AppColors.white,
  },
  description: {
    fontSize: 15,
    color: "rgba(255,255,255,0.7)",
    lineHeight: 24,
  },
  readMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: Spacing.sm,
  },
  readMoreText: {
    fontSize: 13,
    fontWeight: "600",
  },
  includesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  includeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  includeItemText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 217, 192, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(0, 217, 192, 0.2)",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  dateIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  dateButtonText: {
    flex: 1,
    fontSize: 15,
    color: "rgba(255,255,255,0.6)",
  },
  dateButtonTextSelected: {
    color: AppColors.white,
    fontWeight: "600",
  },
  bottomContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  bottomContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bottomPriceInfo: {},
  bottomPriceLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
  },
  bottomPrice: {
    fontSize: 22,
    fontWeight: "800",
    color: AppColors.sand,
  },
  bookButton: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  bookButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#071A1A",
    marginRight: 8,
  },
  bookButtonArrow: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#071A1A",
    justifyContent: "center",
    alignItems: "center",
  },
  ratingSummary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  ratingSummaryLeft: {
    alignItems: "flex-start",
    gap: 6,
  },
  ratingSummaryNumber: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFD700",
  },
  ratingSummaryRight: {
    alignItems: "center",
  },
  ratingSummaryCount: {
    fontSize: 24,
    fontWeight: "800",
    color: AppColors.white,
  },
  ratingSummaryLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
  },
  addReviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  addReviewBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  reviewForm: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  reviewFormLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
    marginBottom: Spacing.sm,
  },
  reviewFormStars: {
    marginBottom: Spacing.md,
  },
  reviewInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minHeight: 80,
    fontSize: 14,
    marginBottom: Spacing.md,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  submitReviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
  },
  submitReviewBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  noReviewsContainer: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  noReviewsText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.4)",
    fontWeight: "600",
  },
  noReviewsSubtext: {
    fontSize: 12,
    color: "rgba(255,255,255,0.3)",
  },
  reviewsList: {
    gap: Spacing.sm,
  },
  reviewCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.sm,
  },
  reviewAvatarText: {
    fontSize: 15,
    fontWeight: "700",
  },
  reviewMeta: {
    flex: 1,
  },
  reviewName: {
    fontSize: 14,
    fontWeight: "600",
    color: AppColors.white,
  },
  reviewDate: {
    fontSize: 11,
    color: "rgba(255,255,255,0.4)",
  },
  reviewComment: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    lineHeight: 21,
  },
  moreReviewsText: {
    textAlign: "center",
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
    marginTop: Spacing.sm,
  },
  timeSlotsContainer: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  timeSlotsLoading: {
    paddingVertical: Spacing.xl,
    alignItems: "center",
  },
  timeSlotsEmpty: {
    paddingVertical: Spacing.lg,
    alignItems: "center",
  },
  timeSlotsEmptyText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    fontStyle: "italic",
  },
  timeSlotChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: "center",
    minWidth: 110,
  },
  timeSlotChipFull: {
    opacity: 0.4,
  },
  timeSlotTime: {
    fontSize: 14,
    fontWeight: "700",
    color: AppColors.white,
    marginBottom: 2,
  },
  timeSlotTimeFull: {
    color: "rgba(255,255,255,0.5)",
  },
  timeSlotRemaining: {
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
  },
  timeSlotRemainingFull: {
    color: "rgba(255,255,255,0.4)",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modalContent: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#0d2e2e",
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(0, 217, 192, 0.2)",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: AppColors.white,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  monthNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  monthNavButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.white,
  },
  daysHeader: {
    flexDirection: "row",
    marginBottom: Spacing.sm,
  },
  dayHeaderCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.5)",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarDay: {
    width: "14.28%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  calendarDaySelected: {
    backgroundColor: AppColors.secondary,
  },
  calendarDayDisabled: {
    opacity: 0.3,
  },
  calendarDayText: {
    fontSize: 14,
    color: AppColors.white,
    fontWeight: "500",
  },
  calendarDayTextSelected: {
    color: "#071A1A",
    fontWeight: "700",
  },
  calendarDayTextDisabled: {
    color: "rgba(255, 255, 255, 0.3)",
  },
});
