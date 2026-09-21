import React from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./types";
import { useAuth } from "../context/AuthContext";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import SubjectsScreen from "../screens/SubjectsScreen";
import SubjectDetailScreen from "../screens/SubjectDetailScreen";
import TakeExamScreen from "../screens/TakeExamScreen";
import ResultsScreen from "../screens/ResultsScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {user ? (
          <>
            <Stack.Screen name="Subjects" component={SubjectsScreen} options={{ title: "Subjects" }} />
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
            <Stack.Screen name="Results" component={ResultsScreen} options={{ title: "Results" }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ title: "Register" }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
