import { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api, ApiError, describeError } from "../api/client";
import { confirm, showMessage } from "../components/dialog";
import type { RootStackParamList } from "../navigation/types";
import type { CreateTestRequest } from "../types";

// Creates a test session and opens it. A paid test without a subscription
// offers the plans screen instead of just failing.
export function useStartTest(subject?: { id: string; name: string }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [starting, setStarting] = useState<string | null>(null);

  const start = async (req: CreateTestRequest, key: string = req.mode) => {
    if (starting) return;
    setStarting(key);
    try {
      const session = await api.createTest(req);
      navigation.navigate("TakeTest", { sessionId: session.id, title: session.title });
    } catch (err) {
      if (err instanceof ApiError && err.code === "SUBSCRIPTION_REQUIRED" && subject) {
        const go = await confirm("Эрх шаардлагатай", err.message, { confirmText: "Эрх авах" });
        if (go) navigation.navigate("Plans", { subjectId: subject.id, subjectName: subject.name });
      } else {
        showMessage("Тест эхлүүлж чадсангүй", describeError(err));
      }
    } finally {
      setStarting(null);
    }
  };

  return { start, starting };
}
