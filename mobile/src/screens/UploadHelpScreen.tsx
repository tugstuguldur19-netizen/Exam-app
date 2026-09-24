import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "../components/ui";
import { colors, radius, spacing, type } from "../theme";

const EXAMPLE = `Физикийн сорил

1. Хурдны нэгж аль нь вэ?
А) кг
Б) м/с
В) Н
Г) Ж
Хариулт: Б
Тайлбар: Хурд = зам / хугацаа.

2. Хүчний нэгжийг бичнэ үү.
Хариулт: Ньютон`;

const KEY_EXAMPLE = `1. ...
2. ...
3. ...

Хариулт
1-Б 2-В 3-А`;

const TIPS: [string, string][] = [
  ["list", "Асуулт бүрийг дугаарлана: «1.» эсвэл «1)»."],
  ["radio-button-on", "Хувилбаруудыг А) Б) В) Г) Д) эсвэл A) B) C) D) гэж бичнэ."],
  ["checkmark-circle", "Зөв хариултыг асуулт бүрийн доор «Хариулт: Б» гэж, эсвэл төгсгөлд нь хариултын түлхүүр болгон бичнэ."],
  ["bulb", "«Тайлбар:» мөр нэмбэл тест дууссаны дараа тайлбар харагдана (заавал биш)."],
  ["create", "Хувилбаргүй асуулт бол нөхөх/богино хариулттай асуулт болно."],
  ["document", "Эхний мөрөнд тестийн нэрийг бичиж болно."],
];

export default function UploadHelpScreen() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.lead}>Апп таны Word файлаас асуулт, хувилбар, хариултыг автоматаар таньдаг. Доорх энгийн хэлбэрийг баримтлаарай.</Text>

      {TIPS.map(([icon, text]) => (
        <View key={text} style={styles.tip}>
          <Ionicons name={icon as any} size={20} color={colors.primary} />
          <Text style={styles.tipText}>{text}</Text>
        </View>
      ))}

      <Text style={styles.label}>Жишээ</Text>
      <Card style={styles.code}>
        <Text style={styles.codeText}>{EXAMPLE}</Text>
      </Card>

      <Text style={styles.label}>Хариултын түлхүүр төгсгөлд нь</Text>
      <Card style={styles.code}>
        <Text style={styles.codeText}>{KEY_EXAMPLE}</Text>
      </Card>

      <Text style={styles.note}>
        Хариулт нь олдоогүй асуулт тестэд орох боловч дүнд тооцогдохгүй — оруулсны дараа анхааруулга харагдана.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl, maxWidth: 720, width: "100%", alignSelf: "center" },
  lead: { ...type.body, color: colors.textSecondary, lineHeight: 21, marginBottom: spacing.lg },
  tip: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md, alignItems: "flex-start" },
  tipText: { ...type.body, color: colors.textPrimary, flex: 1, lineHeight: 21 },
  label: { ...type.tiny, color: colors.textMuted, textTransform: "uppercase", marginTop: spacing.xl, marginBottom: spacing.sm },
  code: { backgroundColor: "#1E1F36", borderColor: "#1E1F36", borderRadius: radius.md },
  codeText: { fontFamily: "monospace", color: "#E4E5F7", fontSize: 14, lineHeight: 21 },
  note: { ...type.small, color: colors.textSecondary, marginTop: spacing.xl, lineHeight: 19 },
});
