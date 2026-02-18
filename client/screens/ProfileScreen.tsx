import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { AppColors, Spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useFavorites } from "@/context/FavoritesContext";
import { useCityTheme } from "@/context/CityContext";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { ProfileStackParamList } from "@/navigation/MainTabNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface MenuItemProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showArrow?: boolean;
  delay?: number;
  ct: ReturnType<typeof useCityTheme>;
}

function MenuItem({ icon, title, subtitle, onPress, showArrow = true, delay = 0, ct }: MenuItemProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400).springify()}>
      <AnimatedPressable
        style={[styles.menuItem, animatedStyle, { backgroundColor: ct.cardBg, borderColor: ct.cardBorder }]}
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.98); }}
        onPressOut={() => { scale.value = withSpring(1); }}
      >
        <View style={[styles.menuIconContainer, { backgroundColor: `rgba(${ct.accentRgb}, 0.15)` }]}>
          <Feather name={icon} size={20} color={ct.accent} />
        </View>
        <View style={styles.menuContent}>
          <ThemedText style={styles.menuTitle}>{title}</ThemedText>
          {subtitle ? (
            <ThemedText style={styles.menuSubtitle}>{subtitle}</ThemedText>
          ) : null}
        </View>
        {showArrow ? (
          <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.4)" />
        ) : null}
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const profileNavigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const insets = useSafeAreaInsets();
  const { profile, signOut, updateProfile, isAuthenticated, isGuest, exitGuestMode } = useAuth();
  const { favoritesCount } = useFavorites();
  const ct = useCityTheme();

  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [editName, setEditName] = useState(profile?.full_name || "");
  const [editPhone, setEditPhone] = useState(profile?.phone || "");
  const [isSaving, setIsSaving] = useState(false);

  const logoutScale = useSharedValue(1);
  const loginScale = useSharedValue(1);

  const logoutStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoutScale.value }],
  }));

  const loginStyle = useAnimatedStyle(() => ({
    transform: [{ scale: loginScale.value }],
  }));

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleLogin = () => {
    navigation.navigate("Login");
  };

  const handleSaveName = async () => {
    if (!editName.trim()) {
      Alert.alert("Erreur", "Le nom ne peut pas être vide");
      return;
    }

    setIsSaving(true);
    const { error } = await updateProfile({ full_name: editName.trim() });
    setIsSaving(false);

    if (error) {
      Alert.alert("Erreur", "Impossible de mettre à jour le nom");
    } else {
      setIsEditingName(false);
    }
  };

  const handleSavePhone = async () => {
    setIsSaving(true);
    const { error } = await updateProfile({ phone: editPhone.trim() || null });
    setIsSaving(false);

    if (error) {
      Alert.alert("Erreur", "Impossible de mettre à jour le téléphone");
    } else {
      setIsEditingPhone(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Déconnexion",
      "Êtes-vous sûr de vouloir vous déconnecter ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Déconnecter",
          style: "destructive",
          onPress: async () => {
            await signOut();
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: ct.background }]}>
      <LinearGradient
        colors={[ct.background, ct.backgroundLight, ct.background]}
        style={StyleSheet.absoluteFill}
      />

      <Pressable
        style={[styles.backButton, { top: insets.top + Spacing.sm, backgroundColor: `rgba(${ct.accentRgb}, 0.15)`, borderColor: `rgba(${ct.accentRgb}, 0.3)` }]}
        onPress={handleBackPress}
      >
        <Feather name="chevron-left" size={24} color={AppColors.white} />
      </Pressable>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.xl + 40, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isGuest ? (
          <Animated.View
            entering={FadeInDown.delay(100).duration(500).springify()}
            style={styles.guestContainer}
          >
            <View style={styles.avatarContainer}>
              <View style={[styles.avatar, { backgroundColor: `rgba(${ct.accentRgb}, 0.15)`, borderColor: `rgba(${ct.accentRgb}, 0.3)` }]}>
                <Feather name="user" size={40} color={ct.accent} />
              </View>
            </View>
            <ThemedText style={styles.guestTitle}>Mode Invité</ThemedText>
            <ThemedText style={styles.guestSubtitle}>
              Connectez-vous pour accéder à toutes les fonctionnalités
            </ThemedText>

            <AnimatedPressable
              style={[styles.loginButton, loginStyle]}
              onPress={handleLogin}
              onPressIn={() => { loginScale.value = withSpring(0.95); }}
              onPressOut={() => { loginScale.value = withSpring(1); }}
            >
              <Feather name="log-in" size={20} color={AppColors.white} />
              <ThemedText style={styles.loginButtonText}>Se connecter</ThemedText>
            </AnimatedPressable>
          </Animated.View>
        ) : (
          <Animated.View
            entering={FadeInDown.delay(100).duration(500).springify()}
            style={styles.header}
          >
            <View style={styles.avatarContainer}>
              <View style={[styles.avatar, { backgroundColor: `rgba(${ct.accentRgb}, 0.15)`, borderColor: `rgba(${ct.accentRgb}, 0.3)` }]}>
                <Feather name="user" size={40} color={ct.accent} />
              </View>
              <Pressable style={[styles.editAvatarButton, { backgroundColor: ct.accent, borderColor: ct.background }]}>
                <Feather name="camera" size={14} color={AppColors.white} />
              </Pressable>
            </View>

            {isEditingName ? (
              <View style={styles.editContainer}>
                <TextInput
                  style={[styles.editInput, { borderBottomColor: ct.accent }]}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Votre nom"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  autoFocus
                />
                <View style={styles.editActions}>
                  <Pressable
                    style={styles.cancelButton}
                    onPress={() => {
                      setIsEditingName(false);
                      setEditName(profile?.full_name || "");
                    }}
                  >
                    <Feather name="x" size={18} color="#ff6b6b" />
                  </Pressable>
                  <Pressable
                    style={styles.saveButton}
                    onPress={handleSaveName}
                    disabled={isSaving}
                  >
                    <Feather name="check" size={18} color="#E6C9A8" />
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                style={styles.nameContainer}
                onPress={() => setIsEditingName(true)}
              >
                <ThemedText style={styles.name}>
                  {profile?.full_name || "Utilisateur"}
                </ThemedText>
                <Feather name="edit-2" size={14} color={ct.accent} />
              </Pressable>
            )}

            <ThemedText style={styles.email}>{profile?.email}</ThemedText>
          </Animated.View>
        )}

        {isAuthenticated ? (
          <>
            <Animated.View
              entering={FadeInDown.delay(200).duration(500).springify()}
              style={styles.section}
            >
              <ThemedText style={[styles.sectionTitle, { color: ct.accent }]}>Informations</ThemedText>

              <View style={[styles.infoCard, { backgroundColor: ct.cardBg, borderColor: ct.cardBorder }]}>
                <View style={styles.infoRow}>
                  <View style={[styles.infoIconContainer, { backgroundColor: `rgba(${ct.accentRgb}, 0.15)` }]}>
                    <Feather name="mail" size={18} color={ct.accent} />
                  </View>
                  <View style={styles.infoContent}>
                    <ThemedText style={styles.infoLabel}>Email</ThemedText>
                    <ThemedText style={styles.infoValue}>{profile?.email}</ThemedText>
                  </View>
                </View>

                <View style={styles.infoDivider} />

                <View style={styles.infoRow}>
                  <View style={[styles.infoIconContainer, { backgroundColor: `rgba(${ct.accentRgb}, 0.15)` }]}>
                    <Feather name="phone" size={18} color={ct.accent} />
                  </View>
                  <View style={styles.infoContent}>
                    <ThemedText style={styles.infoLabel}>Téléphone</ThemedText>
                    {isEditingPhone ? (
                      <View style={styles.phoneEditContainer}>
                        <TextInput
                          style={[styles.phoneInput, { borderBottomColor: ct.accent }]}
                          value={editPhone}
                          onChangeText={setEditPhone}
                          placeholder="+33 6 12 34 56 78"
                          placeholderTextColor="rgba(255,255,255,0.5)"
                          keyboardType="phone-pad"
                          autoFocus
                        />
                        <Pressable
                          style={styles.cancelButton}
                          onPress={() => {
                            setIsEditingPhone(false);
                            setEditPhone(profile?.phone || "");
                          }}
                        >
                          <Feather name="x" size={16} color="#ff6b6b" />
                        </Pressable>
                        <Pressable
                          style={styles.saveButton}
                          onPress={handleSavePhone}
                          disabled={isSaving}
                        >
                          <Feather name="check" size={16} color="#E6C9A8" />
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        style={styles.phoneValueContainer}
                        onPress={() => setIsEditingPhone(true)}
                      >
                        <ThemedText style={styles.infoValue}>
                          {profile?.phone || "Ajouter un numéro"}
                        </ThemedText>
                        <Feather name="edit-2" size={12} color={ct.accent} />
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>
            </Animated.View>

            <View style={styles.section}>
              <ThemedText style={[styles.sectionTitle, { color: ct.accent }]}>Mes activités</ThemedText>
              <MenuItem
                icon="heart"
                title="Mes favoris"
                subtitle={favoritesCount > 0 ? `${favoritesCount} activité${favoritesCount > 1 ? "s" : ""} sauvegardée${favoritesCount > 1 ? "s" : ""}` : "Aucun favori pour le moment"}
                onPress={() => (navigation as any).navigate("FavoritesTab")}
                delay={300}
                ct={ct}
              />
              <MenuItem
                icon="calendar"
                title="Mes réservations"
                subtitle="Voir l'historique de vos réservations"
                onPress={() => navigation.navigate("MyBookings")}
                delay={350}
                ct={ct}
              />
            </View>

            <View style={styles.section}>
              <ThemedText style={[styles.sectionTitle, { color: ct.accent }]}>Paramètres</ThemedText>
              <MenuItem
                icon="bell"
                title="Notifications"
                subtitle="Gérer vos préférences"
                onPress={() => {}}
                delay={400}
                ct={ct}
              />
              <MenuItem
                icon="globe"
                title="Langue"
                subtitle="Français"
                onPress={() => {}}
                delay={450}
                ct={ct}
              />
              <MenuItem
                icon="shield"
                title="Confidentialité"
                onPress={() => {}}
                delay={500}
                ct={ct}
              />
              <MenuItem
                icon="help-circle"
                title="Aide & Support"
                onPress={() => {}}
                delay={550}
                ct={ct}
              />
            </View>

            <Animated.View entering={FadeInDown.delay(600).duration(400)}>
              <AnimatedPressable
                style={[styles.logoutButton, logoutStyle]}
                onPress={handleLogout}
                onPressIn={() => { logoutScale.value = withSpring(0.95); }}
                onPressOut={() => { logoutScale.value = withSpring(1); }}
              >
                <Feather name="log-out" size={20} color="#ff6b6b" />
                <ThemedText style={styles.logoutText}>Déconnexion</ThemedText>
              </AnimatedPressable>
            </Animated.View>
          </>
        ) : null}

        <ThemedText style={styles.version}>Version 1.0.0</ThemedText>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#071A1A",
  },
  backButton: {
    position: "absolute",
    left: Spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 217, 192, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(0, 217, 192, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  guestContainer: {
    alignItems: "center",
    marginBottom: 32,
    paddingTop: Spacing.xl,
  },
  guestTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: AppColors.white,
    marginTop: Spacing.md,
  },
  guestSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    marginTop: Spacing.xs,
    textAlign: "center",
    paddingHorizontal: Spacing.xl,
  },
  loginButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1e4d7a",
    borderRadius: 16,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
    gap: Spacing.sm,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.white,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(0, 217, 192, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(0, 217, 192, 0.3)",
  },
  editAvatarButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#00D9C0",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#071A1A",
  },
  nameContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  name: {
    fontSize: 24,
    fontWeight: "700",
    color: AppColors.white,
  },
  editContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  editInput: {
    fontSize: 20,
    fontWeight: "600",
    color: AppColors.white,
    borderBottomWidth: 2,
    borderBottomColor: "#00D9C0",
    paddingVertical: Spacing.xs,
    minWidth: 150,
    textAlign: "center",
  },
  editActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  cancelButton: {
    padding: Spacing.xs,
  },
  saveButton: {
    padding: Spacing.xs,
  },
  email: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    marginTop: Spacing.xs,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#00D9C0",
    marginBottom: Spacing.md,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  infoCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 217, 192, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: AppColors.white,
  },
  infoDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginVertical: Spacing.md,
  },
  phoneEditContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    color: AppColors.white,
    borderBottomWidth: 1,
    borderBottomColor: "#00D9C0",
    paddingVertical: 4,
  },
  phoneValueContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 217, 192, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.white,
  },
  menuSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 107, 107, 0.1)",
    borderRadius: 16,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 107, 0.3)",
    gap: Spacing.sm,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ff6b6b",
  },
  version: {
    fontSize: 12,
    color: "rgba(255,255,255,0.3)",
    textAlign: "center",
    marginTop: Spacing.xl,
  },
});
