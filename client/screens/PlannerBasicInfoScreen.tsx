import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { useCityTheme } from "@/context/CityContext";
import { useTripPlan } from "@/context/TripPlanContext";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "PlannerBasicInfo">;
type ScreenRouteProp = RouteProp<RootStackParamList, "PlannerBasicInfo">;

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const AGE_GROUPS = [
  { id: "0-3", label: "0-3 ans" },
  { id: "4-10", label: "4-10 ans" },
  { id: "11+", label: "11+ ans" },
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

export default function PlannerBasicInfoScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRouteProp>();
  const insets = useSafeAreaInsets();
  const { city } = route.params;
  const { tripPlan, updateTripPlan, saveDraft } = useTripPlan();
  const ct = useCityTheme();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const dayAfterTomorrow = new Date();
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 4);
  dayAfterTomorrow.setHours(0, 0, 0, 0);

  const [startDate, setStartDate] = useState(
    tripPlan.startDate ? new Date(tripPlan.startDate) : tomorrow
  );
  const [endDate, setEndDate] = useState(
    tripPlan.endDate ? new Date(tripPlan.endDate) : dayAfterTomorrow
  );
  const [adults, setAdults] = useState(tripPlan.travelers.adults);
  const [childrenByAge, setChildrenByAge] = useState(
    tripPlan.travelers.childrenByAgeGroup || { "0-3": 0, "4-10": 0, "11+": 0 }
  );
  
  const totalChildren = childrenByAge["0-3"] + childrenByAge["4-10"] + childrenByAge["11+"];
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickingDateType, setPickingDateType] = useState<"start" | "end">("start");
  const [currentMonth, setCurrentMonth] = useState(tomorrow.getMonth());
  const [currentYear, setCurrentYear] = useState(tomorrow.getFullYear());

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const tripDuration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  const handleContinue = async () => {
    const childrenAgeGroups: string[] = [];
    if (childrenByAge["0-3"] > 0) childrenAgeGroups.push("0-3");
    if (childrenByAge["4-10"] > 0) childrenAgeGroups.push("4-10");
    if (childrenByAge["11+"] > 0) childrenAgeGroups.push("11+");
    
    updateTripPlan({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      travelers: {
        adults,
        children: totalChildren,
        childrenAgeGroups,
        childrenByAgeGroup: childrenByAge,
      },
    });
    await saveDraft();
    navigation.navigate("PlannerContext", { city });
  };
  
  const updateChildrenByAge = (ageGroup: "0-3" | "4-10" | "11+", delta: number) => {
    const newValue = Math.max(0, Math.min(10, childrenByAge[ageGroup] + delta));
    setChildrenByAge({ ...childrenByAge, [ageGroup]: newValue });
  };

  const openDatePicker = (type: "start" | "end") => {
    setPickingDateType(type);
    const dateToShow = type === "start" ? startDate : endDate;
    setCurrentMonth(dateToShow.getMonth());
    setCurrentYear(dateToShow.getFullYear());
    setShowDatePicker(true);
  };

  const handleDateSelect = (day: number) => {
    const selectedDate = new Date(currentYear, currentMonth, day);
    selectedDate.setHours(0, 0, 0, 0);

    if (pickingDateType === "start") {
      setStartDate(selectedDate);
      if (selectedDate >= endDate) {
        const newEndDate = new Date(selectedDate);
        newEndDate.setDate(newEndDate.getDate() + 1);
        setEndDate(newEndDate);
      }
    } else {
      if (selectedDate > startDate) {
        setEndDate(selectedDate);
      }
    }
    setShowDatePicker(false);
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (pickingDateType === "start") {
      return date < today;
    } else {
      return date <= startDate;
    }
  };

  const isDateSelected = (day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    const compareDate = pickingDateType === "start" ? startDate : endDate;
    return date.getTime() === compareDate.getTime();
  };

  const isDateInRange = (day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    return date > startDate && date < endDate;
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
      const inRange = isDateInRange(day);

      days.push(
        <Pressable
          key={day}
          style={[
            styles.calendarDay,
            selected && [styles.calendarDaySelected, { backgroundColor: ct.accent }],
            inRange && styles.calendarDayInRange,
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
        <View style={styles.progressContainer}>
          <View style={[styles.progressDot, { backgroundColor: `rgba(${ct.accentRgb}, 0.3)` }, styles.progressDotActive, { backgroundColor: ct.secondary, width: 20 }]} />
          <View style={[styles.progressDot, { backgroundColor: `rgba(${ct.accentRgb}, 0.3)` }]} />
          <View style={[styles.progressDot, { backgroundColor: `rgba(${ct.accentRgb}, 0.3)` }]} />
          <View style={[styles.progressDot, { backgroundColor: `rgba(${ct.accentRgb}, 0.3)` }]} />
          <View style={[styles.progressDot, { backgroundColor: `rgba(${ct.accentRgb}, 0.3)` }]} />
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
      >
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <LinearGradient
            colors={["rgba(255,140,66,0.25)", "rgba(255,107,53,0.15)"]}
            style={styles.iconWrapper}
          >
            <Feather name="calendar" size={32} color="#FF8C42" />
          </LinearGradient>
          <ThemedText style={styles.title}>Quand partez-vous ?</ThemedText>
          <ThemedText style={styles.subtitle}>
            Dates et voyageurs pour {city.name}
          </ThemedText>
        </Animated.View>

        <Animated.View style={styles.formContainer} entering={FadeInUp.delay(200).duration(400)}>
          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <ThemedText style={styles.fieldLabel}>Date de début</ThemedText>
              <Pressable
                style={styles.dateButton}
                onPress={() => openDatePicker("start")}
              >
                <Feather name="calendar" size={18} color="#FF8C42" />
                <ThemedText style={styles.dateText}>{formatDate(startDate)}</ThemedText>
              </Pressable>
            </View>

            <View style={styles.dateSeparator}>
              <Feather name="arrow-right" size={20} color="rgba(255,255,255,0.3)" />
            </View>

            <View style={styles.dateField}>
              <ThemedText style={styles.fieldLabel}>Date de fin</ThemedText>
              <Pressable
                style={styles.dateButton}
                onPress={() => openDatePicker("end")}
              >
                <Feather name="calendar" size={18} color="#FF8C42" />
                <ThemedText style={styles.dateText}>{formatDate(endDate)}</ThemedText>
              </Pressable>
            </View>
          </View>

          {tripDuration > 0 && (
            <View style={styles.durationBadge}>
              <Feather name="clock" size={14} color="#42A5F5" />
              <ThemedText style={styles.durationText}>
                {tripDuration} jour{tripDuration > 1 ? "s" : ""} à {city.name}
              </ThemedText>
            </View>
          )}

          <View style={styles.travelersSection}>
            <ThemedText style={styles.sectionTitle}>Voyageurs</ThemedText>
            
            <View style={styles.travelerRow}>
              <View style={styles.travelerInfo}>
                <Feather name="user" size={20} color="#42A5F5" />
                <ThemedText style={styles.travelerLabel}>Adultes</ThemedText>
              </View>
              <View style={styles.stepper}>
                <Pressable
                  style={[styles.stepperButton, adults <= 1 && styles.stepperButtonDisabled]}
                  onPress={() => adults > 1 && setAdults(adults - 1)}
                  disabled={adults <= 1}
                >
                  <Feather name="minus" size={18} color={adults <= 1 ? "rgba(255,255,255,0.2)" : AppColors.white} />
                </Pressable>
                <ThemedText style={styles.stepperValue}>{adults}</ThemedText>
                <Pressable
                  style={[styles.stepperButton, adults >= 10 && styles.stepperButtonDisabled]}
                  onPress={() => adults < 10 && setAdults(adults + 1)}
                  disabled={adults >= 10}
                >
                  <Feather name="plus" size={18} color={adults >= 10 ? "rgba(255,255,255,0.2)" : AppColors.white} />
                </Pressable>
              </View>
            </View>

            <View style={styles.travelerRow}>
              <View style={styles.travelerInfo}>
                <Feather name="smile" size={20} color="#FF5DA2" />
                <ThemedText style={styles.travelerLabel}>Enfants</ThemedText>
              </View>
              <View style={styles.stepper}>
                <Pressable
                  style={[styles.stepperButton, totalChildren <= 0 && styles.stepperButtonDisabled]}
                  onPress={() => {
                    if (totalChildren > 0) {
                      if (childrenByAge["11+"] > 0) updateChildrenByAge("11+", -1);
                      else if (childrenByAge["4-10"] > 0) updateChildrenByAge("4-10", -1);
                      else if (childrenByAge["0-3"] > 0) updateChildrenByAge("0-3", -1);
                    }
                  }}
                  disabled={totalChildren <= 0}
                >
                  <Feather name="minus" size={18} color={totalChildren <= 0 ? "rgba(255,255,255,0.2)" : AppColors.white} />
                </Pressable>
                <ThemedText style={styles.stepperValue}>{totalChildren}</ThemedText>
                <Pressable
                  style={[styles.stepperButton, totalChildren >= 10 && styles.stepperButtonDisabled]}
                  onPress={() => updateChildrenByAge("4-10", 1)}
                  disabled={totalChildren >= 10}
                >
                  <Feather name="plus" size={18} color={totalChildren >= 10 ? "rgba(255,255,255,0.2)" : AppColors.white} />
                </Pressable>
              </View>
            </View>

            {totalChildren > 0 && (
              <View style={styles.childrenAgeSection}>
                <ThemedText style={styles.childrenAgeTitle}>Âge des enfants</ThemedText>
                {AGE_GROUPS.map((group) => (
                  <View key={group.id} style={styles.ageGroupRow}>
                    <ThemedText style={styles.ageGroupRowLabel}>{group.label}</ThemedText>
                    <View style={styles.stepper}>
                      <Pressable
                        style={[styles.stepperButton, styles.stepperButtonSmall, childrenByAge[group.id as keyof typeof childrenByAge] <= 0 && styles.stepperButtonDisabled]}
                        onPress={() => updateChildrenByAge(group.id as "0-3" | "4-10" | "11+", -1)}
                        disabled={childrenByAge[group.id as keyof typeof childrenByAge] <= 0}
                      >
                        <Feather 
                          name="minus" 
                          size={16} 
                          color={childrenByAge[group.id as keyof typeof childrenByAge] <= 0 ? "rgba(255,255,255,0.2)" : AppColors.white} 
                        />
                      </Pressable>
                      <ThemedText style={styles.stepperValueSmall}>
                        {childrenByAge[group.id as keyof typeof childrenByAge]}
                      </ThemedText>
                      <Pressable
                        style={[styles.stepperButton, styles.stepperButtonSmall, childrenByAge[group.id as keyof typeof childrenByAge] >= 10 && styles.stepperButtonDisabled]}
                        onPress={() => updateChildrenByAge(group.id as "0-3" | "4-10" | "11+", 1)}
                        disabled={childrenByAge[group.id as keyof typeof childrenByAge] >= 10}
                      >
                        <Feather 
                          name="plus" 
                          size={16} 
                          color={childrenByAge[group.id as keyof typeof childrenByAge] >= 10 ? "rgba(255,255,255,0.2)" : AppColors.white} 
                        />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </Animated.View>
      </KeyboardAwareScrollViewCompat>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg, backgroundColor: `rgba(${ct.backgroundRgb}, 0.95)`, borderTopColor: `rgba(${ct.accentRgb}, 0.1)` }]}>
        <Pressable
          style={({ pressed }) => [
            styles.continueButton,
            pressed && styles.continueButtonPressed,
          ]}
          onPress={handleContinue}
        >
          <LinearGradient
            colors={[ct.secondary, ct.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.continueGradient}
          >
            <ThemedText style={[styles.continueText, { color: ct.background }]}>Continuer</ThemedText>
            <Feather name="arrow-right" size={20} color={ct.background} />
          </LinearGradient>
        </Pressable>
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
            style={[styles.modalContent, { backgroundColor: ct.backgroundLight }]}
            entering={FadeIn.duration(200)}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <ThemedText style={styles.modalTitle}>
                  {pickingDateType === "start" ? "Date de debut" : "Date de fin"}
                </ThemedText>
                <Pressable onPress={() => setShowDatePicker(false)}>
                  <Feather name="x" size={24} color={AppColors.white} />
                </Pressable>
              </View>

              <View style={styles.monthNav}>
                <Pressable onPress={goToPrevMonth} style={styles.monthNavButton}>
                  <Feather name="chevron-left" size={24} color={AppColors.white} />
                </Pressable>
                <ThemedText style={styles.monthTitle}>
                  {MONTHS_FR[currentMonth]} {currentYear}
                </ThemedText>
                <Pressable onPress={goToNextMonth} style={styles.monthNavButton}>
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
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  progressContainer: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(0, 217, 192, 0.3)",
  },
  progressDotActive: {
    backgroundColor: AppColors.sand,
    width: 20,
  },
  headerSpacer: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(255,140,66,0.2)",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: AppColors.white,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  formContainer: {
    gap: Spacing.lg,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  dateField: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.5)",
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "rgba(255,140,66,0.25)",
  },
  dateText: {
    fontSize: 14,
    fontWeight: "600",
    color: AppColors.white,
  },
  dateSeparator: {
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    alignSelf: "center",
    backgroundColor: "rgba(66,165,245,0.12)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
  },
  durationText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#42A5F5",
  },
  travelersSection: {
    marginTop: Spacing.md,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: AppColors.white,
    marginBottom: Spacing.lg,
  },
  travelerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  travelerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  travelerLabel: {
    fontSize: 15,
    color: AppColors.white,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  stepperButtonDisabled: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  stepperValue: {
    fontSize: 20,
    fontWeight: "700",
    color: AppColors.white,
    minWidth: 30,
    textAlign: "center",
  },
  childrenAgeSection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  childrenAgeTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.6)",
    marginBottom: Spacing.sm,
  },
  stepperButtonSmall: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  stepperValueSmall: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.white,
    minWidth: 24,
    textAlign: "center",
  },
  ageGroupRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    marginBottom: Spacing.sm,
  },
  ageGroupRowLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    backgroundColor: "rgba(7, 26, 26, 0.95)",
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 217, 192, 0.1)",
  },
  continueButton: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  continueButtonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  continueGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  continueText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#071A1A",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: "#0d2e2e",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: "100%",
    maxWidth: 360,
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
  monthNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  monthNavButton: {
    width: 40,
    height: 40,
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
    paddingVertical: Spacing.xs,
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
  },
  calendarDaySelected: {
    backgroundColor: AppColors.secondary,
    borderRadius: 20,
  },
  calendarDayInRange: {
    backgroundColor: "rgba(255,140,66,0.2)",
  },
  calendarDayDisabled: {
    opacity: 0.3,
  },
  calendarDayText: {
    fontSize: 14,
    fontWeight: "500",
    color: AppColors.white,
  },
  calendarDayTextSelected: {
    color: "#071A1A",
    fontWeight: "700",
  },
  calendarDayTextDisabled: {
    color: "rgba(255, 255, 255, 0.3)",
  },
});
