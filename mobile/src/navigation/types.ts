export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Subjects: undefined;
  SubjectDetail: { subjectId: string; subjectName: string };
  TakeExam: { examId: string; examTitle: string };
  Results: { attemptId: string };
};
