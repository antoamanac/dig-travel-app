import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { View, StyleSheet, Pressable } from "react-native";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useAuth } from "@/context/AuthContext";
import { AppColors, Spacing } from "@/constants/theme";

import SplashScreen from "@/screens/SplashScreen";
import LoginScreen from "@/screens/LoginScreen";
import SignupScreen from "@/screens/SignupScreen";
import CitySelectorScreen from "@/screens/CitySelectorScreen";
import CityWelcomeScreen from "@/screens/CityWelcomeScreen";
import ModeSelectionScreen from "@/screens/ModeSelectionScreen";
import PlannerBasicInfoScreen from "@/screens/PlannerBasicInfoScreen";
import PlannerContextScreen from "@/screens/PlannerContextScreen";
import PlannerPreferencesScreen from "@/screens/PlannerPreferencesScreen";
import PlannerBudgetScreen from "@/screens/PlannerBudgetScreen";
import PlannerTransportScreen from "@/screens/PlannerTransportScreen";
import PlannerGenerationScreen from "@/screens/PlannerGenerationScreen";
import OperatorDashboardScreen from "@/screens/OperatorDashboardScreen";
import MainTabNavigator from "@/navigation/MainTabNavigator";

import type { City, Activity } from "@/data/mockData";

export interface PlannerPreferences {
  rhythm: string;
  interests: string[];
  budget: string;
  carRental: boolean;
  driver: boolean;
}

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Signup: undefined;
  CitySelector: undefined;
  CityWelcome: { city: City };
  ModeSelection: { city: City };
  PlannerBasicInfo: { city: City };
  PlannerContext: { city: City };
  PlannerPreferences: { city: City; startDate: string; endDate: string; numPeople: number };
  PlannerBudget: { city: City };
  PlannerTransport: { city: City };
  PlannerGeneration: { city: City; startDate: string; endDate: string; numPeople: number; context?: string; preferences: PlannerPreferences };
  MainTabs: { city: City };
  OperatorDashboard: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function ProfileButton({ navigation }: { navigation: any }) {
  return (
    <Pressable
      onPress={() => navigation.navigate("Profile")}
      style={styles.profileButton}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <View style={styles.profileIconContainer}>
        <Feather name="user" size={20} color="#00D9C0" />
      </View>
    </Pressable>
  );
}

function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <Feather name="loader" size={40} color="#00D9C0" />
    </View>
  );
}

export default function RootStackNavigator() {
  const { isLoading } = useAuth();
  const screenOptions = useScreenOptions();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        ...screenOptions,
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="Splash"
        component={SplashScreen}
        options={{ headerShown: false, animation: "fade" }}
      />
      <Stack.Screen
        name="CitySelector"
        component={CitySelectorScreen}
        options={{ headerShown: false, animation: "fade" }}
      />
      <Stack.Screen
        name="CityWelcome"
        component={CityWelcomeScreen}
        options={{ headerShown: false, animation: "fade" }}
      />
      <Stack.Screen
        name="ModeSelection"
        component={ModeSelectionScreen}
        options={{ headerShown: false, animation: "fade" }}
      />
      <Stack.Screen
        name="PlannerBasicInfo"
        component={PlannerBasicInfoScreen}
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="PlannerContext"
        component={PlannerContextScreen}
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="PlannerPreferences"
        component={PlannerPreferencesScreen}
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="PlannerBudget"
        component={PlannerBudgetScreen}
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="PlannerTransport"
        component={PlannerTransportScreen}
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="PlannerGeneration"
        component={PlannerGenerationScreen}
        options={{ headerShown: false, animation: "fade" }}
      />
      <Stack.Screen
        name="MainTabs"
        component={MainTabNavigator}
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false, animation: "slide_from_bottom", presentation: "modal" }}
      />
      <Stack.Screen
        name="Signup"
        component={SignupScreen}
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="OperatorDashboard"
        component={OperatorDashboardScreen}
        options={{ headerShown: false, animation: "fade" }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: "#071A1A",
    alignItems: "center",
    justifyContent: "center",
  },
  profileButton: {
    padding: Spacing.xs,
  },
  profileIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 217, 192, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(0, 217, 192, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
});
