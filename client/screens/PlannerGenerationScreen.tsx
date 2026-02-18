import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import DateTimePicker from "@react-native-community/datetimepicker";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { useCityTheme } from "@/context/CityContext";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { getApiUrl, apiRequest } from "@/lib/query-client";
import { usePlanning } from "@/context/PlanningContext";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "PlannerGeneration">;
type ScreenRouteProp = RouteProp<RootStackParamList, "PlannerGeneration">;

interface PlannedActivity {
  id: string;
  title: string;
  time: string;
  duration: string;
  category: string;
  price: number;
  currency: string;
  image?: string;
  isBreak?: boolean;
  note?: string;
  numPeople?: number;
}

interface DayPlan {
  date: string;
  dayLabel: string;
  activities: PlannedActivity[];
}

export default function PlannerGenerationScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRouteProp>();
  const insets = useSafeAreaInsets();
  const { city, startDate, endDate, numPeople, context, preferences } = route.params;
  const { savePlanning } = usePlanning();
  const ct = useCityTheme();

  const [isGenerating, setIsGenerating] = useState(true);
  const [planning, setPlanning] = useState<DayPlan[]>([]);
  const [selectedDay, setSelectedDay] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [selectedBreak, setSelectedBreak] = useState<{ dayIndex: number; activityId: string } | null>(null);
  const [noteText, setNoteText] = useState("");
  
  const [activityModalVisible, setActivityModalVisible] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<{ dayIndex: number; activity: PlannedActivity } | null>(null);
  const [activityNumPeople, setActivityNumPeople] = useState(numPeople);
  const [activityNote, setActivityNote] = useState("");
  const [activityTimeDate, setActivityTimeDate] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [activityDayIndex, setActivityDayIndex] = useState(0);
  
  const [addActivityModalVisible, setAddActivityModalVisible] = useState(false);
  const [availableActivities, setAvailableActivities] = useState<PlannedActivity[]>([]);

  const timeSlots = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
    "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
    "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
    "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00"
  ];

  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 2000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const spinnerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const generatePlanning = useCallback(async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(new URL("/api/planner/generate", getApiUrl()).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cityId: city.id,
          cityName: city.name,
          startDate,
          endDate,
          numPeople,
          context,
          preferences,
        }),
      });

      if (!response.ok) {
        throw new Error("Echec de la generation");
      }

      const data = await response.json();
      setPlanning(data.planning);
    } catch (err) {
      console.error("Planning generation error:", err);
      setError("Impossible de générer le planning. Veuillez réessayer.");
      generateMockPlanning();
    } finally {
      setIsGenerating(false);
    }
  }, [city, startDate, endDate, numPeople, preferences]);

  const generateMockPlanning = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days: DayPlan[] = [];

    const mockActivities = [
      { title: "Visite du temple", category: "culture", duration: "2h", price: 25 },
      { title: "Plongee sous-marine", category: "sea", duration: "3h", price: 80 },
      { title: "Cours de cuisine locale", category: "food", duration: "2h30", price: 45 },
      { title: "Massage traditionnel", category: "wellness", duration: "1h30", price: 35 },
      { title: "Marche local", category: "shopping", duration: "2h", price: 0 },
      { title: "Excursion en bateau", category: "nature", duration: "4h", price: 60 },
      { title: "Diner gastronomique", category: "food", duration: "2h", price: 55 },
      { title: "Randonnee nature", category: "nature", duration: "3h", price: 30 },
    ];

    let currentDate = new Date(start);
    let dayIndex = 0;

    while (currentDate <= end) {
      const dayActivities: PlannedActivity[] = [];
      const activitiesPerDay = preferences.rhythm === "relax" ? 2 : preferences.rhythm === "intense" ? 4 : 3;

      for (let i = 0; i < activitiesPerDay; i++) {
        const activity = mockActivities[(dayIndex * activitiesPerDay + i) % mockActivities.length];
        const hour = 9 + (i * 3);
        dayActivities.push({
          id: `day${dayIndex}-act${i}`,
          title: activity.title,
          time: `${hour.toString().padStart(2, "0")}:00`,
          duration: activity.duration,
          category: activity.category,
          price: activity.price,
          currency: city.currency,
        });

        if (i < activitiesPerDay - 1) {
          dayActivities.push({
            id: `day${dayIndex}-break${i}`,
            title: "Temps libre",
            time: "",
            duration: "1h",
            category: "break",
            price: 0,
            currency: city.currency,
            isBreak: true,
          });
        }
      }

      days.push({
        date: currentDate.toISOString(),
        dayLabel: currentDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" }),
        activities: dayActivities,
      });

      currentDate.setDate(currentDate.getDate() + 1);
      dayIndex++;
    }

    setPlanning(days);
  };

  useEffect(() => {
    generatePlanning();
  }, [generatePlanning]);

  const handleActivityPress = (activity: PlannedActivity) => {
    if (activity.isBreak) {
      setSelectedBreak({ dayIndex: selectedDay, activityId: activity.id });
      setNoteText(activity.note || "");
      setNoteModalVisible(true);
      return;
    }
    setSelectedActivity({ dayIndex: selectedDay, activity });
    setActivityNumPeople(activity.numPeople || numPeople);
    setActivityNote(activity.note || "");
    setActivityDayIndex(selectedDay);
    
    const timeStr = activity.time || "09:00";
    const [hours, minutes] = timeStr.split(":").map(Number);
    const timeDate = new Date();
    timeDate.setHours(hours || 9, minutes || 0, 0, 0);
    setActivityTimeDate(timeDate);
    
    setActivityModalVisible(true);
  };

  const handleSaveNote = () => {
    if (!selectedBreak) return;
    const newPlanning = [...planning];
    const activity = newPlanning[selectedBreak.dayIndex].activities.find(
      (a) => a.id === selectedBreak.activityId
    );
    if (activity) {
      activity.note = noteText.trim();
    }
    setPlanning(newPlanning);
    setNoteModalVisible(false);
    setSelectedBreak(null);
    setNoteText("");
  };

  const handleSaveActivity = () => {
    if (!selectedActivity) return;
    const newPlanning = [...planning];
    
    const hours = activityTimeDate.getHours().toString().padStart(2, "0");
    const minutes = activityTimeDate.getMinutes().toString().padStart(2, "0");
    const newTime = `${hours}:${minutes}`;
    
    if (activityDayIndex !== selectedActivity.dayIndex) {
      newPlanning[selectedActivity.dayIndex].activities = 
        newPlanning[selectedActivity.dayIndex].activities.filter(
          (a) => a.id !== selectedActivity.activity.id
        );
      
      const updatedActivity = {
        ...selectedActivity.activity,
        numPeople: activityNumPeople,
        note: activityNote.trim(),
        time: newTime,
      };
      newPlanning[activityDayIndex].activities.push(updatedActivity);
      newPlanning[activityDayIndex].activities.sort((a, b) => 
        (a.time || "").localeCompare(b.time || "")
      );
    } else {
      const activity = newPlanning[selectedActivity.dayIndex].activities.find(
        (a) => a.id === selectedActivity.activity.id
      );
      if (activity) {
        activity.numPeople = activityNumPeople;
        activity.note = activityNote.trim();
        activity.time = newTime;
      }
      newPlanning[selectedActivity.dayIndex].activities.sort((a, b) => 
        (a.time || "").localeCompare(b.time || "")
      );
    }
    
    setPlanning(newPlanning);
    setActivityModalVisible(false);
    setSelectedActivity(null);
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowTimePicker(false);
    }
    if (selectedDate) {
      setActivityTimeDate(selectedDate);
    }
  };

  const handleOpenAddActivity = () => {
    const mockAvailable: PlannedActivity[] = [
      { id: "add-1", title: "Excursion désert", time: "09:00", duration: "4h", category: "nature", price: 75, currency: city.currency },
      { id: "add-2", title: "Tour en bateau", time: "14:00", duration: "3h", category: "sea", price: 50, currency: city.currency },
      { id: "add-3", title: "Visite guidée", time: "10:00", duration: "2h", category: "culture", price: 30, currency: city.currency },
      { id: "add-4", title: "Dégustation locale", time: "12:00", duration: "1h30", category: "food", price: 40, currency: city.currency },
      { id: "add-5", title: "Spa & Hammam", time: "16:00", duration: "2h", category: "wellness", price: 55, currency: city.currency },
    ];
    setAvailableActivities(mockAvailable);
    setAddActivityModalVisible(true);
  };

  const handleAddActivityToPlanning = (activity: PlannedActivity) => {
    const newPlanning = [...planning];
    const newActivity = {
      ...activity,
      id: `added-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      numPeople: numPeople,
    };
    newPlanning[selectedDay].activities.push(newActivity);
    newPlanning[selectedDay].activities.sort((a, b) => 
      (a.time || "").localeCompare(b.time || "")
    );
    setPlanning(newPlanning);
    setAddActivityModalVisible(false);
  };

  const handleViewActivityDetails = () => {
    if (!selectedActivity) return;
    setActivityModalVisible(false);
    Alert.alert(
      "Voir les détails",
      "Les détails complets seront disponibles après confirmation du planning dans l'onglet Calendrier."
    );
  };

  const handleRemoveActivity = (dayIndex: number, activityId: string) => {
    const newPlanning = [...planning];
    newPlanning[dayIndex].activities = newPlanning[dayIndex].activities.filter(
      (a) => a.id !== activityId
    );
    setPlanning(newPlanning);
  };

  const handleConfirmPlanning = async () => {
    const totalPrice = planning.reduce((total, day) => 
      total + day.activities.reduce((dayTotal, act) => dayTotal + (act.isBreak ? 0 : act.price), 0), 0
    ) * numPeople;

    await savePlanning({
      cityId: city.id,
      cityName: city.name,
      currency: city.currency,
      planning,
      createdAt: new Date().toISOString(),
      totalPrice,
    });

    navigation.replace("MainTabs", { city });
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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "culture": return "#9C6ADE";
      case "nature": return "#66BB6A";
      case "sea": return "#26C6DA";
      case "food": return "#FF8C42";
      case "wellness": return "#FF5DA2";
      case "shopping": return "#FFB74D";
      case "break": return "rgba(255,255,255,0.3)";
      default: return "#42A5F5";
    }
  };

  const getCategoryBg = (category: string) => {
    switch (category) {
      case "culture": return "rgba(156,106,222,0.15)";
      case "nature": return "rgba(102,187,106,0.15)";
      case "sea": return "rgba(38,198,218,0.15)";
      case "food": return "rgba(255,140,66,0.15)";
      case "wellness": return "rgba(255,107,138,0.15)";
      case "shopping": return "rgba(255,183,77,0.15)";
      case "break": return "rgba(255,255,255,0.05)";
      default: return "rgba(66,165,245,0.15)";
    }
  };

  if (isGenerating) {
    return (
      <View style={[styles.container, { backgroundColor: ct.background }]}>
        <LinearGradient
          colors={[ct.background, ct.backgroundLight, ct.background]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.loadingContainer}>
          <Animated.View 
            entering={FadeIn.delay(100).duration(600)}
            style={styles.loadingLogoContainer}
          >
            <Animated.View style={[styles.loadingIcon, spinnerStyle]}>
              <LinearGradient
                colors={[ct.accent, ct.secondary]}
                style={styles.loadingIconGradient}
              >
                <Feather name="zap" size={36} color={ct.background} />
              </LinearGradient>
            </Animated.View>
            <View style={[styles.loadingPulse, { borderColor: `rgba(${ct.accentRgb}, 0.2)` }]} />
          </Animated.View>
          
          <Animated.View entering={FadeInDown.delay(300).duration(500)}>
            <ThemedText style={styles.loadingTitle}>DIG PILOT en action</ThemedText>
            <ThemedText style={styles.loadingSubtitle}>
              Notre IA crée votre voyage sur mesure
            </ThemedText>
          </Animated.View>
          
          <Animated.View 
            style={styles.loadingSteps}
            entering={FadeInUp.delay(500).duration(500)}
          >
            <Animated.View 
              style={styles.loadingStep}
              entering={FadeInUp.delay(600).duration(400)}
            >
              <View style={[styles.stepIconDone, { backgroundColor: "rgba(102,187,106,0.2)" }]}>
                <Feather name="check" size={14} color="#66BB6A" />
              </View>
              <ThemedText style={styles.loadingStepText}>Analyse de vos préférences</ThemedText>
            </Animated.View>
            <Animated.View 
              style={styles.loadingStep}
              entering={FadeInUp.delay(800).duration(400)}
            >
              <View style={[styles.stepIconActive, { backgroundColor: "rgba(255,183,77,0.2)" }]}>
                <Feather name="search" size={12} color="#FFB74D" />
              </View>
              <ThemedText style={styles.loadingStepText}>Sélection des meilleures activités</ThemedText>
            </Animated.View>
            <Animated.View 
              style={styles.loadingStep}
              entering={FadeInUp.delay(1000).duration(400)}
            >
              <View style={[styles.stepIconPending, { backgroundColor: "rgba(38,198,218,0.1)" }]}>
                <Feather name="map" size={12} color="rgba(38,198,218,0.4)" />
              </View>
              <ThemedText style={[styles.loadingStepText, styles.loadingStepPending]}>
                Optimisation des trajets
              </ThemedText>
            </Animated.View>
            <Animated.View 
              style={styles.loadingStep}
              entering={FadeInUp.delay(1200).duration(400)}
            >
              <View style={[styles.stepIconPending, { backgroundColor: "rgba(156,106,222,0.1)" }]}>
                <Feather name="calendar" size={12} color="rgba(156,106,222,0.4)" />
              </View>
              <ThemedText style={[styles.loadingStepText, styles.loadingStepPending]}>
                Création du planning jour par jour
              </ThemedText>
            </Animated.View>
          </Animated.View>
          
          <Animated.View 
            style={styles.loadingHint}
            entering={FadeIn.delay(1400).duration(500)}
          >
            <Feather name="info" size={14} color="rgba(255,255,255,0.4)" />
            <ThemedText style={styles.loadingHintText}>
              Vous pourrez personnaliser chaque détail ensuite
            </ThemedText>
          </Animated.View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: ct.background }]}>
      <LinearGradient
        colors={[ct.background, ct.backgroundLight, ct.background]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={24} color={AppColors.white} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <ThemedText style={styles.headerTitle}>Votre Planning</ThemedText>
          <ThemedText style={[styles.headerSubtitle, { color: ct.accent }]}>{city.name}</ThemedText>
        </View>
        <Pressable style={[styles.refreshButton, { backgroundColor: `rgba(${ct.accentRgb}, 0.15)` }]} onPress={generatePlanning}>
          <Feather name="refresh-cw" size={20} color={ct.accent} />
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
            style={[styles.dayTab, { borderColor: `rgba(${ct.accentRgb}, 0.15)` }, selectedDay === index && [styles.dayTabActive, { backgroundColor: `rgba(${ct.accentRgb}, 0.15)`, borderColor: ct.accent }]]}
            onPress={() => setSelectedDay(index)}
          >
            <ThemedText style={[styles.dayTabLabel, selectedDay === index && [styles.dayTabLabelActive, { color: ct.accent }]]}>
              Jour {index + 1}
            </ThemedText>
            <ThemedText style={[styles.dayTabDate, selectedDay === index && [styles.dayTabDateActive, { color: ct.accent }]]}>
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
            <ThemedText style={styles.dayTitle}>{planning[selectedDay].dayLabel}</ThemedText>
            
            <View style={styles.timeline}>
              {planning[selectedDay].activities.map((activity, index) => (
                <Animated.View
                  key={activity.id}
                  entering={FadeInUp.delay(index * 100).duration(300)}
                >
                  <Pressable
                    style={[
                      styles.activityCard,
                      activity.isBreak && styles.activityCardBreak,
                    ]}
                    onPress={() => handleActivityPress(activity)}
                  >
                    {!activity.isBreak && (
                      <Pressable
                        style={styles.removeButton}
                        onPress={() => handleRemoveActivity(selectedDay, activity.id)}
                      >
                        <Feather name="x" size={14} color="rgba(255,255,255,0.5)" />
                      </Pressable>
                    )}
                    
                    <View style={styles.activityTimeContainer}>
                      <ThemedText style={styles.activityTime}>{activity.time || "-"}</ThemedText>
                      <ThemedText style={styles.activityDuration}>{activity.duration}</ThemedText>
                    </View>
                    
                    <View style={styles.timelineDot}>
                      <View style={[
                        styles.dot,
                        activity.isBreak && styles.dotBreak,
                        !activity.isBreak && { backgroundColor: getCategoryColor(activity.category) },
                      ]} />
                      {index < planning[selectedDay].activities.length - 1 && (
                        <View style={styles.timelineLine} />
                      )}
                    </View>
                    
                    <View style={styles.activityContent}>
                      <View style={[
                        styles.activityIcon,
                        activity.isBreak && styles.activityIconBreak,
                        !activity.isBreak && { backgroundColor: getCategoryBg(activity.category) },
                      ]}>
                        <Feather
                          name={getCategoryIcon(activity.category) as any}
                          size={18}
                          color={getCategoryColor(activity.category)}
                        />
                      </View>
                      <View style={styles.activityInfo}>
                        <ThemedText style={[
                          styles.activityTitle,
                          activity.isBreak && styles.activityTitleBreak,
                        ]}>
                          {activity.title}
                        </ThemedText>
                        {activity.isBreak && activity.note && (
                          <ThemedText style={styles.breakNote}>{activity.note}</ThemedText>
                        )}
                        {activity.isBreak && !activity.note && (
                          <ThemedText style={styles.breakHint}>Toucher pour ajouter une note</ThemedText>
                        )}
                        {!activity.isBreak && (
                          <View style={styles.activityMeta}>
                            <ThemedText style={styles.activityPrice}>
                              {activity.price} {activity.currency} x {activity.numPeople || numPeople} pers.
                            </ThemedText>
                            {activity.note && (
                              <ThemedText style={styles.activityNote} numberOfLines={1}>
                                {activity.note}
                              </ThemedText>
                            )}
                          </View>
                        )}
                      </View>
                      {activity.isBreak ? (
                        <Feather name="edit-2" size={14} color="rgba(255,255,255,0.3)" />
                      ) : (
                        <Feather name="chevron-right" size={18} color="rgba(255,255,255,0.3)" />
                      )}
                    </View>
                  </Pressable>
                </Animated.View>
              ))}
            </View>

            <Pressable style={[styles.addActivityButton, { borderColor: `rgba(${ct.accentRgb}, 0.3)` }]} onPress={handleOpenAddActivity}>
              <Feather name="plus" size={18} color={ct.accent} />
              <ThemedText style={[styles.addActivityText, { color: ct.accent }]}>Ajouter une activité</ThemedText>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>

      <Modal
        visible={noteModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNoteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setNoteModalVisible(false)} />
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + Spacing.lg, backgroundColor: ct.backgroundLight }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHandle} />
              <ThemedText style={styles.modalTitle}>Ajouter une note</ThemedText>
              <ThemedText style={styles.modalSubtitle}>
                Notez ce que vous voulez faire pendant ce temps libre
              </ThemedText>
            </View>
            
            <View style={[styles.noteInputContainer, { borderColor: `rgba(${ct.accentRgb}, 0.2)` }]}>
              <TextInput
                style={styles.noteInput}
                value={noteText}
                onChangeText={setNoteText}
                placeholder="Ex: Faire de la randonnée, visiter le marché..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                multiline
                maxLength={200}
              />
            </View>
            
            <View style={styles.modalActions}>
              <Pressable style={styles.saveNoteButton} onPress={handleSaveNote}>
                <LinearGradient
                  colors={[ct.accent, ct.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveNoteGradient}
                >
                  <Feather name="check" size={18} color={ct.background} />
                  <ThemedText style={[styles.saveNoteText, { color: ct.background }]}>Enregistrer</ThemedText>
                </LinearGradient>
              </Pressable>
              <Pressable style={styles.cancelButton} onPress={() => setNoteModalVisible(false)}>
                <ThemedText style={styles.cancelButtonText}>Annuler</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={activityModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setActivityModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setActivityModalVisible(false)} />
          <View style={[styles.activityModalContent, { paddingBottom: insets.bottom + Spacing.lg, backgroundColor: ct.backgroundLight }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHandle} />
              <ThemedText style={styles.modalTitle}>
                {selectedActivity?.activity.title}
              </ThemedText>
              <ThemedText style={styles.modalSubtitle}>
                {selectedActivity?.activity.duration} - {selectedActivity?.activity.price} {selectedActivity?.activity.currency}/pers.
              </ThemedText>
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>Nombre de personnes</ThemedText>
              <View style={styles.peopleSelector}>
                <Pressable
                  style={styles.peopleSelectorButton}
                  onPress={() => setActivityNumPeople(Math.max(1, activityNumPeople - 1))}
                >
                  <Feather name="minus" size={20} color={AppColors.white} />
                </Pressable>
                <ThemedText style={styles.peopleSelectorValue}>{activityNumPeople}</ThemedText>
                <Pressable
                  style={styles.peopleSelectorButton}
                  onPress={() => setActivityNumPeople(activityNumPeople + 1)}
                >
                  <Feather name="plus" size={20} color={AppColors.white} />
                </Pressable>
              </View>
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>Jour</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daySelector}>
                {planning.map((day, index) => (
                  <Pressable
                    key={day.date}
                    style={[
                      styles.daySelectorItem,
                      activityDayIndex === index && [styles.daySelectorItemActive, { backgroundColor: `rgba(${ct.accentRgb}, 0.2)`, borderColor: ct.accent }],
                    ]}
                    onPress={() => setActivityDayIndex(index)}
                  >
                    <ThemedText style={[
                      styles.daySelectorText,
                      activityDayIndex === index && [styles.daySelectorTextActive, { color: ct.accent }],
                    ]}>
                      {new Date(day.date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })}
                    </ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>Heure (format 24h)</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeSlotSelector}>
                {timeSlots.map((slot) => (
                  <Pressable
                    key={slot}
                    style={[
                      styles.timeSlotItem,
                      `${activityTimeDate.getHours().toString().padStart(2, "0")}:${activityTimeDate.getMinutes().toString().padStart(2, "0")}` === slot && [styles.timeSlotItemActive, { backgroundColor: `rgba(${ct.accentRgb}, 0.2)`, borderColor: ct.accent }],
                    ]}
                    onPress={() => {
                      const [h, m] = slot.split(":").map(Number);
                      const newDate = new Date();
                      newDate.setHours(h, m, 0, 0);
                      setActivityTimeDate(newDate);
                    }}
                  >
                    <ThemedText style={[
                      styles.timeSlotText,
                      `${activityTimeDate.getHours().toString().padStart(2, "0")}:${activityTimeDate.getMinutes().toString().padStart(2, "0")}` === slot && [styles.timeSlotTextActive, { color: ct.accent }],
                    ]}>
                      {slot}
                    </ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>Note personnelle</ThemedText>
              <TextInput
                style={styles.activityNoteInput}
                value={activityNote}
                onChangeText={setActivityNote}
                placeholder="Ex: Prendre l'appareil photo..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                multiline
                maxLength={200}
              />
            </View>

            <View style={styles.modalActions}>
              <Pressable style={styles.saveNoteButton} onPress={handleSaveActivity}>
                <LinearGradient
                  colors={[ct.accent, ct.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveNoteGradient}
                >
                  <Feather name="check" size={18} color={ct.background} />
                  <ThemedText style={[styles.saveNoteText, { color: ct.background }]}>Enregistrer</ThemedText>
                </LinearGradient>
              </Pressable>
              <Pressable style={styles.detailButton} onPress={handleViewActivityDetails}>
                <Feather name="eye" size={16} color={ct.accent} />
                <ThemedText style={[styles.detailButtonText, { color: ct.accent }]}>Voir les détails</ThemedText>
              </Pressable>
              <Pressable 
                style={styles.removeActivityButton} 
                onPress={() => {
                  if (selectedActivity) {
                    handleRemoveActivity(selectedActivity.dayIndex, selectedActivity.activity.id);
                    setActivityModalVisible(false);
                  }
                }}
              >
                <Feather name="trash-2" size={16} color="#F44336" />
                <ThemedText style={styles.removeActivityText}>Retirer du planning</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={addActivityModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddActivityModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setAddActivityModalVisible(false)} />
          <View style={[styles.addActivityModalContent, { paddingBottom: insets.bottom + Spacing.lg, backgroundColor: ct.backgroundLight }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHandle} />
              <ThemedText style={styles.modalTitle}>Ajouter une activité</ThemedText>
              <ThemedText style={styles.modalSubtitle}>
                {planning[selectedDay]?.dayLabel}
              </ThemedText>
            </View>

            <ScrollView style={styles.availableActivitiesList} showsVerticalScrollIndicator={false}>
              {availableActivities.map((activity) => (
                <Pressable
                  key={activity.id}
                  style={styles.availableActivityCard}
                  onPress={() => handleAddActivityToPlanning(activity)}
                >
                  <View style={styles.availableActivityIcon}>
                    <Feather
                      name={getCategoryIcon(activity.category) as any}
                      size={18}
                      color={ct.accent}
                    />
                  </View>
                  <View style={styles.availableActivityInfo}>
                    <ThemedText style={styles.availableActivityTitle}>{activity.title}</ThemedText>
                    <ThemedText style={styles.availableActivityMeta}>
                      {activity.time} - {activity.duration} - {activity.price} {activity.currency}
                    </ThemedText>
                  </View>
                  <Feather name="plus-circle" size={22} color={ct.accent} />
                </Pressable>
              ))}
            </ScrollView>

            <Pressable style={styles.cancelButton} onPress={() => setAddActivityModalVisible(false)}>
              <ThemedText style={styles.cancelButtonText}>Annuler</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg, backgroundColor: `rgba(${ct.backgroundRgb}, 0.95)`, borderTopColor: `rgba(${ct.accentRgb}, 0.1)` }]}>
        <View style={styles.footerInfo}>
          <ThemedText style={styles.footerLabel}>Total estimé</ThemedText>
          <ThemedText style={[styles.footerPrice, { color: ct.secondary }]}>
            {planning.reduce((total, day) => 
              total + day.activities.reduce((dayTotal, act) => dayTotal + (act.isBreak ? 0 : (act.price * (act.numPeople || numPeople))), 0), 0
            )} {city.currency}
          </ThemedText>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.confirmButton,
            pressed && styles.confirmButtonPressed,
          ]}
          onPress={handleConfirmPlanning}
        >
          <LinearGradient
            colors={[ct.accent, ct.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.confirmGradient}
          >
            <ThemedText style={[styles.confirmText, { color: ct.background }]}>Confirmer le planning</ThemedText>
            <Feather name="check" size={20} color={ct.background} />
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#071A1A",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  loadingLogoContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  loadingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingPulse: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    borderColor: "rgba(0, 217, 192, 0.2)",
  },
  loadingTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: AppColors.sand,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  loadingSubtitle: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  loadingSteps: {
    gap: Spacing.md,
    marginTop: Spacing.lg,
    alignSelf: "stretch",
    paddingHorizontal: Spacing.md,
  },
  loadingStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  stepIconDone: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: AppColors.sand,
    justifyContent: "center",
    alignItems: "center",
  },
  stepIconActive: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: AppColors.sand10,
    borderWidth: 2,
    borderColor: AppColors.sand,
    justifyContent: "center",
    alignItems: "center",
  },
  stepIconPending: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingStepText: {
    fontSize: 14,
    color: AppColors.white,
  },
  loadingStepPending: {
    color: "rgba(255, 255, 255, 0.4)",
  },
  loadingHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.xl + Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: BorderRadius.md,
  },
  loadingHintText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleContainer: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: AppColors.white,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 217, 192, 0.1)",
    justifyContent: "center",
    alignItems: "center",
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
    backgroundColor: AppColors.sand,
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
    position: "relative",
  },
  activityCardBreak: {
    opacity: 0.6,
  },
  removeButton: {
    position: "absolute",
    top: Spacing.sm,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
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
    backgroundColor: AppColors.sand20,
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
    color: AppColors.sand,
  },
  addActivityButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "rgba(0, 217, 192, 0.3)",
    borderStyle: "dashed",
  },
  addActivityText: {
    fontSize: 14,
    fontWeight: "600",
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
    paddingTop: Spacing.lg,
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
  confirmButton: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  confirmButtonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  confirmGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  confirmText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#071A1A",
  },
  breakNote: {
    fontSize: 12,
    color: "rgba(0, 217, 192, 0.8)",
    fontStyle: "italic",
    marginTop: 2,
  },
  breakHint: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.3)",
    fontStyle: "italic",
    marginTop: 2,
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
    backgroundColor: "#0f1e32",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    maxHeight: "50%",
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 2,
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: AppColors.white,
    marginBottom: Spacing.xs,
  },
  modalSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "center",
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
  modalActions: {
    gap: Spacing.sm,
  },
  saveNoteButton: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  saveNoteGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  saveNoteText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#071A1A",
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  cancelButtonText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
  },
  activityMeta: {
    gap: 2,
  },
  activityNote: {
    fontSize: 11,
    color: "rgba(0, 217, 192, 0.7)",
    fontStyle: "italic",
  },
  activityModalContent: {
    backgroundColor: "#0f1e32",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    maxHeight: "80%",
  },
  formGroup: {
    marginBottom: Spacing.md,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: Spacing.xs,
  },
  peopleSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "rgba(0, 217, 192, 0.2)",
  },
  peopleSelectorButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  peopleSelectorValue: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: AppColors.white,
  },
  timeInput: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 15,
    color: AppColors.white,
    borderWidth: 1,
    borderColor: "rgba(0, 217, 192, 0.2)",
  },
  activityNoteInput: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 15,
    color: AppColors.white,
    borderWidth: 1,
    borderColor: "rgba(0, 217, 192, 0.2)",
    minHeight: 60,
    textAlignVertical: "top",
  },
  detailButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    backgroundColor: "rgba(0, 217, 192, 0.1)",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "rgba(0, 217, 192, 0.3)",
  },
  detailButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: AppColors.secondary,
  },
  removeActivityButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  removeActivityText: {
    fontSize: 14,
    color: "#F44336",
  },
  daySelector: {
    flexGrow: 0,
  },
  daySelectorItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: "transparent",
  },
  daySelectorItemActive: {
    backgroundColor: "rgba(0, 217, 192, 0.15)",
    borderColor: AppColors.secondary,
  },
  daySelectorText: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.5)",
  },
  daySelectorTextActive: {
    color: AppColors.secondary,
    fontWeight: "600",
  },
  timeSlotSelector: {
    flexGrow: 0,
  },
  timeSlotItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.xs,
    borderWidth: 1,
    borderColor: "transparent",
  },
  timeSlotItemActive: {
    backgroundColor: "rgba(0, 217, 192, 0.2)",
    borderColor: AppColors.secondary,
  },
  timeSlotText: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.5)",
  },
  timeSlotTextActive: {
    color: AppColors.secondary,
    fontWeight: "700",
  },
  addActivityModalContent: {
    backgroundColor: "#0f1e32",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    maxHeight: "70%",
  },
  availableActivitiesList: {
    marginBottom: Spacing.md,
  },
  availableActivityCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  availableActivityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 217, 192, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  availableActivityInfo: {
    flex: 1,
  },
  availableActivityTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: AppColors.white,
    marginBottom: 2,
  },
  availableActivityMeta: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
  },
});
