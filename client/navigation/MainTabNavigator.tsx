import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";

import CityLandingScreen from "@/screens/CityLandingScreen";
import ActivityListScreen from "@/screens/ActivityListScreen";
import ActivityDetailScreen from "@/screens/ActivityDetailScreen";
import BookingFormScreen from "@/screens/BookingFormScreen";
import CalendarScreen from "@/screens/CalendarScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import FavoritesScreen from "@/screens/FavoritesScreen";
import MyBookingsScreen from "@/screens/MyBookingsScreen";

import { AppColors, Spacing } from "@/constants/theme";
import { useCityTheme } from "@/context/CityContext";
import { useAuth } from "@/context/AuthContext";
import type { City, Activity } from "@/data/mockData";

export type HomeStackParamList = {
  CityLanding: { city: City };
  ActivityList: { city: City };
  ActivityDetail: { activity: Activity; city: City; preselectedDate?: string };
  BookingForm: { activity: Activity; city: City; selectedDate: string; selectedTimeSlot?: string | null };
};

export type FavoritesStackParamList = {
  FavoritesList: undefined;
};

export type CalendarStackParamList = {
  CalendarMain: undefined;
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
};

export type BookingsStackParamList = {
  BookingsMain: undefined;
};

export type MainTabParamList = {
  HomeTab: { city: City };
  CalendarTab: undefined;
  BookingsTab: undefined;
  FavoritesTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const FavoritesStack = createNativeStackNavigator<FavoritesStackParamList>();
const CalendarStack = createNativeStackNavigator<CalendarStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const BookingsStack = createNativeStackNavigator<BookingsStackParamList>();

function HomeStackNavigator({ route }: { route: any }) {
  const city = route.params?.city;
  
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: AppColors.background },
      }}
    >
      <HomeStack.Screen
        name="CityLanding"
        component={CityLandingScreen}
        initialParams={{ city }}
      />
      <HomeStack.Screen
        name="ActivityList"
        component={ActivityListScreen}
        options={{ headerShown: true }}
      />
      <HomeStack.Screen
        name="ActivityDetail"
        component={ActivityDetailScreen}
      />
      <HomeStack.Screen
        name="BookingForm"
        component={BookingFormScreen}
        options={{ headerShown: true }}
      />
    </HomeStack.Navigator>
  );
}

function FavoritesStackNavigator() {
  return (
    <FavoritesStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: AppColors.background },
      }}
    >
      <FavoritesStack.Screen
        name="FavoritesList"
        component={FavoritesScreen}
      />
    </FavoritesStack.Navigator>
  );
}

function CalendarStackNavigator() {
  return (
    <CalendarStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: AppColors.background },
      }}
    >
      <CalendarStack.Screen
        name="CalendarMain"
        component={CalendarScreen}
      />
    </CalendarStack.Navigator>
  );
}

function BookingsStackNavigator() {
  return (
    <BookingsStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: AppColors.background },
      }}
    >
      <BookingsStack.Screen
        name="BookingsMain"
        component={MyBookingsScreen}
      />
    </BookingsStack.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: AppColors.background },
      }}
    >
      <ProfileStack.Screen
        name="ProfileMain"
        component={ProfileScreen}
      />
    </ProfileStack.Navigator>
  );
}

function TabBarBackground() {
  return (
    <View style={StyleSheet.absoluteFill}>
      {Platform.OS === "ios" ? (
        <BlurView
          intensity={80}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.androidTabBarBg]} />
      )}
    </View>
  );
}

type TabBarIconProps = {
  focused: boolean;
  color: string;
  size: number;
};

export default function MainTabNavigator({ route }: { route: any }) {
  const insets = useSafeAreaInsets();
  const city = route.params?.city;
  const ct = useCityTheme();
  const { isAuthenticated } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ct.accent,
        tabBarInactiveTintColor: "rgba(255, 255, 255, 0.5)",
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.OS === "ios" ? "transparent" : `rgba(${ct.backgroundRgb}, 0.95)`,
          borderTopWidth: 0,
          elevation: 0,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: Spacing.sm,
        },
        tabBarBackground: Platform.OS === "ios" ? TabBarBackground : undefined,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        initialParams={{ city }}
        options={{
          tabBarLabel: "Accueil",
          tabBarIcon: ({ focused, color, size }: TabBarIconProps) => (
            <View style={focused ? [styles.activeIconContainer, { backgroundColor: ct.accentSoft }] : undefined}>
              <Feather name="home" size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="CalendarTab"
        component={CalendarStackNavigator}
        options={{
          tabBarLabel: "Calendrier",
          tabBarIcon: ({ focused, color, size }: TabBarIconProps) => (
            <View style={focused ? [styles.activeIconContainer, { backgroundColor: ct.accentSoft }] : undefined}>
              <Feather name="calendar" size={22} color={color} />
            </View>
          ),
        }}
      />
      {isAuthenticated ? (
        <Tab.Screen
          name="BookingsTab"
          component={BookingsStackNavigator}
          options={{
            tabBarLabel: "Reservations",
            tabBarIcon: ({ focused, color, size }: TabBarIconProps) => (
              <View style={focused ? [styles.activeIconContainer, { backgroundColor: ct.accentSoft }] : undefined}>
                <Feather name="book-open" size={22} color={color} />
              </View>
            ),
          }}
        />
      ) : null}
      <Tab.Screen
        name="FavoritesTab"
        component={FavoritesStackNavigator}
        options={{
          tabBarLabel: "Favoris",
          tabBarIcon: ({ focused, color, size }: TabBarIconProps) => (
            <View style={focused ? [styles.activeIconContainer, { backgroundColor: ct.accentSoft }] : undefined}>
              <Ionicons name={focused ? "heart" : "heart-outline"} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{
          tabBarLabel: "Compte",
          tabBarIcon: ({ focused, color, size }: TabBarIconProps) => (
            <View style={focused ? [styles.activeIconContainer, { backgroundColor: ct.accentSoft }] : undefined}>
              <Feather name="user" size={22} color={color} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  activeIconContainer: {
    backgroundColor: "rgba(0, 217, 192, 0.15)",
    borderRadius: 12,
    padding: 6,
    marginBottom: -4,
  },
  androidTabBarBg: {
    backgroundColor: "rgba(7, 26, 26, 0.98)",
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 217, 192, 0.1)",
  },
});
