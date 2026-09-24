import type { NavigatorScreenParams } from "@react-navigation/native";

export type TabParamList = {
  Home: undefined;
  Uploads: undefined;
  Progress: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  SubjectDetail: { subjectId: string; subjectName: string };
  MixedBuilder: { subjectId: string; subjectName: string };
  Plans: { subjectId: string; subjectName: string };
  TakeTest: { sessionId: string; title: string };
  Result: { sessionId: string; justSubmitted?: boolean };
  History: undefined;
  UploadHelp: undefined;
  ChangePassword: undefined;
};
