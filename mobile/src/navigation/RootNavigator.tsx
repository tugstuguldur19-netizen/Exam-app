import React from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { RootStackParamList, TabParamList } from "./types";
import { useAuth } from "../context/AuthContext";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import HomeScreen from "../screens/HomeScreen";
import UploadsScreen from "../screens/UploadsScreen";
import ProgressScreen from "../screens/ProgressScreen";
import ProfileScreen from "../screens/ProfileScreen";
import SubjectDetailScreen from "../screens/SubjectDetailScreen";
import MixedBuilderScreen from "../screens/MixedBuilderScreen";
import PlansScreen from "../screens/PlansScreen";
import TakeTestScreen from "../screens/TakeTestScreen";
import ResultScreen from "../screens/ResultScreen";
import HistoryScreen from "../screens/HistoryScreen";
import UploadHelpScreen from "../screens/UploadHelpScreen";
import ChangePasswordScreen from "../screens/ChangePasswordScreen";
import { colors, IconName } from "../theme";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.background, primary: colors.primary },
};

const TAB_ICONS: Record<keyof TabParamList, [IconName, IconName]> = {
  Home: ["home", "home-outline"],
  Uploads: ["document-text", "document-text-outline"],
  Progress: ["stats-chart", "stats-chart-outline"],
  Profile: ["person-circle", "person-circle-outline"],
};

function Tabs() {
  // Explicit height: the default (49pt) squeezes the label under the icon so
  // Cyrillic descenders get clipped.
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600", lineHeight: 15 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 64 + insets.bottom,
          paddingTop: 4,
          paddingBottom: 4 + insets.bottom,
        },
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons name={TAB_ICONS[route.name][focused ? 0 : 1]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: "Нүүр" }} />
      <Tab.Screen name="Uploads" component={UploadsScreen} options={{ title: "Миний тест" }} />
      <Tab.Screen name="Progress" component={ProgressScreen} options={{ title: "Ахиц" }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: "Профайл" }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerShadowVisible: false,
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontWeight: "700" },
          headerBackButtonDisplayMode: "minimal",
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {user ? (
          <>
            <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
            <Stack.Screen
              name="SubjectDetail"
              component={SubjectDetailScreen}
              options={({ route }) => ({ title: route.params.subjectName })}
            />
            <Stack.Screen name="MixedBuilder" component={MixedBuilderScreen} options={{ title: "Холимог тест" }} />
            <Stack.Screen name="Plans" component={PlansScreen} options={{ title: "Эрх авах", presentation: "modal" }} />
            <Stack.Screen
              name="TakeTest"
              component={TakeTestScreen}
              options={({ route }) => ({ title: route.params.title, gestureEnabled: false })}
            />
            <Stack.Screen name="Result" component={ResultScreen} options={{ title: "Үр дүн" }} />
            <Stack.Screen name="History" component={HistoryScreen} options={{ title: "Тестийн түүх" }} />
            <Stack.Screen name="UploadHelp" component={UploadHelpScreen} options={{ title: "Файлын формат" }} />
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: "Нууц үг солих" }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ title: "" }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
