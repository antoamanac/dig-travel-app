import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withDelay,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { AppColors, Spacing } from "@/constants/theme";
import { formatPrice } from "@/data/mockData";
import { useAuth } from "@/context/AuthContext";
import { useCityTheme } from "@/context/CityContext";
import { getApiUrl } from "@/lib/query-client";
import { CommonActions } from "@react-navigation/native";
import type { HomeStackParamList } from "@/navigation/MainTabNavigator";

type NavigationProp = NativeStackNavigationProp<HomeStackParamList, "BookingForm">;
type ScreenRouteProp = RouteProp<HomeStackParamList, "BookingForm">;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function generateQRCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "DIG-";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function BookingFormScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRouteProp>();
  const insets = useSafeAreaInsets();
  const { activity, city, selectedDate, selectedTimeSlot } = route.params as any;
  const { token, profile, isGuest, exitGuestMode } = useAuth();
  const queryClient = useQueryClient();
  const ct = useCityTheme();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash">("cash");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentStep, setPaymentStep] = useState<"form" | "processing" | "success">("form");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardName, setCardName] = useState("");

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      setEmail(profile.email || "");
    }
  }, [profile]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  const validateEmail = (emailValue: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailValue);
  };

  const createBookingMutation = useMutation({
    mutationFn: async () => {
      const qrCode = generateQRCode();
      const scheduledAt = new Date(selectedDate);
      scheduledAt.setHours(10, 0, 0, 0);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(new URL("/api/bookings", getApiUrl()).toString(), {
        method: "POST",
        headers,
        body: JSON.stringify({
          activity_id: activity.id,
          city_id: city.id,
          activity_title: activity.title,
          activity_image: activity.image,
          scheduled_at: scheduledAt.toISOString(),
          price: activity.price,
          currency: city.currency,
          status: "confirmed",
          qr_code: qrCode,
          customer_name: fullName,
          customer_email: email,
          customer_phone: phone,
          payment_method: paymentMethod,
          payment_status: paymentMethod === "card" ? "paid" : "pending",
          is_guest: isGuest && !token,
          time_slot: selectedTimeSlot || null,
          num_people: 1,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de la réservation");
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
    },
  });

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, "").slice(0, 16);
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(" ") : cleaned;
  };

  const formatExpiry = (text: string) => {
    const cleaned = text.replace(/\D/g, "").slice(0, 4);
    if (cleaned.length > 2) {
      return cleaned.slice(0, 2) + "/" + cleaned.slice(2);
    }
    return cleaned;
  };

  const handleConfirmBooking = async () => {
    if (!fullName.trim()) {
      Alert.alert("Erreur", "Veuillez entrer votre nom complet.");
      return;
    }
    if (!email.trim() || !validateEmail(email)) {
      Alert.alert("Erreur", "Veuillez entrer une adresse email valide.");
      return;
    }
    if (!phone.trim()) {
      Alert.alert("Erreur", "Veuillez entrer votre numéro de téléphone.");
      return;
    }

    if (isGuest && !token) {
      setShowGuestModal(true);
      return;
    }

    setCardName(fullName);
    setPaymentStep("form");
    setShowPaymentModal(true);
  };

  const handlePaymentConfirm = async () => {
    if (paymentMethod === "card") {
      const cleanCard = cardNumber.replace(/\s/g, "");
      if (cleanCard.length < 16) {
        Alert.alert("Erreur", "Veuillez entrer un numero de carte valide (16 chiffres).");
        return;
      }
      if (cardExpiry.length < 5) {
        Alert.alert("Erreur", "Veuillez entrer une date d'expiration valide (MM/AA).");
        return;
      }
      if (cardCvc.length < 3) {
        Alert.alert("Erreur", "Veuillez entrer un code CVC valide (3 chiffres).");
        return;
      }
    }

    setPaymentStep("processing");

    setTimeout(async () => {
      try {
        await createBookingMutation.mutateAsync();
        setPaymentStep("success");
      } catch (error: any) {
        setShowPaymentModal(false);
        setPaymentStep("form");
        Alert.alert(
          "Erreur",
          error.message || "Impossible de creer la reservation. Veuillez reessayer."
        );
      }
    }, 2000);
  };

  const handleSuccessDone = () => {
    setShowPaymentModal(false);
    setPaymentStep("form");
    setCardNumber("");
    setCardExpiry("");
    setCardCvc("");
    navigation.dispatch(
      CommonActions.navigate({ name: "BookingsTab" })
    );
  };

  const handleCreateAccount = () => {
    setShowGuestModal(false);
    exitGuestMode();
    navigation.dispatch(
      CommonActions.navigate({ name: "Login" })
    );
  };

  const handleContinueAsGuest = async () => {
    setShowGuestModal(false);
    setCardName(fullName);
    setPaymentStep("form");
    setShowPaymentModal(true);
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const isUserDataPrefilled = !!profile;

  return (
    <View style={[styles.container, { backgroundColor: ct.background }]}>
      <LinearGradient
        colors={[ct.background, ct.backgroundLight]}
        style={styles.headerGradient}
      >
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <Pressable style={[styles.backButton, { backgroundColor: `rgba(${ct.accentRgb}, 0.15)`, borderColor: `rgba(${ct.accentRgb}, 0.3)` }]} onPress={handleBack}>
            <Feather name="chevron-left" size={24} color={AppColors.white} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Réservation</ThemedText>
          <View style={styles.headerSpacer} />
        </View>
      </LinearGradient>

      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 34) + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View 
          style={styles.summaryCard}
          entering={FadeInDown.delay(100).duration(400).springify()}
        >
          <Image
            source={{ uri: activity.image }}
            style={styles.summaryImage}
            contentFit="cover"
          />
          <LinearGradient
            colors={["transparent", `rgba(${ct.backgroundRgb}, 0.9)`]}
            style={styles.summaryGradient}
          />
          <View style={styles.summaryContent}>
            <View style={[styles.summaryBadge, { backgroundColor: `rgba(${ct.accentRgb}, 0.2)` }]}>
              <Feather name="calendar" size={12} color={ct.accent} />
              <ThemedText style={[styles.summaryBadgeText, { color: ct.accent }]}>
                {formatDate(selectedDate)}
              </ThemedText>
            </View>
            <ThemedText style={styles.summaryTitle} numberOfLines={2}>
              {activity.title}
            </ThemedText>
            <View style={styles.summaryPriceRow}>
              <ThemedText style={[styles.summaryPrice, { color: ct.accent }]}>
                {formatPrice(activity.price, city.currency)}
              </ThemedText>
              <ThemedText style={styles.summaryPriceLabel}>/ personne</ThemedText>
            </View>
          </View>
        </Animated.View>

        <Animated.View 
          style={styles.formSection}
          entering={FadeInDown.delay(200).duration(400).springify()}
        >
          <ThemedText style={styles.sectionTitle}>Vos informations</ThemedText>
          
          <View style={[styles.inputWrapper, { backgroundColor: `rgba(${ct.accentRgb}, 0.08)`, borderColor: `rgba(${ct.accentRgb}, 0.2)` }, isUserDataPrefilled && profile?.full_name && styles.inputDisabled]}>
            <View style={[styles.inputIcon, { backgroundColor: `rgba(${ct.accentRgb}, 0.1)` }]}>
              <Feather name="user" size={18} color={ct.accent} />
            </View>
            <TextInput
              style={[styles.input, isUserDataPrefilled && profile?.full_name && styles.inputTextDisabled]}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Nom complet"
              placeholderTextColor="rgba(255,255,255,0.4)"
              autoCapitalize="words"
              editable={!isUserDataPrefilled || !profile?.full_name}
            />
            {isUserDataPrefilled && profile?.full_name ? (
              <Feather name="lock" size={14} color="rgba(255,255,255,0.3)" />
            ) : null}
          </View>

          <View style={[styles.inputWrapper, { backgroundColor: `rgba(${ct.accentRgb}, 0.08)`, borderColor: `rgba(${ct.accentRgb}, 0.2)` }, isUserDataPrefilled && styles.inputDisabled]}>
            <View style={[styles.inputIcon, { backgroundColor: `rgba(${ct.accentRgb}, 0.1)` }]}>
              <Feather name="mail" size={18} color={ct.accent} />
            </View>
            <TextInput
              style={[styles.input, isUserDataPrefilled && styles.inputTextDisabled]}
              value={email}
              onChangeText={setEmail}
              placeholder="Adresse email"
              placeholderTextColor="rgba(255,255,255,0.4)"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isUserDataPrefilled}
            />
            {isUserDataPrefilled ? (
              <Feather name="lock" size={14} color="rgba(255,255,255,0.3)" />
            ) : null}
          </View>

          <View style={[styles.inputWrapper, { backgroundColor: `rgba(${ct.accentRgb}, 0.08)`, borderColor: `rgba(${ct.accentRgb}, 0.2)` }, isUserDataPrefilled && profile?.phone && styles.inputDisabled]}>
            <View style={[styles.inputIcon, { backgroundColor: `rgba(${ct.accentRgb}, 0.1)` }]}>
              <Feather name="phone" size={18} color={ct.accent} />
            </View>
            <TextInput
              style={[styles.input, isUserDataPrefilled && profile?.phone && styles.inputTextDisabled]}
              value={phone}
              onChangeText={setPhone}
              placeholder="Numéro de téléphone"
              placeholderTextColor="rgba(255,255,255,0.4)"
              keyboardType="phone-pad"
              editable={!isUserDataPrefilled || !profile?.phone}
            />
            {isUserDataPrefilled && profile?.phone ? (
              <Feather name="lock" size={14} color="rgba(255,255,255,0.3)" />
            ) : null}
          </View>

          {isUserDataPrefilled ? (
            <View style={styles.prefillNote}>
              <Feather name="info" size={14} color="rgba(255,255,255,0.5)" />
              <ThemedText style={styles.prefillNoteText}>
                Informations pré-remplies depuis votre profil
              </ThemedText>
            </View>
          ) : null}
        </Animated.View>

        <Animated.View 
          style={styles.paymentSection}
          entering={FadeInDown.delay(300).duration(400).springify()}
        >
          <ThemedText style={styles.sectionTitle}>Mode de paiement</ThemedText>

          <PaymentOption
            icon="credit-card"
            title="Payer par carte"
            subtitle="Paiement sécurisé en ligne"
            selected={paymentMethod === "card"}
            onPress={() => setPaymentMethod("card")}
            ct={ct}
          />

          <PaymentOption
            icon="dollar-sign"
            title="Payer sur place"
            subtitle="En espèces le jour de l'activité"
            selected={paymentMethod === "cash"}
            onPress={() => setPaymentMethod("cash")}
            ct={ct}
          />
        </Animated.View>

        <Animated.View 
          style={[styles.totalSection, { backgroundColor: `rgba(${ct.accentRgb}, 0.1)` }]}
          entering={FadeInDown.delay(400).duration(400).springify()}
        >
          <View style={styles.totalRow}>
            <ThemedText style={styles.totalLabel}>Total à payer</ThemedText>
            <ThemedText style={[styles.totalPrice, { color: ct.accent }]}>
              {formatPrice(activity.price, city.currency)}
            </ThemedText>
          </View>
        </Animated.View>
      </KeyboardAwareScrollViewCompat>

      <Animated.View 
        style={[styles.bottomContainer, { paddingBottom: Math.max(insets.bottom, 34) + Spacing.md, backgroundColor: ct.background }]}
        entering={FadeInUp.delay(500).duration(400).springify()}
      >
        <ConfirmButton onPress={handleConfirmBooking} isLoading={isSubmitting} ct={ct} />
      </Animated.View>

      <Modal
        visible={showGuestModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGuestModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: ct.backgroundLight, borderColor: `rgba(${ct.accentRgb}, 0.3)` }]}>
            <View style={styles.modalHeader}>
              <Feather name="user-plus" size={32} color={ct.accent} />
              <ThemedText style={styles.modalTitle}>Créer un compte ?</ThemedText>
            </View>
            <ThemedText style={styles.modalText}>
              En créant un compte, vous pourrez suivre vos réservations et accéder à votre historique.
            </ThemedText>
            <Pressable style={[styles.modalButtonPrimary, { backgroundColor: ct.accent }]} onPress={handleCreateAccount}>
              <Feather name="user-plus" size={18} color={ct.background} />
              <ThemedText style={[styles.modalButtonPrimaryText, { color: ct.background }]}>Créer un compte</ThemedText>
            </Pressable>
            <Pressable style={[styles.modalButtonSecondary, { backgroundColor: `rgba(${ct.accentRgb}, 0.15)`, borderColor: `rgba(${ct.accentRgb}, 0.3)` }]} onPress={handleContinueAsGuest}>
              <Feather name="arrow-right" size={18} color={ct.accent} />
              <ThemedText style={[styles.modalButtonSecondaryText, { color: ct.accent }]}>Continuer en tant qu'invité</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showPaymentModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (paymentStep === "form") {
            setShowPaymentModal(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          {paymentStep === "success" ? (
            <Animated.View
              entering={ZoomIn.duration(400).springify()}
              style={[styles.successContainer, { backgroundColor: ct.backgroundLight, borderColor: `rgba(${ct.accentRgb}, 0.3)` }]}
            >
              <View style={[styles.successIconCircle, { backgroundColor: `rgba(${ct.accentRgb}, 0.15)` }]}>
                <View style={[styles.successIconInner, { backgroundColor: ct.accent }]}>
                  <Feather name="check" size={40} color={ct.background} />
                </View>
              </View>
              <ThemedText style={styles.successTitle}>Reservation confirmee !</ThemedText>
              <ThemedText style={styles.successSubtitle}>
                Merci {fullName} !
              </ThemedText>
              <View style={[styles.successDetail, { backgroundColor: `rgba(${ct.accentRgb}, 0.08)`, borderColor: `rgba(${ct.accentRgb}, 0.15)` }]}>
                <View style={styles.successDetailRow}>
                  <Feather name="calendar" size={16} color={ct.accent} />
                  <ThemedText style={styles.successDetailText}>{formatDate(selectedDate)}</ThemedText>
                </View>
                <View style={styles.successDetailRow}>
                  <Feather name="tag" size={16} color={ct.accent} />
                  <ThemedText style={styles.successDetailText}>{activity.title}</ThemedText>
                </View>
                <View style={styles.successDetailRow}>
                  <Feather name={paymentMethod === "card" ? "credit-card" : "dollar-sign"} size={16} color={ct.accent} />
                  <ThemedText style={styles.successDetailText}>
                    {paymentMethod === "card" ? "Paye par carte" : "Paiement sur place"}
                  </ThemedText>
                </View>
                <View style={[styles.successPriceBadge, { backgroundColor: `rgba(${ct.accentRgb}, 0.15)` }]}>
                  <ThemedText style={[styles.successPriceText, { color: ct.accent }]}>
                    {formatPrice(activity.price, city.currency)}
                  </ThemedText>
                </View>
              </View>
              <Pressable
                style={[styles.successButton, { backgroundColor: ct.accent }]}
                onPress={handleSuccessDone}
              >
                <Feather name="book-open" size={18} color={ct.background} />
                <ThemedText style={[styles.successButtonText, { color: ct.background }]}>
                  Voir mes reservations
                </ThemedText>
              </Pressable>
            </Animated.View>
          ) : paymentStep === "processing" ? (
            <Animated.View
              entering={FadeIn.duration(300)}
              style={[styles.processingContainer, { backgroundColor: ct.backgroundLight, borderColor: `rgba(${ct.accentRgb}, 0.3)` }]}
            >
              <ActivityIndicator size="large" color={ct.accent} />
              <ThemedText style={styles.processingTitle}>
                {paymentMethod === "card" ? "Traitement du paiement..." : "Confirmation en cours..."}
              </ThemedText>
              <ThemedText style={styles.processingSubtitle}>
                {paymentMethod === "card" ? "Verification de votre carte" : "Enregistrement de votre reservation"}
              </ThemedText>
            </Animated.View>
          ) : (
            <Animated.View
              entering={FadeInDown.duration(300)}
              style={[styles.paymentModalContent, { backgroundColor: ct.backgroundLight, borderColor: `rgba(${ct.accentRgb}, 0.3)` }]}
            >
              <View style={styles.paymentModalHeader}>
                <Pressable
                  style={styles.paymentModalClose}
                  onPress={() => setShowPaymentModal(false)}
                >
                  <Feather name="x" size={22} color="rgba(255,255,255,0.6)" />
                </Pressable>
                <View style={[styles.paymentModalIcon, { backgroundColor: `rgba(${ct.accentRgb}, 0.15)` }]}>
                  <Feather
                    name={paymentMethod === "card" ? "credit-card" : "dollar-sign"}
                    size={28}
                    color={ct.accent}
                  />
                </View>
                <ThemedText style={styles.paymentModalTitle}>
                  {paymentMethod === "card" ? "Paiement par carte" : "Paiement sur place"}
                </ThemedText>
                <ThemedText style={[styles.paymentModalAmount, { color: ct.accent }]}>
                  {formatPrice(activity.price, city.currency)}
                </ThemedText>
              </View>

              {paymentMethod === "card" ? (
                <View style={styles.cardForm}>
                  <View style={styles.sandboxBadge}>
                    <Feather name="shield" size={12} color="#FEE440" />
                    <ThemedText style={styles.sandboxText}>Mode sandbox - Paiement simule</ThemedText>
                  </View>

                  <ThemedText style={styles.cardLabel}>Numero de carte</ThemedText>
                  <View style={[styles.cardInput, { borderColor: `rgba(${ct.accentRgb}, 0.2)`, backgroundColor: `rgba(${ct.accentRgb}, 0.05)` }]}>
                    <Feather name="credit-card" size={18} color={ct.accent} />
                    <TextInput
                      style={styles.cardInputText}
                      value={cardNumber}
                      onChangeText={(t) => setCardNumber(formatCardNumber(t))}
                      placeholder="4242 4242 4242 4242"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      keyboardType="number-pad"
                      maxLength={19}
                    />
                  </View>

                  <View style={styles.cardRow}>
                    <View style={styles.cardHalf}>
                      <ThemedText style={styles.cardLabel}>Expiration</ThemedText>
                      <View style={[styles.cardInput, { borderColor: `rgba(${ct.accentRgb}, 0.2)`, backgroundColor: `rgba(${ct.accentRgb}, 0.05)` }]}>
                        <Feather name="calendar" size={18} color={ct.accent} />
                        <TextInput
                          style={styles.cardInputText}
                          value={cardExpiry}
                          onChangeText={(t) => setCardExpiry(formatExpiry(t))}
                          placeholder="MM/AA"
                          placeholderTextColor="rgba(255,255,255,0.3)"
                          keyboardType="number-pad"
                          maxLength={5}
                        />
                      </View>
                    </View>
                    <View style={styles.cardHalf}>
                      <ThemedText style={styles.cardLabel}>CVC</ThemedText>
                      <View style={[styles.cardInput, { borderColor: `rgba(${ct.accentRgb}, 0.2)`, backgroundColor: `rgba(${ct.accentRgb}, 0.05)` }]}>
                        <Feather name="lock" size={18} color={ct.accent} />
                        <TextInput
                          style={styles.cardInputText}
                          value={cardCvc}
                          onChangeText={(t) => setCardCvc(t.replace(/\D/g, "").slice(0, 3))}
                          placeholder="123"
                          placeholderTextColor="rgba(255,255,255,0.3)"
                          keyboardType="number-pad"
                          maxLength={3}
                          secureTextEntry
                        />
                      </View>
                    </View>
                  </View>

                  <ThemedText style={styles.cardLabel}>Nom du titulaire</ThemedText>
                  <View style={[styles.cardInput, { borderColor: `rgba(${ct.accentRgb}, 0.2)`, backgroundColor: `rgba(${ct.accentRgb}, 0.05)` }]}>
                    <Feather name="user" size={18} color={ct.accent} />
                    <TextInput
                      style={styles.cardInputText}
                      value={cardName}
                      onChangeText={setCardName}
                      placeholder="Nom sur la carte"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      autoCapitalize="characters"
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.cashInfo}>
                  <View style={[styles.cashInfoBox, { backgroundColor: `rgba(${ct.accentRgb}, 0.08)`, borderColor: `rgba(${ct.accentRgb}, 0.15)` }]}>
                    <Feather name="info" size={18} color={ct.accent} />
                    <ThemedText style={styles.cashInfoText}>
                      Le paiement sera effectue sur place le jour de l'activite. Votre reservation sera confirmee immediatement.
                    </ThemedText>
                  </View>
                  <View style={styles.cashDetailRow}>
                    <Feather name="check-circle" size={16} color={ct.accent} />
                    <ThemedText style={styles.cashDetailText}>Reservation garantie</ThemedText>
                  </View>
                  <View style={styles.cashDetailRow}>
                    <Feather name="check-circle" size={16} color={ct.accent} />
                    <ThemedText style={styles.cashDetailText}>Paiement en especes ou carte sur place</ThemedText>
                  </View>
                  <View style={styles.cashDetailRow}>
                    <Feather name="check-circle" size={16} color={ct.accent} />
                    <ThemedText style={styles.cashDetailText}>Annulation gratuite 24h avant</ThemedText>
                  </View>
                </View>
              )}

              <Pressable
                style={[styles.paymentConfirmBtn, { backgroundColor: ct.accent }]}
                onPress={handlePaymentConfirm}
              >
                <Feather
                  name={paymentMethod === "card" ? "lock" : "check"}
                  size={18}
                  color={ct.background}
                />
                <ThemedText style={[styles.paymentConfirmText, { color: ct.background }]}>
                  {paymentMethod === "card" ? "Payer maintenant" : "Confirmer la reservation"}
                </ThemedText>
              </Pressable>
            </Animated.View>
          )}
        </View>
      </Modal>
    </View>
  );
}

function PaymentOption({
  icon,
  title,
  subtitle,
  selected,
  onPress,
  ct,
}: {
  icon: string;
  title: string;
  subtitle: string;
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
      style={[
        styles.paymentOption,
        { backgroundColor: `rgba(${ct.accentRgb}, 0.08)`, borderColor: `rgba(${ct.accentRgb}, 0.2)` },
        selected && { borderColor: ct.accent, backgroundColor: `rgba(${ct.accentRgb}, 0.15)` },
        animatedStyle,
      ]}
    >
      <View style={[styles.paymentIconContainer, { backgroundColor: `rgba(${ct.accentRgb}, 0.15)` }, selected && { backgroundColor: ct.accent }]}>
        <Feather name={icon as any} size={20} color={selected ? ct.background : ct.accent} />
      </View>
      <View style={styles.paymentTextContainer}>
        <ThemedText style={[styles.paymentTitle, selected && { color: ct.accent }]}>
          {title}
        </ThemedText>
        <ThemedText style={styles.paymentSubtitle}>{subtitle}</ThemedText>
      </View>
      <View style={[styles.radioOuter, { borderColor: `rgba(${ct.accentRgb}, 0.4)` }, selected && { borderColor: ct.accent }]}>
        {selected ? <View style={[styles.radioInner, { backgroundColor: ct.accent }]} /> : null}
      </View>
    </AnimatedPressable>
  );
}

function ConfirmButton({ onPress, isLoading, ct }: { onPress: () => void; isLoading?: boolean; ct: ReturnType<typeof useCityTheme> }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.97, { damping: 15 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
      style={[styles.confirmButton, animatedStyle, isLoading && styles.confirmButtonDisabled]}
      disabled={isLoading}
    >
      <LinearGradient
        colors={isLoading ? [`rgba(${ct.accentRgb}, 0.4)`, `rgba(${ct.accentRgb}, 0.4)`] : [ct.accent, `rgba(${ct.accentRgb}, 0.8)`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.confirmGradient}
      >
        <ThemedText style={[styles.confirmButtonText, { color: ct.background }]}>
          {isLoading ? "Confirmation en cours..." : "Confirmer la réservation"}
        </ThemedText>
        {!isLoading ? (
          <View style={[styles.confirmArrow, { backgroundColor: ct.background }]}>
            <Feather name="check" size={18} color={ct.accent} />
          </View>
        ) : null}
      </LinearGradient>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#071A1A",
  },
  headerGradient: {
    paddingBottom: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 217, 192, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(0, 217, 192, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: AppColors.white,
    textAlign: "center",
  },
  headerSpacer: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  summaryCard: {
    height: 180,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: Spacing.xl,
  },
  summaryImage: {
    ...StyleSheet.absoluteFillObject,
  },
  summaryGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  summaryContent: {
    flex: 1,
    justifyContent: "flex-end",
    padding: Spacing.lg,
  },
  summaryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 217, 192, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  summaryBadgeText: {
    fontSize: 12,
    color: "#00D9C0",
    marginLeft: 6,
    fontWeight: "600",
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: AppColors.white,
    marginBottom: 6,
  },
  summaryPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  summaryPrice: {
    fontSize: 24,
    fontWeight: "800",
    color: "#00D9C0",
  },
  summaryPriceLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    marginLeft: 4,
  },
  formSection: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: AppColors.white,
    marginBottom: Spacing.md,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 217, 192, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(0, 217, 192, 0.2)",
    borderRadius: 14,
    marginBottom: 12,
    overflow: "hidden",
  },
  inputIcon: {
    width: 50,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 217, 192, 0.1)",
  },
  input: {
    flex: 1,
    height: 52,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
    color: AppColors.white,
  },
  inputDisabled: {
    backgroundColor: "rgba(0, 217, 192, 0.04)",
    borderColor: "rgba(0, 217, 192, 0.1)",
  },
  inputTextDisabled: {
    color: "rgba(255,255,255,0.6)",
  },
  prefillNote: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  prefillNoteText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
  },
  paymentSection: {
    marginBottom: Spacing.xl,
  },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 217, 192, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(0, 217, 192, 0.2)",
    borderRadius: 14,
    padding: Spacing.md,
    marginBottom: 10,
  },
  paymentOptionSelected: {
    borderColor: "#00D9C0",
    backgroundColor: "rgba(0, 217, 192, 0.15)",
  },
  paymentIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 217, 192, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  paymentIconSelected: {
    backgroundColor: "#00D9C0",
  },
  paymentTextContainer: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  paymentTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: AppColors.white,
  },
  paymentTitleSelected: {
    color: "#00D9C0",
  },
  paymentSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "rgba(0, 217, 192, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  radioOuterSelected: {
    borderColor: "#00D9C0",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#00D9C0",
  },
  totalSection: {
    backgroundColor: "rgba(0, 217, 192, 0.1)",
    borderRadius: 14,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 16,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "500",
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: "800",
    color: "#00D9C0",
  },
  bottomContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: "#071A1A",
  },
  confirmButton: {
    borderRadius: 16,
    overflow: "hidden",
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    paddingHorizontal: Spacing.xl,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: AppColors.white,
    marginRight: Spacing.sm,
  },
  confirmArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#00D9C0",
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: "#0f2847",
    borderRadius: 24,
    padding: Spacing.xl,
    width: "100%",
    maxWidth: 360,
    borderWidth: 1,
    borderColor: "rgba(0, 217, 192, 0.3)",
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: AppColors.white,
    marginTop: Spacing.md,
    textAlign: "center",
  },
  modalText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  modalButtonPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00D9C0",
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  modalButtonPrimaryText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#071A1A",
  },
  modalButtonSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 217, 192, 0.15)",
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 217, 192, 0.3)",
    gap: Spacing.sm,
  },
  modalButtonSecondaryText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#00D9C0",
  },
  paymentModalContent: {
    backgroundColor: "#0f2847",
    borderRadius: 24,
    padding: Spacing.xl,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: "rgba(0, 217, 192, 0.3)",
    maxHeight: "90%",
  },
  paymentModalHeader: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  paymentModalClose: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  paymentModalIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  paymentModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: AppColors.white,
    marginBottom: 4,
  },
  paymentModalAmount: {
    fontSize: 28,
    fontWeight: "800",
  },
  sandboxBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(254, 228, 64, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(254, 228, 64, 0.3)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: Spacing.lg,
    gap: 6,
  },
  sandboxText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FEE440",
  },
  cardForm: {
    marginBottom: Spacing.lg,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.6)",
    marginBottom: 6,
    marginTop: 12,
  },
  cardInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    gap: 10,
  },
  cardInputText: {
    flex: 1,
    fontSize: 16,
    color: AppColors.white,
    letterSpacing: 1,
  },
  cardRow: {
    flexDirection: "row",
    gap: 12,
  },
  cardHalf: {
    flex: 1,
  },
  cashInfo: {
    marginBottom: Spacing.lg,
  },
  cashInfoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: Spacing.md,
  },
  cashInfoText: {
    flex: 1,
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    lineHeight: 20,
  },
  cashDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  cashDetailText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },
  paymentConfirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 54,
    borderRadius: 14,
    gap: 8,
  },
  paymentConfirmText: {
    fontSize: 16,
    fontWeight: "700",
  },
  processingContainer: {
    borderRadius: 24,
    padding: Spacing.xl * 2,
    width: "100%",
    maxWidth: 360,
    borderWidth: 1,
    alignItems: "center",
  },
  processingTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: AppColors.white,
    marginTop: Spacing.lg,
    textAlign: "center",
  },
  processingSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    marginTop: 8,
    textAlign: "center",
  },
  successContainer: {
    borderRadius: 24,
    padding: Spacing.xl,
    width: "100%",
    maxWidth: 380,
    borderWidth: 1,
    alignItems: "center",
  },
  successIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  successIconInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: AppColors.white,
    textAlign: "center",
    marginBottom: 4,
  },
  successSubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.6)",
    marginBottom: Spacing.lg,
    textAlign: "center",
  },
  successDetail: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  successDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  successDetailText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    flex: 1,
  },
  successPriceBadge: {
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  successPriceText: {
    fontSize: 22,
    fontWeight: "800",
  },
  successButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 54,
    borderRadius: 14,
    width: "100%",
    gap: 8,
  },
  successButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
