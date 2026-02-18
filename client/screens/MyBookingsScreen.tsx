import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  FlatList,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useQuery } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { AppColors, Spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useCityTheme } from "@/context/CityContext";
import { getApiUrl } from "@/lib/query-client";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type TabType = "all" | "upcoming" | "past";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Booking {
  id: string;
  user_id: string;
  activity_id: string;
  city_id: string;
  activity_title: string;
  activity_image: string | null;
  scheduled_at: string;
  price: number;
  currency: string;
  status: "confirmed" | "pending" | "completed" | "cancelled" | "refused";
  qr_code: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  payment_method: string | null;
  created_at: string;
  operator_reason: string | null;
  time_slot: string | null;
  num_people: number | null;
  total_price: number | null;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  confirmed: { bg: "rgba(230, 201, 168, 0.2)", text: "#E6C9A8" },
  pending: { bg: "rgba(255, 193, 7, 0.2)", text: "#FFC107" },
  completed: { bg: "rgba(0, 217, 192, 0.2)", text: "#00D9C0" },
  cancelled: { bg: "rgba(244, 67, 54, 0.2)", text: "#F44336" },
  refused: { bg: "rgba(198, 40, 40, 0.2)", text: "#C62828" },
};

const statusLabels: Record<string, string> = {
  confirmed: "Confirmé",
  pending: "En attente",
  completed: "Complété",
  cancelled: "Annulé",
  refused: "Refusé",
};

interface BookingCardProps {
  booking: Booking;
  index: number;
  ct: ReturnType<typeof useCityTheme>;
}

function BookingCard({ booking, index, ct }: BookingCardProps) {
  const scale = useSharedValue(1);
  const [showQR, setShowQR] = useState(false);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const status = statusColors[booking.status] || statusColors.pending;

  return (
    <Animated.View entering={FadeInDown.delay(index * 80).duration(400).springify()}>
      <AnimatedPressable
        style={[styles.bookingCard, animatedStyle, { backgroundColor: ct.cardBg, borderColor: ct.cardBorder }]}
        onPressIn={() => { scale.value = withSpring(0.98); }}
        onPressOut={() => { scale.value = withSpring(1); }}
      >
        <View style={styles.cardImageContainer}>
          {booking.activity_image ? (
            <Image
              source={{ uri: booking.activity_image }}
              style={styles.cardImage}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
              <Feather name="image" size={32} color="rgba(255,255,255,0.3)" />
            </View>
          )}
          <LinearGradient
            colors={["transparent", `rgba(${ct.backgroundRgb}, 0.8)`]}
            style={styles.cardImageOverlay}
          />
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <ThemedText style={[styles.statusText, { color: status.text }]}>
              {statusLabels[booking.status]}
            </ThemedText>
          </View>
        </View>

        <View style={styles.cardContent}>
          <ThemedText style={styles.cardTitle} numberOfLines={2}>
            {booking.activity_title}
          </ThemedText>

          <View style={styles.cardDetails}>
            <View style={styles.detailRow}>
              <Feather name="calendar" size={14} color={ct.accent} />
              <ThemedText style={styles.detailText}>
                {formatDate(booking.scheduled_at)}
              </ThemedText>
            </View>
            <View style={styles.detailRow}>
              <Feather name="clock" size={14} color={ct.accent} />
              <ThemedText style={styles.detailText}>
                {booking.time_slot ? booking.time_slot : formatTime(booking.scheduled_at)}
              </ThemedText>
            </View>
            {booking.num_people && booking.num_people > 1 ? (
              <View style={styles.detailRow}>
                <Feather name="users" size={14} color={ct.accent} />
                <ThemedText style={styles.detailText}>
                  {booking.num_people} personne{booking.num_people > 1 ? "s" : ""}
                </ThemedText>
              </View>
            ) : null}
          </View>

          {booking.status === "refused" && booking.operator_reason ? (
            <View style={[styles.reasonBox, { backgroundColor: "rgba(198, 40, 40, 0.1)", borderColor: "rgba(198, 40, 40, 0.3)" }]}>
              <Feather name="info" size={14} color="#C62828" />
              <ThemedText style={[styles.reasonText, { color: "#C62828" }]}>
                {booking.operator_reason}
              </ThemedText>
            </View>
          ) : null}

          <View style={styles.cardFooter}>
            <ThemedText style={[styles.priceText, { color: ct.accent }]}>
              {(booking.total_price || booking.price || 0).toLocaleString()} {booking.currency}
            </ThemedText>

            {booking.status === "confirmed" ? (
              <Pressable
                style={[styles.qrButton, { backgroundColor: `rgba(${ct.accentRgb}, 0.15)` }]}
                onPress={() => setShowQR(!showQR)}
              >
                <Feather name="grid" size={16} color={ct.accent} />
                <ThemedText style={[styles.qrButtonText, { color: ct.accent }]}>QR Code</ThemedText>
              </Pressable>
            ) : null}
          </View>

          {showQR && booking.status === "confirmed" ? (
            <View style={styles.qrContainer}>
              <View style={[styles.qrPlaceholder, { borderColor: `rgba(${ct.accentRgb}, 0.3)` }]}>
                <Feather name="grid" size={60} color={ct.accent} />
                <ThemedText style={styles.qrCode}>{booking.qr_code}</ThemedText>
              </View>
              <ThemedText style={styles.qrHint}>
                Présentez ce code à l'entrée
              </ThemedText>
            </View>
          ) : null}
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

function EmptyState({ tab, ct }: { tab: TabType; ct: ReturnType<typeof useCityTheme> }) {
  const messages: Record<TabType, { title: string; subtitle: string }> = {
    all: {
      title: "Aucune réservation",
      subtitle: "Réservez votre première activité pour commencer l'aventure !",
    },
    upcoming: {
      title: "Pas de réservations à venir",
      subtitle: "Explorez nos destinations et réservez une activité",
    },
    past: {
      title: "Aucune activité passée",
      subtitle: "Vos activités terminées apparaîtront ici",
    },
  };

  return (
    <Animated.View
      entering={FadeInUp.delay(200).duration(500)}
      style={styles.emptyState}
    >
      <View style={[styles.emptyIcon, { backgroundColor: `rgba(${ct.accentRgb}, 0.1)` }]}>
        <Feather name="calendar" size={48} color={ct.accent} />
      </View>
      <ThemedText style={styles.emptyTitle}>{messages[tab].title}</ThemedText>
      <ThemedText style={styles.emptySubtitle}>{messages[tab].subtitle}</ThemedText>
    </Animated.View>
  );
}

function LoginPrompt() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const ct = useCityTheme();

  return (
    <View style={[styles.container, { backgroundColor: ct.background }]}>
      <LinearGradient
        colors={[ct.background, ct.backgroundLight, ct.background]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.headerSpacer} />
        <ThemedText style={styles.headerTitle}>Mes réservations</ThemedText>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.loginPromptContainer}>
        <Animated.View entering={FadeInUp.delay(100).duration(400)} style={styles.loginPromptContent}>
          <View style={[styles.loginPromptIcon, { backgroundColor: `rgba(${ct.accentRgb}, 0.1)` }]}>
            <Feather name="lock" size={48} color={`rgba(${ct.accentRgb}, 0.5)`} />
          </View>
          <ThemedText style={styles.loginPromptTitle}>Connexion requise</ThemedText>
          <ThemedText style={styles.loginPromptSubtitle}>
            Connectez-vous pour voir vos réservations et suivre vos activités
          </ThemedText>
          <Pressable
            style={styles.loginButton}
            onPress={() => navigation.navigate("Login")}
          >
            <LinearGradient
              colors={[ct.accent, `rgba(${ct.accentRgb}, 0.7)`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.loginButtonGradient}
            >
              <Feather name="log-in" size={18} color={ct.background} />
              <ThemedText style={[styles.loginButtonText, { color: ct.background }]}>Se connecter</ThemedText>
            </LinearGradient>
          </Pressable>
          <Pressable
            style={styles.signupLink}
            onPress={() => navigation.navigate("Signup")}
          >
            <ThemedText style={styles.signupLinkText}>
              Pas encore de compte ? <ThemedText style={[styles.signupLinkHighlight, { color: ct.accent }]}>Créer un compte</ThemedText>
            </ThemedText>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

export default function MyBookingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { token, profile } = useAuth();
  const ct = useCityTheme();

  const [activeTab, setActiveTab] = useState<TabType>("all");

  const { data: bookings = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/bookings"],
    queryFn: async () => {
      if (!token) return [];

      const response = await fetch(new URL("/api/bookings", getApiUrl()).toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.error("Error fetching bookings");
        return [];
      }

      const data = await response.json();
      return data.bookings as Booking[];
    },
    enabled: !!token,
  });

  const filteredBookings = bookings.filter((booking) => {
    const now = new Date();
    const bookingDate = new Date(booking.scheduled_at);

    switch (activeTab) {
      case "upcoming":
        return bookingDate >= now && booking.status !== "cancelled";
      case "past":
        return bookingDate < now || booking.status === "completed";
      default:
        return true;
    }
  });

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const tabs: { key: TabType; label: string }[] = [
    { key: "all", label: "Tous" },
    { key: "upcoming", label: "À venir" },
    { key: "past", label: "Passés" },
  ];

  if (!token || !profile) {
    return <LoginPrompt />;
  }

  return (
    <View style={[styles.container, { backgroundColor: ct.background }]}>
      <LinearGradient
        colors={[ct.background, ct.backgroundLight, ct.background]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.headerSpacer} />
        <ThemedText style={styles.headerTitle}>Mes réservations</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <Animated.View
        entering={FadeInDown.delay(100).duration(400)}
        style={styles.tabsContainer}
      >
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && [styles.activeTab, { backgroundColor: `rgba(${ct.accentRgb}, 0.2)`, borderColor: ct.accent }]]}
            onPress={() => setActiveTab(tab.key)}
          >
            <ThemedText
              style={[
                styles.tabText,
                activeTab === tab.key && [styles.activeTabText, { color: ct.accent }],
              ]}
            >
              {tab.label}
            </ThemedText>
          </Pressable>
        ))}
      </Animated.View>

      <FlatList
        data={filteredBookings}
        renderItem={({ item, index }) => (
          <BookingCard booking={item} index={index} ct={ct} />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor={ct.accent}
          />
        }
        ListEmptyComponent={
          !isLoading ? <EmptyState tab={activeTab} ct={ct} /> : null
        }
      />
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
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: AppColors.white,
  },
  headerSpacer: {
    width: 44,
  },
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  activeTab: {
    backgroundColor: "rgba(0, 217, 192, 0.2)",
    borderColor: "#00D9C0",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.5)",
  },
  activeTabText: {
    color: "#00D9C0",
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  bookingCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    marginBottom: Spacing.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  cardImageContainer: {
    height: 140,
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  cardImagePlaceholder: {
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardImageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  statusBadge: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  cardContent: {
    padding: Spacing.md,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: AppColors.white,
    marginBottom: Spacing.sm,
  },
  cardDetails: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  detailText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#00D9C0",
  },
  qrButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: "rgba(0, 217, 192, 0.15)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
  },
  qrButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#00D9C0",
  },
  qrContainer: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
  },
  qrPlaceholder: {
    width: 120,
    height: 120,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0, 217, 192, 0.3)",
  },
  qrCode: {
    fontSize: 8,
    color: "rgba(255,255,255,0.5)",
    marginTop: Spacing.xs,
  },
  qrHint: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    marginTop: Spacing.sm,
  },
  reasonBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(0, 217, 192, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: AppColors.white,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    paddingHorizontal: Spacing.xl,
  },
  loginPromptContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  loginPromptContent: {
    alignItems: "center",
  },
  loginPromptIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(0, 217, 192, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  loginPromptTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: AppColors.white,
    marginBottom: Spacing.sm,
  },
  loginPromptSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  loginButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: Spacing.lg,
  },
  loginButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  loginButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#071A1A",
  },
  signupLink: {
    padding: Spacing.sm,
  },
  signupLinkText: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.6)",
  },
  signupLinkHighlight: {
    color: AppColors.secondary,
    fontWeight: "600",
  },
});
