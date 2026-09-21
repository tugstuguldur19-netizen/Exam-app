import React from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./types";
import { useAuth } from "../context/AuthContext";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import SubjectsScreen from "../screens/SubjectsScreen";
import SubjectDetailScreen from "../screens/SubjectDetailScreen";
import TakeExamScreen from "../screens/TakeExamScreen";
import ResultsScreen from "../screens/ResultsScreen";
import { colors } from "../theme";

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.background, primary: colors.primary },
};

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
            <Stack.Screen name="Subjects" component={SubjectsScreen} options={{ headerShown: false }} />
            <Stack.Screen
              name="SubjectDetail"
              component={SubjectDetailScreen}
              options={({ route }) => ({ title: route.params.subjectName })}
            />
            <Stack.Screen
              name="TakeExam"
              component={TakeExamScreen}
              options={({ route }) => ({ title: route.params.examTitle })}
            />
            <Stack.Screen name="Results" component={ResultsScreen} options={{ title: "" }} />
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
