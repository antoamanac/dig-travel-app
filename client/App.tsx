import React from "react";
import { StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/context/AuthContext";
import { PlanningProvider } from "@/context/PlanningContext";
import { CityProvider } from "@/context/CityContext";
import { TripPlanProvider } from "@/context/TripPlanContext";
import { FavoritesProvider } from "@/context/FavoritesContext";

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <GestureHandlerRootView style={styles.root}>
            <KeyboardProvider>
              <AuthProvider>
                <FavoritesProvider>
                  <CityProvider>
                    <TripPlanProvider>
                      <PlanningProvider>
                        <NavigationContainer>
                          <RootStackNavigator />
                        </NavigationContainer>
                      </PlanningProvider>
                    </TripPlanProvider>
                  </CityProvider>
                </FavoritesProvider>
              </AuthProvider>
              <StatusBar style="auto" />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
