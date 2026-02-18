import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Linking,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { AppColors, Spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { getApiUrl } from "@/lib/query-client";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface DashboardStats {
  todayBookings: number;
  todayRevenue: number;
  pendingBookings: number;
  totalActivities: number;
  activeActivities: number;
  currency: string;
}

export default function OperatorDashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { operatorProfile, signOut, token } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const { data: stats, refetch } = useQuery<DashboardStats>({
    queryKey: ["/api/operator/dashboard"],
    queryFn: async () => {
      const url = new URL("/api/operator/dashboard", getApiUrl());
      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch dashboard");
      return response.json();
    },
    refetchInterval: 10000,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const openCRM = async () => {
    const crmUrl = `${getApiUrl()}admin`;
    if (Platform.OS === "web") {
      window.open(crmUrl, "_blank");
    } else {
      await Linking.openURL(crmUrl);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigation.reset({
      index: 0,
      routes: [{ name: "Splash" }],
    });
  };

  const cityName = operatorProfile?.cities?.[0] 
    ? operatorProfile.cities[0].charAt(0).toUpperCase() + operatorProfile.cities[0].slice(1)
    : "Ville";

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#071A1A", "#0f2847", "#071A1A"]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00D9C0" />
        }
      >
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <MaterialCommunityIcons name="store" size={32} color="#00D9C0" />
            </View>
          </View>
          <ThemedText style={styles.welcomeText}>Espace Opérateur</ThemedText>
          <ThemedText style={styles.companyName}>{operatorProfile?.companyName}</ThemedText>
          <View style={styles.cityBadge}>
            <Feather name="map-pin" size={14} color="#00D9C0" />
            <ThemedText style={styles.cityText}>{cityName}</ThemedText>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "rgba(230, 201, 168, 0.15)" }]}>
              <Feather name="calendar" size={20} color="#E6C9A8" />
            </View>
            <ThemedText style={styles.statValue}>{stats?.todayBookings || 0}</ThemedText>
            <ThemedText style={styles.statLabel}>Réservations aujourd'hui</ThemedText>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "rgba(0, 217, 192, 0.15)" }]}>
              <Feather name="dollar-sign" size={20} color="#00D9C0" />
            </View>
            <ThemedText style={styles.statValue}>
              {stats?.todayRevenue?.toLocaleString() || 0}
            </ThemedText>
            <ThemedText style={styles.statLabel}>Revenus ({stats?.currency || "DZD"})</ThemedText>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "rgba(255, 193, 7, 0.15)" }]}>
              <Feather name="clock" size={20} color="#FFC107" />
            </View>
            <ThemedText style={styles.statValue}>{stats?.pendingBookings || 0}</ThemedText>
            <ThemedText style={styles.statLabel}>En attente</ThemedText>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "rgba(156, 39, 176, 0.15)" }]}>
              <Feather name="activity" size={20} color="#9C27B0" />
            </View>
            <ThemedText style={styles.statValue}>
              {stats?.activeActivities || 0}/{stats?.totalActivities || 0}
            </ThemedText>
            <ThemedText style={styles.statLabel}>Activités actives</ThemedText>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.actionsSection}>
          <ThemedText style={styles.sectionTitle}>Actions rapides</ThemedText>

          <Pressable style={styles.actionCard} onPress={openCRM}>
            <LinearGradient
              colors={["#00D9C0", "#5BA3C6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionGradient}
            >
              <View style={styles.actionContent}>
                <View style={styles.actionIcon}>
                  <Feather name="grid" size={24} color="#071A1A" />
                </View>
                <View style={styles.actionTextContainer}>
                  <ThemedText style={styles.actionTitle}>Accéder au CRM</ThemedText>
                  <ThemedText style={styles.actionSubtitle}>
                    Gérer activités, réservations et plus
                  </ThemedText>
                </View>
                <Feather name="external-link" size={20} color="#071A1A" />
              </View>
            </LinearGradient>
          </Pressable>

          <View style={styles.quickActions}>
            <Pressable style={styles.quickAction} onPress={openCRM}>
              <View style={styles.quickActionIcon}>
                <Feather name="list" size={20} color="#00D9C0" />
              </View>
              <ThemedText style={styles.quickActionText}>Activités</ThemedText>
            </Pressable>

            <Pressable style={styles.quickAction} onPress={openCRM}>
              <View style={styles.quickActionIcon}>
                <Feather name="book-open" size={20} color="#00D9C0" />
              </View>
              <ThemedText style={styles.quickActionText}>Réservations</ThemedText>
            </Pressable>

            <Pressable style={styles.quickAction} onPress={openCRM}>
              <View style={styles.quickActionIcon}>
                <Feather name="bar-chart-2" size={20} color="#00D9C0" />
              </View>
              <ThemedText style={styles.quickActionText}>Statistiques</ThemedText>
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.profileSection}>
          <View style={styles.profileCard}>
            <View style={styles.profileInfo}>
              <View style={styles.profileAvatar}>
                <Feather name="user" size={24} color="#00D9C0" />
              </View>
              <View>
                <ThemedText style={styles.profileName}>{operatorProfile?.contactName}</ThemedText>
                <ThemedText style={styles.profileEmail}>Identifiant : {operatorProfile?.email}</ThemedText>
              </View>
            </View>
          </View>

          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <Feather name="log-out" size={18} color="#F44336" />
            <ThemedText style={styles.logoutText}>Déconnexion</ThemedText>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
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
  content: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  logoContainer: {
    marginBottom: Spacing.md,
  },
  logoCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(0, 217, 192, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(0, 217, 192, 0.3)",
  },
  welcomeText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    marginBottom: Spacing.xs,
  },
  companyName: {
    fontSize: 24,
    fontWeight: "700",
    color: AppColors.white,
    textAlign: "center",
  },
  cityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    backgroundColor: "rgba(0, 217, 192, 0.1)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 20,
  },
  cityText: {
    fontSize: 14,
    color: "#00D9C0",
    fontWeight: "600",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: AppColors.white,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
  },
  actionsSection: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: AppColors.white,
    marginBottom: Spacing.md,
  },
  actionCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: Spacing.md,
  },
  actionGradient: {
    padding: Spacing.lg,
  },
  actionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(7, 26, 26, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#071A1A",
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 12,
    color: "rgba(7, 26, 26, 0.7)",
  },
  quickActions: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  quickAction: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: Spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 217, 192, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  quickActionText: {
    fontSize: 12,
    color: AppColors.white,
    fontWeight: "500",
  },
  profileSection: {
    gap: Spacing.md,
  },
  profileCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  profileInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  profileAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(0, 217, 192, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0, 217, 192, 0.3)",
  },
  profileName: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.white,
  },
  profileEmail: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: "rgba(244, 67, 54, 0.1)",
    borderRadius: 12,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: "rgba(244, 67, 54, 0.2)",
  },
  logoutText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F44336",
  },
});
