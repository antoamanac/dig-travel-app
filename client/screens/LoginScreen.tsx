import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
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
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as AppleAuthentication from "expo-apple-authentication";

import { ThemedText } from "@/components/ThemedText";
import { AppColors, Spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { CommonActions } from "@react-navigation/native";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Login">;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function LoginScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { signIn, signInWithApple, isOperator } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const buttonScale = useSharedValue(1);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = "L'identifiant est requis";
    }

    if (!password) {
      newErrors.password = "Le mot de passe est requis";
    } else if (password.length < 6) {
      newErrors.password = "Minimum 6 caractères";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    const { error, isOperator: isOperatorLogin } = await signIn(email, password);
    setIsLoading(false);

    if (error) {
      Alert.alert(
        "Erreur de connexion",
        error.message === "Invalid login credentials"
          ? "Identifiant ou mot de passe incorrect"
          : error.message
      );
    } else if (isOperatorLogin) {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "OperatorDashboard" }],
        })
      );
    } else {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "CitySelector" }],
        })
      );
    }
  };

  const handlePressIn = () => {
    buttonScale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    buttonScale.value = withSpring(1);
  };

  const handleAppleSignIn = async () => {
    if (Platform.OS !== "ios") {
      Alert.alert("Non disponible", "La connexion Apple est uniquement disponible sur iOS.");
      return;
    }

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const fullName = credential.fullName
        ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(" ") || null
        : null;

      setIsLoading(true);
      const { error } = await signInWithApple(
        credential.user,
        credential.email,
        fullName
      );
      setIsLoading(false);

      if (error) {
        Alert.alert("Erreur", error.message);
      } else {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: "CitySelector" }],
          })
        );
      }
    } catch (e: any) {
      setIsLoading(false);
      if (e.code !== "ERR_REQUEST_CANCELED") {
        Alert.alert("Erreur", "Impossible de se connecter avec Apple.");
      }
    }
  };

  const handleClose = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#071A1A", "#0f2847", "#071A1A"]}
        style={StyleSheet.absoluteFill}
      />

      <Pressable
        style={[styles.closeButton, { top: insets.top + Spacing.sm }]}
        onPress={handleClose}
      >
        <Feather name="x" size={24} color={AppColors.white} />
      </Pressable>

      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          entering={FadeInDown.delay(100).duration(600).springify()}
          style={styles.logoContainer}
        >
          <View style={styles.logoCircle}>
            <MaterialCommunityIcons name="airplane" size={40} color="#00D9C0" />
          </View>
          <ThemedText style={styles.logoText}>DIG TRAVEL</ThemedText>
          <ThemedText style={styles.tagline}>Explorez le monde</ThemedText>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(300).duration(600).springify()}
          style={styles.formContainer}
        >
          <ThemedText style={styles.title}>Connexion</ThemedText>

          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Feather name="user" size={20} color="#00D9C0" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email ou identifiant"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={email}
                onChangeText={setEmail}
                keyboardType="default"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {errors.email ? (
              <ThemedText style={styles.errorText}>{errors.email}</ThemedText>
            ) : null}
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Feather name="lock" size={20} color="#00D9C0" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Mot de passe"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                <Feather
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color="rgba(255,255,255,0.5)"
                />
              </Pressable>
            </View>
            {errors.password ? (
              <ThemedText style={styles.errorText}>{errors.password}</ThemedText>
            ) : null}
          </View>

          <Pressable style={styles.forgotPassword}>
            <ThemedText style={styles.forgotPasswordText}>Mot de passe oublié ?</ThemedText>
          </Pressable>

          <AnimatedPressable
            style={[styles.loginButton, buttonStyle]}
            onPress={handleLogin}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={isLoading}
          >
            <LinearGradient
              colors={["#00D9C0", "#5BA3C6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.loginButtonGradient}
            >
              {isLoading ? (
                <ThemedText style={styles.loginButtonText}>Connexion...</ThemedText>
              ) : (
                <>
                  <ThemedText style={styles.loginButtonText}>Se connecter</ThemedText>
                  <Feather name="arrow-right" size={20} color="#071A1A" />
                </>
              )}
            </LinearGradient>
          </AnimatedPressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <ThemedText style={styles.dividerText}>ou</ThemedText>
            <View style={styles.dividerLine} />
          </View>

          {Platform.OS === "ios" ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
              cornerRadius={14}
              style={styles.appleAuthButton}
              onPress={handleAppleSignIn}
            />
          ) : (
            <Pressable style={[styles.socialButton, styles.appleButton]} onPress={handleAppleSignIn}>
              <View style={styles.appleIconContainer}>
                <ThemedText style={styles.appleLogo}>{"\uF8FF"}</ThemedText>
              </View>
              <ThemedText style={styles.appleButtonText}>Continuer avec Apple</ThemedText>
            </Pressable>
          )}
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(500).duration(600)}
          style={styles.signupContainer}
        >
          <ThemedText style={styles.signupText}>Pas encore de compte ?</ThemedText>
          <Pressable onPress={() => navigation.navigate("Signup")}>
            <ThemedText style={styles.signupLink}>S'inscrire</ThemedText>
          </Pressable>
        </Animated.View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#071A1A",
  },
  closeButton: {
    position: "absolute",
    right: Spacing.md,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(0, 217, 192, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: "rgba(0, 217, 192, 0.3)",
  },
  logoText: {
    fontSize: 28,
    fontWeight: "800",
    color: AppColors.white,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    marginTop: Spacing.xs,
  },
  formContainer: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 24,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: AppColors.white,
    marginBottom: Spacing.xl,
    textAlign: "center",
  },
  inputContainer: {
    marginBottom: Spacing.md,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: Spacing.md,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    height: 56,
    color: AppColors.white,
    fontSize: 16,
  },
  eyeButton: {
    padding: Spacing.sm,
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 12,
    marginTop: Spacing.xs,
    marginLeft: Spacing.md,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: Spacing.lg,
  },
  forgotPasswordText: {
    color: "#00D9C0",
    fontSize: 14,
  },
  loginButton: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: Spacing.lg,
  },
  loginButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: Spacing.sm,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#071A1A",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  dividerText: {
    color: "rgba(255,255,255,0.5)",
    marginHorizontal: Spacing.md,
    fontSize: 14,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  appleButton: {
    marginBottom: 0,
    backgroundColor: AppColors.white,
  },
  appleAuthButton: {
    width: "100%",
    height: 54,
  },
  socialIconContainer: {
    marginRight: Spacing.md,
  },
  appleIconContainer: {
    marginRight: Spacing.md,
    width: 24,
    alignItems: "center",
  },
  appleLogo: {
    fontSize: 22,
    color: "#000",
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  socialButtonText: {
    color: AppColors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  appleButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.xl,
    gap: Spacing.xs,
  },
  signupText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
  },
  signupLink: {
    color: "#00D9C0",
    fontSize: 14,
    fontWeight: "600",
  },
});
