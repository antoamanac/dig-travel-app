import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { AppColors, Spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Signup">;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function SignupScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const buttonScale = useSharedValue(1);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!fullName.trim()) {
      newErrors.fullName = "Le nom est requis";
    } else if (fullName.trim().length < 2) {
      newErrors.fullName = "Minimum 2 caractères";
    }

    if (!email.trim()) {
      newErrors.email = "L'email est requis";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Email invalide";
    }

    if (!password) {
      newErrors.password = "Le mot de passe est requis";
    } else if (password.length < 6) {
      newErrors.password = "Minimum 6 caractères";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Confirmez le mot de passe";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Les mots de passe ne correspondent pas";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    const { error } = await signUp(email, password, fullName);
    setIsLoading(false);

    if (error) {
      Alert.alert(
        "Erreur d'inscription",
        error.message === "User already registered"
          ? "Un compte existe déjà avec cet email"
          : error.message
      );
    } else {
      navigation.goBack();
    }
  };

  const handlePressIn = () => {
    buttonScale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    buttonScale.value = withSpring(1);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#071A1A", "#0f2847", "#071A1A"]}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          style={[styles.backButton, { top: insets.top + Spacing.sm }]}
          onPress={() => navigation.goBack()}
        >
          <Feather name="chevron-left" size={24} color={AppColors.white} />
        </Pressable>

        <Animated.View
          entering={FadeInDown.delay(100).duration(600).springify()}
          style={styles.header}
        >
          <ThemedText style={styles.title}>Créer un compte</ThemedText>
          <ThemedText style={styles.subtitle}>
            Rejoignez DIG TRAVEL et explorez le monde
          </ThemedText>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(300).duration(600).springify()}
          style={styles.formContainer}
        >
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Feather name="user" size={20} color="#00D9C0" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nom complet"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
            </View>
            {errors.fullName ? (
              <ThemedText style={styles.errorText}>{errors.fullName}</ThemedText>
            ) : null}
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Feather name="mail" size={20} color="#00D9C0" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
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
                placeholder="Mot de passe (min. 6 caractères)"
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

          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Feather name="check-circle" size={20} color="#00D9C0" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirmer le mot de passe"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
            </View>
            {errors.confirmPassword ? (
              <ThemedText style={styles.errorText}>{errors.confirmPassword}</ThemedText>
            ) : null}
          </View>

          <AnimatedPressable
            style={[styles.signupButton, buttonStyle]}
            onPress={handleSignup}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={isLoading}
          >
            <LinearGradient
              colors={["#00D9C0", "#5BA3C6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.signupButtonGradient}
            >
              {isLoading ? (
                <ThemedText style={styles.signupButtonText}>Création...</ThemedText>
              ) : (
                <>
                  <ThemedText style={styles.signupButtonText}>S'inscrire</ThemedText>
                  <Feather name="arrow-right" size={20} color="#071A1A" />
                </>
              )}
            </LinearGradient>
          </AnimatedPressable>

          <ThemedText style={styles.termsText}>
            En vous inscrivant, vous acceptez nos{" "}
            <ThemedText style={styles.termsLink}>Conditions d'utilisation</ThemedText>
            {" "}et notre{" "}
            <ThemedText style={styles.termsLink}>Politique de confidentialité</ThemedText>
          </ThemedText>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(500).duration(600)}
          style={styles.loginContainer}
        >
          <ThemedText style={styles.loginText}>Déjà un compte ?</ThemedText>
          <Pressable onPress={() => navigation.navigate("Login")}>
            <ThemedText style={styles.loginLink}>Se connecter</ThemedText>
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
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: 80,
  },
  backButton: {
    position: "absolute",
    left: Spacing.md,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: AppColors.white,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.6)",
  },
  formContainer: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 24,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
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
  signupButton: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  signupButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: Spacing.sm,
  },
  signupButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#071A1A",
  },
  termsText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    lineHeight: 18,
  },
  termsLink: {
    color: "#00D9C0",
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.xl,
    gap: Spacing.xs,
  },
  loginText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
  },
  loginLink: {
    color: "#00D9C0",
    fontSize: 14,
    fontWeight: "600",
  },
});
