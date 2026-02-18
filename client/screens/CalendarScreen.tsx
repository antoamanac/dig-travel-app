import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Modal,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { usePlanning } from "@/context/PlanningContext";
import { useCity, useCityTheme } from "@/context/CityContext";
import { useActivities, Activity } from "@/hooks/useActivities";
import { TextInput } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface SelectedActivity {
  dayIndex: number;
  activityId: string;
  category: string;
  currentTitle: string;
}

interface CustomActivityForm {
  title: string;
  time: string;
  duration: string;
  category: string;
  price: string;
}

export default function CalendarScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { currentPlanning, hasPlanning, clearPlanning, updateActivity, removeActivity, addCustomActivity, updatePaymentStatus, updateNote } = usePlanning();
  const { currentCity } = useCity();
  const ct = useCityTheme();
  const [selectedDay, setSelectedDay] = useState(0);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<SelectedActivity | null>(null);
  const [customForm, setCustomForm] = useState<CustomActivityForm>({
    title: "",
    time: "10:00",
    duration: "2h",
    category: "culture",
    price: "0",
  });
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [noteActivityInfo, setNoteActivityInfo] = useState<{ dayIndex: number; activityId: string; currentNote: string } | null>(null);
  const [noteText, setNoteText] = useState("");
  
  const cityId = currentPlanning?.cityId || "";
  const isPlanningForCurrentCity = !currentCity || !currentPlanning || currentPlanning.cityId === currentCity.id;
  const { data: allActivities, isLoading: loadingActivities } = useActivities(cityId);

  const categoryOptions = [
    { id: "culture", label: "Culture", icon: "book" },
    { id: "nature", label: "Nature", icon: "sun" },
    { id: "sea", label: "Mer", icon: "anchor" },
    { id: "food", label: "Restaurant", icon: "coffee" },
    { id: "wellness", label: "Bien-être", icon: "heart" },
    { id: "shopping", label: "Shopping", icon: "shopping-bag" },
  ];
  
  const getSimilarActivities = (category: string, currentTitle: string): Activity[] => {
    if (!allActivities) return [];
    return allActivities.filter(
      a => a.category === category && a.title !== currentTitle
    ).slice(0, 6);
  };

  const handleEditActivity = (dayIndex: number, activityId: string, category: string, currentTitle: string) => {
    setSelectedActivity({ dayIndex, activityId, category, currentTitle });
    setEditModalVisible(true);
  };

  const handleSelectAlternative = async (alternative: Activity) => {
    if (!selectedActivity) return;
    
    await updateActivity(selectedActivity.dayIndex, selectedActivity.activityId, {
      id: alternative.id,
      title: alternative.title,
      time: "",
      duration: alternative.duration,
      category: alternative.category,
      price: alternative.price,
      currency: alternative.currency,
      isBreak: false,
    });
    
    setEditModalVisible(false);
    setSelectedActivity(null);
  };

  const handleRemoveActivity = async () => {
    if (!selectedActivity) return;
    
    Alert.alert(
      "Supprimer l'activité",
      "Voulez-vous vraiment supprimer cette activité de votre planning ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            await removeActivity(selectedActivity.dayIndex, selectedActivity.activityId);
            setEditModalVisible(false);
            setSelectedActivity(null);
          },
        },
      ]
    );
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "culture": return "book";
      case "nature": return "sun";
      case "sea": return "anchor";
      case "food": return "coffee";
      case "wellness": return "heart";
      case "shopping": return "shopping-bag";
      case "break": return "clock";
      default: return "star";
    }
  };

  const handleClearPlanning = () => {
    Alert.alert(
      "Supprimer le planning",
      "Voulez-vous vraiment supprimer votre planning ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => clearPlanning(),
        },
      ]
    );
  };

  const handleActivityPress = (activityId: string, scheduledDate: string, isBreak?: boolean, currentNote?: string, activityTitle?: string) => {
    if (isBreak) {
      setNoteActivityInfo({ dayIndex: selectedDay, activityId, currentNote: currentNote || "" });
      setNoteText(currentNote || "");
      setNoteModalVisible(true);
      return;
    }
    
    let activity = allActivities?.find(a => a.id === activityId);
    
    if (!activity && activityTitle) {
      activity = allActivities?.find(a => 
        a.title.toLowerCase().includes(activityTitle.toLowerCase()) ||
        activityTitle.toLowerCase().includes(a.title.toLowerCase())
      );
    }
    
    if (!activity) {
      Alert.alert(
        "Activité non disponible",
        "Cette activité n'est pas encore dans notre catalogue. Vous pouvez explorer des activités similaires dans la liste.",
        [
          { text: "OK", style: "default" },
          { 
            text: "Voir les activités", 
            onPress: () => navigation.navigate("HomeTab", { screen: "CityLanding" })
          },
        ]
      );
      return;
    }
    
    const cityId = currentPlanning?.cityId || "";
    const cityData = {
      id: cityId,
      name: currentPlanning?.cityName || "",
      flag: "",
      activityCount: 0,
      image: "",
      operator: "",
      currency: currentPlanning?.currency || "EUR",
    };
    
    navigation.navigate("HomeTab", {
      screen: "ActivityDetail",
      params: {
        activity,
        city: cityData,
        preselectedDate: scheduledDate,
      },
    });
  };

  const handleSaveNote = async () => {
    if (!noteActivityInfo) return;
    await updateNote(noteActivityInfo.dayIndex, noteActivityInfo.activityId, noteText);
    setNoteModalVisible(false);
    setNoteActivityInfo(null);
    setNoteText("");
  };

  const handleBookActivity = (activityId: string, activityTitle: string, scheduledDate: string) => {
    const activity = allActivities?.find(a => a.id === activityId);
    if (!activity) {
      Alert.alert("Erreur", "Activité non trouvée");
      return;
    }
    
    const cityId = currentPlanning?.cityId || "";
    const cityData = {
      id: cityId,
      name: currentPlanning?.cityName || "",
      country: "",
      image: "",
      description: "",
      operator: { name: "", logo: "" },
    };
    
    navigation.navigate("HomeTab", {
      screen: "BookingForm",
      params: {
        activity,
        city: cityData,
        selectedDate: scheduledDate,
      },
    });
  };

  const handleAddCustomActivity = async () => {
    if (!customForm.title.trim()) {
      Alert.alert("Erreur", "Veuillez entrer un titre pour l'activité");
      return;
    }

    const newActivity = {
      id: `custom-${Date.now()}`,
      title: customForm.title.trim(),
      time: customForm.time,
      duration: customForm.duration,
      category: customForm.category,
      price: parseFloat(customForm.price) || 0,
      currency: currentPlanning?.currency || "EUR",
      isBreak: false,
      isCustom: true,
      paymentStatus: "pending" as const,
    };

    await addCustomActivity(selectedDay, newActivity);
    setAddModalVisible(false);
    setCustomForm({
      title: "",
      time: "10:00",
      duration: "2h",
      category: "culture",
      price: "0",
    });
  };

  if (!hasPlanning || !currentPlanning || (currentCity && currentPlanning.cityId !== currentCity.id)) {
    const hasOtherCityPlanning = hasPlanning && currentPlanning && currentCity && currentPlanning.cityId !== currentCity.id;
    const cityName = currentCity?.name || "votre destination";
    
    const pilotSteps = [
      { icon: "calendar" as const, color: "#FF8C42", title: "Vos dates", desc: "Choisissez quand vous partez" },
      { icon: "users" as const, color: "#FF5DA2", title: "Votre style", desc: "Couple, famille, amis ou solo" },
      { icon: "compass" as const, color: "#A78BFA", title: "Vos envies", desc: "Culture, aventure, détente..." },
      { icon: "zap" as const, color: "#34D399", title: "Votre planning", desc: "Généré en quelques secondes" },
    ];
    
    return (
      <View style={[styles.container, { backgroundColor: ct.background }]}>
        <LinearGradient
          colors={[ct.background, ct.backgroundLight, ct.background]}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
          <ThemedText style={styles.headerTitle}>Mon Planning</ThemedText>
          {currentCity ? (
            <ThemedText style={[styles.headerSubtitle, { color: ct.accent }]}>{currentCity.name}</ThemedText>
          ) : null}
        </View>
        
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.emptyScrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.delay(100).duration(500)} style={[styles.pilotHeroCard, { borderColor: `rgba(${ct.accentRgb}, 0.15)` }]}>
            <LinearGradient
              colors={[`rgba(${ct.accentRgb}, 0.12)`, `rgba(${ct.accentRgb}, 0.03)`]}
              style={styles.pilotHeroGradient}
            />
            <View style={styles.pilotHeroIconRow}>
              <View style={[styles.pilotHeroIcon, { backgroundColor: `rgba(${ct.accentRgb}, 0.15)` }]}>
                <Feather name="cpu" size={28} color={ct.accent} />
              </View>
            </View>
            <ThemedText style={styles.pilotHeroTitle}>
              DIG PILOT
            </ThemedText>
            <ThemedText style={[styles.pilotHeroSubtitle, { color: ct.accent }]}>
              Votre assistant de voyage intelligent
            </ThemedText>
            <ThemedText style={styles.pilotHeroDesc}>
              {hasOtherCityPlanning
                ? `Vous avez déjà un planning pour ${currentPlanning?.cityName}. Créez-en un sur mesure pour ${cityName} !`
                : `Laissez notre IA créer votre planning idéal pour ${cityName}. Dites-nous vos envies, on s'occupe du reste.`}
            </ThemedText>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(250).duration(400)}>
            <ThemedText style={styles.howItWorksTitle}>Comment ça marche ?</ThemedText>
          </Animated.View>

          {pilotSteps.map((step, index) => (
            <Animated.View
              key={step.title}
              entering={FadeInUp.delay(350 + index * 100).duration(400)}
              style={styles.stepCard}
            >
              <View style={[styles.stepNumber, { backgroundColor: `${step.color}20` }]}>
                <ThemedText style={[styles.stepNumberText, { color: step.color }]}>{index + 1}</ThemedText>
              </View>
              <View style={[styles.stepIconContainer, { backgroundColor: `${step.color}15` }]}>
                <Feather name={step.icon} size={20} color={step.color} />
              </View>
              <View style={styles.stepInfo}>
                <ThemedText style={styles.stepTitle}>{step.title}</ThemedText>
                <ThemedText style={styles.stepDesc}>{step.desc}</ThemedText>
              </View>
              {index < pilotSteps.length - 1 ? (
                <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.15)" />
              ) : (
                <Feather name="check" size={16} color="#34D399" />
              )}
            </Animated.View>
          ))}

          <Animated.View entering={FadeInUp.delay(800).duration(400)} style={styles.ctaSection}>
            {currentCity ? (
              <Pressable
                style={styles.createButton}
                onPress={() => navigation.navigate("PlannerBasicInfo", { city: currentCity })}
              >
                <LinearGradient
                  colors={[ct.accent, `rgba(${ct.accentRgb}, 0.7)`]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.createButtonGradient}
                >
                  <Feather name="cpu" size={20} color={ct.background} />
                  <ThemedText style={[styles.createButtonText, { color: ct.background }]}>
                    Créer mon planning pour {cityName}
                  </ThemedText>
                </LinearGradient>
              </Pressable>
            ) : (
              <Pressable
                style={styles.createButton}
                onPress={() => navigation.navigate("CitySelector")}
              >
                <LinearGradient
                  colors={[ct.accent, `rgba(${ct.accentRgb}, 0.7)`]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.createButtonGradient}
                >
                  <Feather name="map-pin" size={20} color={ct.background} />
                  <ThemedText style={[styles.createButtonText, { color: ct.background }]}>Choisir une destination</ThemedText>
                </LinearGradient>
              </Pressable>
            )}
            <ThemedText style={styles.ctaHint}>
              Gratuit - Seulement 30 secondes
            </ThemedText>
          </Animated.View>

          {hasOtherCityPlanning ? (
            <Animated.View entering={FadeInUp.delay(900).duration(400)}>
              <Pressable
                style={styles.viewOtherButton}
                onPress={() => {
                  const otherCity = { id: currentPlanning?.cityId, name: currentPlanning?.cityName } as any;
                  navigation.navigate("ModeSelection", { city: otherCity });
                }}
              >
                <Feather name="arrow-right" size={14} color={ct.accent} />
                <ThemedText style={[styles.viewOtherText, { color: ct.accent }]}>
                  Voir mon planning pour {currentPlanning?.cityName}
                </ThemedText>
              </Pressable>
            </Animated.View>
          ) : null}
        </ScrollView>
      </View>
    );
  }

  const planning = currentPlanning.planning;

  return (
    <View style={[styles.container, { backgroundColor: ct.background }]}>
      <LinearGradient
        colors={[ct.background, ct.backgroundLight, ct.background]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <View style={styles.headerLeft}>
          <ThemedText style={styles.headerTitle}>Mon Calendrier</ThemedText>
          <ThemedText style={[styles.headerSubtitle, { color: ct.accent }]}>{currentPlanning.cityName}</ThemedText>
        </View>
        <Pressable style={styles.clearButton} onPress={handleClearPlanning}>
          <Feather name="trash-2" size={18} color="rgba(255,255,255,0.5)" />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.dayTabs}
        contentContainerStyle={styles.dayTabsContent}
      >
        {planning.map((day, index) => (
          <Pressable
            key={day.date}
            style={[styles.dayTab, selectedDay === index && [styles.dayTabActive, { backgroundColor: ct.accent }]]}
            onPress={() => setSelectedDay(index)}
          >
            <ThemedText style={[styles.dayTabLabel, selectedDay === index && [styles.dayTabLabelActive, { color: ct.background }]]}>
              Jour {index + 1}
            </ThemedText>
            <ThemedText style={[styles.dayTabDate, selectedDay === index && [styles.dayTabDateActive, { color: `rgba(${ct.backgroundRgb}, 0.7)` }]]}>
              {new Date(day.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {planning[selectedDay] && (
          <Animated.View entering={FadeIn.duration(300)}>
            <View style={styles.dayHeader}>
              <ThemedText style={styles.dayTitle}>{planning[selectedDay].dayLabel}</ThemedText>
              <Pressable
                style={[styles.addActivityButton, { backgroundColor: `rgba(${ct.accentRgb}, 0.15)` }]}
                onPress={() => setAddModalVisible(true)}
              >
                <Feather name="plus" size={18} color={ct.accent} />
                <ThemedText style={[styles.addActivityText, { color: ct.accent }]}>Ajouter</ThemedText>
              </Pressable>
            </View>
            
            <View style={styles.timeline}>
              {planning[selectedDay].activities.map((activity, index) => (
                <Animated.View
                  key={activity.id}
                  entering={FadeInUp.delay(index * 80).duration(300)}
                >
                  <Pressable
                    style={[
                      styles.activityCard,
                      activity.isBreak && styles.activityCardBreak,
                    ]}
                    onPress={() => handleActivityPress(activity.id, planning[selectedDay].date, activity.isBreak, activity.note, activity.title)}
                  >
                    <View style={styles.activityTimeContainer}>
                      <ThemedText style={styles.activityTime}>{activity.time || "-"}</ThemedText>
                      <ThemedText style={styles.activityDuration}>{activity.duration}</ThemedText>
                    </View>
                    
                    <View style={styles.timelineDot}>
                      <View style={[
                        styles.dot,
                        { backgroundColor: ct.accent, borderColor: ct.background },
                        activity.isBreak && styles.dotBreak,
                      ]} />
                      {index < planning[selectedDay].activities.length - 1 && (
                        <View style={[styles.timelineLine, { backgroundColor: `rgba(${ct.accentRgb}, 0.2)` }]} />
                      )}
                    </View>
                    
                    <View style={[styles.activityContent, { backgroundColor: `rgba(${ct.accentRgb}, 0.05)` }]}>
                      <View style={[
                        styles.activityIcon,
                        { backgroundColor: `rgba(${ct.accentRgb}, 0.15)` },
                        activity.isBreak && styles.activityIconBreak,
                      ]}>
                        <Feather
                          name={getCategoryIcon(activity.category) as any}
                          size={18}
                          color={activity.isBreak ? "rgba(255,255,255,0.3)" : ct.accent}
                        />
                      </View>
                      <View style={styles.activityInfo}>
                        <View style={styles.activityTitleRow}>
                          <ThemedText style={[
                            styles.activityTitle,
                            activity.isBreak && styles.activityTitleBreak,
                          ]} numberOfLines={1}>
                            {activity.title}
                          </ThemedText>
                          {activity.isCustom && (
                            <View style={styles.customBadge}>
                              <ThemedText style={styles.customBadgeText}>Perso</ThemedText>
                            </View>
                          )}
                          {activity.isBreak && (
                            <View style={styles.noteHint}>
                              <Feather name="edit-3" size={12} color="rgba(255,255,255,0.4)" />
                            </View>
                          )}
                        </View>
                        {activity.isBreak && activity.note ? (
                          <ThemedText style={[styles.activityNote, { color: `rgba(${ct.accentRgb}, 0.8)` }]} numberOfLines={1}>
                            {activity.note}
                          </ThemedText>
                        ) : null}
                        <View style={styles.activityMeta}>
                          {!activity.isBreak && activity.price > 0 && (
                            <ThemedText style={[styles.activityPrice, { color: ct.secondary }]}>
                              {activity.price} {activity.currency}
                            </ThemedText>
                          )}
                          {!activity.isBreak && (
                            <View style={[
                              styles.paymentBadge,
                              activity.paymentStatus === "paid" ? styles.paymentBadgePaid : styles.paymentBadgePending,
                            ]}>
                              <Feather 
                                name={activity.paymentStatus === "paid" ? "check-circle" : "clock"} 
                                size={10} 
                                color={activity.paymentStatus === "paid" ? AppColors.success : "#FFB800"} 
                              />
                              <ThemedText style={[
                                styles.paymentBadgeText,
                                activity.paymentStatus === "paid" ? styles.paymentBadgeTextPaid : styles.paymentBadgeTextPending,
                              ]}>
                                {activity.paymentStatus === "paid" ? "Payé" : "En attente"}
                              </ThemedText>
                            </View>
                          )}
                        </View>
                      </View>
                      {!activity.isBreak && (
                        <Pressable
                          style={[styles.editButton, { backgroundColor: `rgba(${ct.accentRgb}, 0.15)` }]}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleEditActivity(selectedDay, activity.id, activity.category, activity.title);
                          }}
                        >
                          <Feather name="edit-2" size={16} color={ct.accent} />
                        </Pressable>
                      )}
                    </View>
                  </Pressable>
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        )}
      </ScrollView>

      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setEditModalVisible(false)} />
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + Spacing.lg, backgroundColor: ct.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: `rgba(${ct.accentRgb}, 0.1)` }]}>
              <View style={styles.modalHandle} />
              <ThemedText style={styles.modalTitle}>Modifier l'activité</ThemedText>
              <ThemedText style={styles.modalSubtitle}>
                Choisissez une alternative similaire
              </ThemedText>
            </View>
            
            {loadingActivities ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={ct.accent} />
              </View>
            ) : (
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {selectedActivity && getSimilarActivities(selectedActivity.category, selectedActivity.currentTitle).length === 0 ? (
                  <View style={styles.noAlternatives}>
                    <Feather name="info" size={32} color={`rgba(${ct.accentRgb}, 0.4)`} />
                    <ThemedText style={styles.noAlternativesText}>
                      Aucune alternative disponible pour cette catégorie
                    </ThemedText>
                  </View>
                ) : (
                  selectedActivity && getSimilarActivities(selectedActivity.category, selectedActivity.currentTitle).map((alt) => (
                    <Pressable
                      key={alt.id}
                      style={styles.alternativeCard}
                      onPress={() => handleSelectAlternative(alt)}
                    >
                      <Image
                        source={{ uri: alt.image || alt.images[0] }}
                        style={styles.alternativeImage}
                        contentFit="cover"
                      />
                      <View style={styles.alternativeInfo}>
                        <ThemedText style={styles.alternativeTitle} numberOfLines={2}>
                          {alt.title}
                        </ThemedText>
                        <View style={styles.alternativeMeta}>
                          <View style={styles.alternativeDuration}>
                            <Feather name="clock" size={12} color="rgba(255,255,255,0.5)" />
                            <ThemedText style={styles.alternativeMetaText}>{alt.duration}</ThemedText>
                          </View>
                          <ThemedText style={[styles.alternativePrice, { color: ct.secondary }]}>
                            {alt.price} {alt.currency}
                          </ThemedText>
                        </View>
                      </View>
                      <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.3)" />
                    </Pressable>
                  ))
                )}
              </ScrollView>
            )}
            
            <View style={[styles.modalActions, { borderTopColor: `rgba(${ct.accentRgb}, 0.1)` }]}>
              <Pressable style={styles.removeButton} onPress={handleRemoveActivity}>
                <Feather name="trash-2" size={18} color={AppColors.error} />
                <ThemedText style={styles.removeButtonText}>Supprimer</ThemedText>
              </Pressable>
              <Pressable style={styles.cancelButton} onPress={() => setEditModalVisible(false)}>
                <ThemedText style={styles.cancelButtonText}>Annuler</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={addModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setAddModalVisible(false)} />
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + Spacing.lg, backgroundColor: ct.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: `rgba(${ct.accentRgb}, 0.1)` }]}>
              <View style={styles.modalHandle} />
              <ThemedText style={styles.modalTitle}>Ajouter une activité</ThemedText>
              <ThemedText style={styles.modalSubtitle}>
                Créez votre propre activité personnalisée
              </ThemedText>
            </View>
            
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Titre de l'activité</ThemedText>
                <TextInput
                  style={[styles.formInput, { borderColor: `rgba(${ct.accentRgb}, 0.2)` }]}
                  placeholder="Ex: Visite du musée..."
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={customForm.title}
                  onChangeText={(text) => setCustomForm(prev => ({ ...prev, title: text }))}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: Spacing.sm }]}>
                  <ThemedText style={styles.formLabel}>Heure</ThemedText>
                  <TextInput
                    style={[styles.formInput, { borderColor: `rgba(${ct.accentRgb}, 0.2)` }]}
                    placeholder="10:00"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={customForm.time}
                    onChangeText={(text) => setCustomForm(prev => ({ ...prev, time: text }))}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <ThemedText style={styles.formLabel}>Durée</ThemedText>
                  <TextInput
                    style={[styles.formInput, { borderColor: `rgba(${ct.accentRgb}, 0.2)` }]}
                    placeholder="2h"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={customForm.duration}
                    onChangeText={(text) => setCustomForm(prev => ({ ...prev, duration: text }))}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Prix (EUR)</ThemedText>
                <TextInput
                  style={[styles.formInput, { borderColor: `rgba(${ct.accentRgb}, 0.2)` }]}
                  placeholder="0"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  keyboardType="numeric"
                  value={customForm.price}
                  onChangeText={(text) => setCustomForm(prev => ({ ...prev, price: text }))}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Catégorie</ThemedText>
                <View style={styles.categoryGrid}>
                  {categoryOptions.map((cat) => (
                    <Pressable
                      key={cat.id}
                      style={[
                        styles.categoryOption,
                        customForm.category === cat.id && [styles.categoryOptionActive, { backgroundColor: `rgba(${ct.accentRgb}, 0.15)`, borderColor: ct.accent }],
                      ]}
                      onPress={() => setCustomForm(prev => ({ ...prev, category: cat.id }))}
                    >
                      <Feather
                        name={cat.icon as any}
                        size={18}
                        color={customForm.category === cat.id ? ct.accent : "rgba(255,255,255,0.5)"}
                      />
                      <ThemedText style={[
                        styles.categoryOptionText,
                        customForm.category === cat.id && [styles.categoryOptionTextActive, { color: ct.accent }],
                      ]}>
                        {cat.label}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
            </ScrollView>
            
            <View style={[styles.modalActions, { borderTopColor: `rgba(${ct.accentRgb}, 0.1)` }]}>
              <Pressable style={styles.addButton} onPress={handleAddCustomActivity}>
                <LinearGradient
                  colors={[ct.accent, `rgba(${ct.accentRgb}, 0.7)`]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.addButtonGradient}
                >
                  <Feather name="plus" size={18} color={ct.background} />
                  <ThemedText style={[styles.addButtonText, { color: ct.background }]}>Ajouter</ThemedText>
                </LinearGradient>
              </Pressable>
              <Pressable style={styles.cancelButton} onPress={() => setAddModalVisible(false)}>
                <ThemedText style={styles.cancelButtonText}>Annuler</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={noteModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNoteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setNoteModalVisible(false)} />
          <View style={[styles.modalContent, styles.noteModalContent, { paddingBottom: insets.bottom + Spacing.lg, backgroundColor: ct.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: `rgba(${ct.accentRgb}, 0.1)` }]}>
              <View style={styles.modalHandle} />
              <ThemedText style={styles.modalTitle}>Ajouter une note</ThemedText>
              <ThemedText style={styles.modalSubtitle}>
                Notez ce que vous voulez faire pendant ce temps libre
              </ThemedText>
            </View>
            
            <View style={styles.noteInputContainer}>
              <TextInput
                style={[styles.noteInput, { borderColor: `rgba(${ct.accentRgb}, 0.2)` }]}
                value={noteText}
                onChangeText={setNoteText}
                placeholder="Ex: Faire de la randonnée, visiter le marché..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                multiline
                maxLength={200}
              />
            </View>
            
            <View style={[styles.modalActions, { borderTopColor: `rgba(${ct.accentRgb}, 0.1)` }]}>
              <Pressable style={styles.saveNoteButton} onPress={handleSaveNote}>
                <LinearGradient
                  colors={[ct.accent, `rgba(${ct.accentRgb}, 0.7)`]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.addButtonGradient}
                >
                  <Feather name="check" size={18} color={ct.background} />
                  <ThemedText style={[styles.addButtonText, { color: ct.background }]}>Enregistrer</ThemedText>
                </LinearGradient>
              </Pressable>
              <Pressable style={styles.cancelButton} onPress={() => setNoteModalVisible(false)}>
                <ThemedText style={styles.cancelButtonText}>Annuler</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md, backgroundColor: `rgba(${ct.backgroundRgb}, 0.98)`, borderTopColor: `rgba(${ct.accentRgb}, 0.1)` }]}>
        <View style={styles.footerInfo}>
          <ThemedText style={styles.footerLabel}>Total estimé</ThemedText>
          <ThemedText style={styles.footerPrice}>
            {currentPlanning.totalPrice} {currentPlanning.currency || "EUR"}
          </ThemedText>
        </View>
        <View style={styles.footerBadge}>
          <Feather name="check-circle" size={16} color={AppColors.success} />
          <ThemedText style={styles.footerBadgeText}>Sauvegardé localement</ThemedText>
        </View>
      </View>
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
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: AppColors.white,
  },
  headerSubtitle: {
    fontSize: 14,
    color: AppColors.secondary,
    marginTop: 2,
  },
  clearButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyScrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  pilotHeroCard: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    padding: Spacing.xl,
    alignItems: "center",
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: "rgba(135,206,235,0.15)",
  },
  pilotHeroGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BorderRadius.lg,
  },
  pilotHeroIconRow: {
    marginBottom: Spacing.md,
  },
  pilotHeroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(135,206,235,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  pilotHeroTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: AppColors.white,
    letterSpacing: 1,
    marginBottom: 4,
  },
  pilotHeroSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: AppColors.secondary,
    marginBottom: Spacing.md,
  },
  pilotHeroDesc: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    lineHeight: 21,
  },
  howItWorksTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "rgba(255,255,255,0.8)",
    marginBottom: Spacing.md,
  },
  stepCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: "800",
  },
  stepIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  stepInfo: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: AppColors.white,
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
  },
  ctaSection: {
    alignItems: "center",
    marginTop: Spacing.lg,
  },
  ctaHint: {
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
    marginTop: Spacing.sm,
  },
  createButton: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    width: "100%",
  },
  createButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: 16,
    paddingHorizontal: Spacing.xl,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f1c2e",
  },
  viewOtherButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  viewOtherText: {
    fontSize: 14,
    fontWeight: "600",
    color: AppColors.secondary,
  },
  dayTabs: {
    maxHeight: 70,
  },
  dayTabsContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  dayTab: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
  },
  dayTabActive: {
    backgroundColor: AppColors.secondary,
  },
  dayTabLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: AppColors.white,
  },
  dayTabLabelActive: {
    color: "#071A1A",
  },
  dayTabDate: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.5)",
  },
  dayTabDateActive: {
    color: "rgba(7, 26, 26, 0.7)",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  dayTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: AppColors.white,
    marginBottom: Spacing.lg,
    textTransform: "capitalize",
  },
  timeline: {
    gap: Spacing.xs,
  },
  activityCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: Spacing.md,
    paddingRight: Spacing.md,
  },
  activityCardBreak: {
    opacity: 0.6,
  },
  activityTimeContainer: {
    width: 50,
    alignItems: "flex-end",
    paddingRight: Spacing.sm,
  },
  activityTime: {
    fontSize: 13,
    fontWeight: "600",
    color: AppColors.white,
  },
  activityDuration: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.4)",
  },
  timelineDot: {
    alignItems: "center",
    width: 20,
    marginRight: Spacing.md,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: AppColors.secondary,
    borderWidth: 2,
    borderColor: "#071A1A",
  },
  dotBreak: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 40,
    backgroundColor: "rgba(0, 217, 192, 0.2)",
    marginTop: 4,
  },
  activityContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(0, 217, 192, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  activityIconBreak: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: AppColors.white,
    marginBottom: 2,
  },
  activityTitleBreak: {
    fontStyle: "italic",
    color: "rgba(255, 255, 255, 0.5)",
  },
  activityPrice: {
    fontSize: 12,
    color: AppColors.secondary,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: "rgba(7, 26, 26, 0.98)",
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 217, 192, 0.1)",
  },
  footerInfo: {
    flex: 1,
  },
  footerLabel: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.5)",
    textTransform: "uppercase",
  },
  footerPrice: {
    fontSize: 20,
    fontWeight: "800",
    color: AppColors.white,
  },
  footerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  footerBadgeText: {
    fontSize: 11,
    color: AppColors.success,
    fontWeight: "600",
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 217, 192, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  modalContent: {
    backgroundColor: "#071A1A",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.lg,
    maxHeight: "80%",
  },
  modalHeader: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 217, 192, 0.1)",
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: AppColors.white,
    marginBottom: Spacing.xs,
  },
  modalSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.5)",
  },
  modalLoading: {
    paddingVertical: Spacing.xl * 2,
    alignItems: "center",
  },
  modalScroll: {
    maxHeight: 300,
    marginVertical: Spacing.md,
  },
  noAlternatives: {
    alignItems: "center",
    paddingVertical: Spacing.xl * 2,
    gap: Spacing.md,
  },
  noAlternativesText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "center",
  },
  alternativeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  alternativeImage: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.sm,
  },
  alternativeInfo: {
    flex: 1,
  },
  alternativeTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: AppColors.white,
    marginBottom: Spacing.xs,
  },
  alternativeMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  alternativeDuration: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  alternativeMetaText: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.5)",
  },
  alternativePrice: {
    fontSize: 13,
    fontWeight: "700",
    color: AppColors.secondary,
  },
  modalActions: {
    flexDirection: "row",
    gap: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 217, 192, 0.1)",
  },
  removeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: "rgba(244, 67, 54, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(244, 67, 54, 0.3)",
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: AppColors.error,
  },
  cancelButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: AppColors.white,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  addActivityButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: "rgba(0, 217, 192, 0.15)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  addActivityText: {
    fontSize: 13,
    fontWeight: "600",
    color: AppColors.secondary,
  },
  activityTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: 2,
  },
  customBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  customBadgeText: {
    fontSize: 9,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.6)",
    textTransform: "uppercase",
  },
  activityMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  paymentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  paymentBadgePending: {
    backgroundColor: "rgba(255, 184, 0, 0.15)",
  },
  paymentBadgePaid: {
    backgroundColor: "rgba(76, 175, 80, 0.15)",
  },
  paymentBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  paymentBadgeTextPending: {
    color: "#FFB800",
  },
  paymentBadgeTextPaid: {
    color: AppColors.success,
  },
  formGroup: {
    marginBottom: Spacing.md,
  },
  formRow: {
    flexDirection: "row",
  },
  formLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: Spacing.xs,
  },
  formInput: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 15,
    color: AppColors.white,
    borderWidth: 1,
    borderColor: "rgba(0, 217, 192, 0.2)",
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  categoryOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: "transparent",
  },
  categoryOptionActive: {
    backgroundColor: "rgba(0, 217, 192, 0.15)",
    borderColor: AppColors.secondary,
  },
  categoryOptionText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
  },
  categoryOptionTextActive: {
    color: AppColors.secondary,
    fontWeight: "600",
  },
  addButton: {
    flex: 1,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  addButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#071A1A",
  },
  noteHint: {
    marginLeft: Spacing.xs,
    opacity: 0.6,
  },
  activityNote: {
    fontSize: 12,
    color: "rgba(0, 217, 192, 0.8)",
    fontStyle: "italic",
    marginTop: 2,
  },
  noteModalContent: {
    maxHeight: "50%",
  },
  noteInputContainer: {
    marginBottom: Spacing.lg,
  },
  noteInput: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 15,
    color: AppColors.white,
    borderWidth: 1,
    borderColor: "rgba(0, 217, 192, 0.2)",
    minHeight: 100,
    textAlignVertical: "top",
  },
  saveNoteButton: {
    flex: 1,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
});
