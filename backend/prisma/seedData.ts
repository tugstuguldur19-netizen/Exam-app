// Curated question bank. Ids are derived from the keys below and must stay
// stable: clients (and users' answer history) refer to them, and the seed
// upserts by id on every server start.

export type BankQuestion = {
  q: string;
  choices: [string, string, string, string];
  answer: 0 | 1 | 2 | 3;
  explanation: string;
  trial?: boolean;
};

export type BankLesson = {
  key: string;
  name: string;
  description: string;
  questions: BankQuestion[];
};

export type BankSubject = {
  key: string;
  name: string;
  description: string;
  lessons: BankLesson[];
};

export const PLAN_TEMPLATES = [
  { key: "1m", name: "1 сар", durationDays: 30, price: 9900 },
  { key: "3m", name: "3 сар", durationDays: 90, price: 24900 },
  { key: "12m", name: "1 жил", durationDays: 365, price: 79900 },
];

export const SUBJECTS: BankSubject[] = [
  {
    key: "math",
    name: "Математик",
    description: "Тоо, тэгшитгэл, функц, геометр",
    lessons: [
      {
        key: "numbers",
        name: "Тоо ба илэрхийлэл",
        description: "Зэрэг, язгуур, бутархай, хувь",
        questions: [
          {
            q: "2³ · 2⁴ = ?",
            choices: ["2⁷", "2¹²", "4⁷", "2¹"],
            answer: 0,
            explanation: "Ижил суурьтай зэргүүдийг үржүүлэхэд зэргийн илтгэгчийг нэмнэ: 3 + 4 = 7.",
            trial: true,
          },
          {
            q: "√144 = ?",
            choices: ["11", "12", "14", "72"],
            answer: 1,
            explanation: "12 · 12 = 144 тул √144 = 12.",
            trial: true,
          },
          {
            q: "3/4 + 1/6 = ?",
            choices: ["4/10", "11/12", "5/12", "1"],
            answer: 1,
            explanation: "Ерөнхий хуваарь 12: 3/4 = 9/12, 1/6 = 2/12, нийлбэр нь 11/12.",
          },
          {
            q: "120-ийн 15% хэд вэ?",
            choices: ["15", "18", "20", "12"],
            answer: 1,
            explanation: "120 · 0.15 = 18.",
          },
          {
            q: "(a + b)² = ?",
            choices: ["a² + b²", "a² + ab + b²", "a² + 2ab + b²", "2a + 2b"],
            answer: 2,
            explanation: "Нийлбэрийн квадратын томьёо: (a + b)² = a² + 2ab + b².",
          },
          {
            q: "0.25-ыг энгийн бутархайгаар илэрхийлнэ үү.",
            choices: ["1/5", "1/4", "2/5", "1/25"],
            answer: 1,
            explanation: "0.25 = 25/100 = 1/4.",
          },
          {
            q: "|−7| + |3| = ?",
            choices: ["−4", "4", "10", "−10"],
            answer: 2,
            explanation: "Модуль нь үргэлж сөрөг биш: |−7| = 7, |3| = 3, нийлбэр нь 10.",
          },
          {
            q: "36 ба 48-ын хамгийн их ерөнхий хуваагч (ХИЕХ) хэд вэ?",
            choices: ["6", "8", "12", "24"],
            answer: 2,
            explanation: "36 = 2²·3², 48 = 2⁴·3. Ерөнхий хүчин зүйлс: 2²·3 = 12.",
          },
        ],
      },
      {
        key: "equations",
        name: "Тэгшитгэл ба тэнцэтгэл биш",
        description: "Шугаман, квадрат тэгшитгэл, систем",
        questions: [
          {
            q: "3x − 7 = 11 бол x = ?",
            choices: ["4/3", "6", "18", "3"],
            answer: 1,
            explanation: "3x = 11 + 7 = 18, иймд x = 18 / 3 = 6.",
            trial: true,
          },
          {
            q: "x² − 9 = 0 тэгшитгэлийн шийдүүд аль нь вэ?",
            choices: ["x = 3", "x = ±3", "x = 9", "x = ±9"],
            answer: 1,
            explanation: "x² = 9 тул x = 3 эсвэл x = −3.",
            trial: true,
          },
          {
            q: "2x + 5 > 11 тэнцэтгэл бишийн шийд аль нь вэ?",
            choices: ["x > 3", "x < 3", "x > 8", "x > 6"],
            answer: 0,
            explanation: "2x > 11 − 5 = 6, иймд x > 3.",
          },
          {
            q: "x² − 5x + 6 = 0 тэгшитгэлийн шийдүүд аль нь вэ?",
            choices: ["1 ба 6", "−2 ба −3", "2 ба 3", "−1 ба 6"],
            answer: 2,
            explanation: "Үржигдэхүүнд задлахад (x − 2)(x − 3) = 0 тул x = 2 эсвэл x = 3.",
          },
          {
            q: "x + y = 10, x − y = 4 системийн шийд аль нь вэ?",
            choices: ["(7; 3)", "(6; 4)", "(8; 2)", "(5; 5)"],
            answer: 0,
            explanation: "Хоёр тэгшитгэлийг нэмэхэд 2x = 14, x = 7. Дараа нь y = 10 − 7 = 3.",
          },
          {
            q: "5 − 2x ≤ 1 тэнцэтгэл бишийн шийд аль нь вэ?",
            choices: ["x ≤ 2", "x ≥ 2", "x ≥ 3", "x ≤ −2"],
            answer: 1,
            explanation: "−2x ≤ −4. Сөрөг тоогоор хуваахад тэмдэг эргэнэ: x ≥ 2.",
          },
          {
            q: "x² + 4x + 4 = 0 тэгшитгэл хэдэн бодит шийдтэй вэ?",
            choices: ["0", "1", "2", "Хязгааргүй олон"],
            answer: 1,
            explanation: "Дискриминант D = 4² − 4·1·4 = 0 тул ганц (давхар) шийдтэй: x = −2.",
          },
          {
            q: "(x − 1) / 2 = 3 бол x = ?",
            choices: ["5", "6", "7", "4"],
            answer: 2,
            explanation: "x − 1 = 6 тул x = 7.",
          },
        ],
      },
      {
        key: "functions",
        name: "Функц",
        description: "Шугаман ба квадрат функц, график",
        questions: [
          {
            q: "f(x) = 2x + 3 бол f(4) = ?",
            choices: ["8", "11", "14", "9"],
            answer: 1,
            explanation: "f(4) = 2 · 4 + 3 = 11.",
            trial: true,
          },
          {
            q: "y = 3x − 2 шулууны өнцгийн коэффициент хэд вэ?",
            choices: ["−2", "2", "3", "1/3"],
            answer: 2,
            explanation: "y = kx + b хэлбэрт k нь өнцгийн коэффициент. Энд k = 3.",
            trial: true,
          },
          {
            q: "y = x² функцийн график ямар дүрс вэ?",
            choices: ["Шулуун", "Парабол", "Гипербол", "Тойрог"],
            answer: 1,
            explanation: "Квадрат функцийн график нь парабол.",
          },
          {
            q: "y = −2x + 5 функц x өсөхөд хэрхэн өөрчлөгдөх вэ?",
            choices: ["Өснө", "Буурна", "Тогтмол байна", "Эхлээд өсөөд буурна"],
            answer: 1,
            explanation: "Өнцгийн коэффициент k = −2 < 0 тул функц буурна.",
          },
          {
            q: "f(x) = x² − 4 функцийн тэгүүд (f(x) = 0 байх x) аль нь вэ?",
            choices: ["4 ба −4", "2 ба −2", "0", "16"],
            answer: 1,
            explanation: "x² − 4 = 0 → x² = 4 → x = ±2.",
          },
          {
            q: "y = 1/x функцийн тодорхойлогдох муж аль нь вэ?",
            choices: ["Бүх бодит тоо", "x > 0", "x ≠ 0", "x ≥ 0"],
            answer: 2,
            explanation: "Тэгээр хуваах боломжгүй тул x ≠ 0.",
          },
          {
            q: "y = x² − 6x + 5 параболын оройн x координат хэд вэ?",
            choices: ["3", "−3", "6", "5"],
            answer: 0,
            explanation: "Оройн абсцисс x₀ = −b / (2a) = 6 / 2 = 3.",
          },
          {
            q: "(0; 2) ба (2; 6) цэгүүдийг дайрсан шулууны тэгшитгэл аль нь вэ?",
            choices: ["y = 2x + 2", "y = 3x + 2", "y = x + 2", "y = 2x + 6"],
            answer: 0,
            explanation: "k = (6 − 2) / (2 − 0) = 2, x = 0 үед y = 2 тул b = 2. Иймд y = 2x + 2.",
          },
        ],
      },
      {
        key: "geometry",
        name: "Геометр",
        description: "Гурвалжин, тойрог, талбай, эзлэхүүн",
        questions: [
          {
            q: "Гурвалжны дотоод өнцгүүдийн нийлбэр хэдэн градус вэ?",
            choices: ["90°", "180°", "270°", "360°"],
            answer: 1,
            explanation: "Дурын гурвалжны дотоод өнцгүүдийн нийлбэр 180°.",
            trial: true,
          },
          {
            q: "Тэгш өнцөгт гурвалжны катетууд 3 ба 4 бол гипотенуз хэд вэ?",
            choices: ["5", "6", "7", "12"],
            answer: 0,
            explanation: "Пифагорын теорем: c² = 3² + 4² = 25, c = 5.",
            trial: true,
          },
          {
            q: "Радиус нь 5 см тойргийн талбай хэд вэ?",
            choices: ["10π см²", "25π см²", "5π см²", "50π см²"],
            answer: 1,
            explanation: "S = πr² = π · 5² = 25π см².",
          },
          {
            q: "Тэгш өнцөгтийн талууд 6 ба 8 бол диагональ хэд вэ?",
            choices: ["10", "14", "12", "48"],
            answer: 0,
            explanation: "Диагональ = √(6² + 8²) = √100 = 10.",
          },
          {
            q: "Зөв зургаан өнцөгтийн нэг дотоод өнцөг хэдэн градус вэ?",
            choices: ["108°", "120°", "135°", "60°"],
            answer: 1,
            explanation: "n өнцөгтийн дотоод өнцгүүдийн нийлбэр (n − 2)·180° = 720°. 720° / 6 = 120°.",
          },
          {
            q: "Ирмэг нь 3 см кубын эзлэхүүн хэд вэ?",
            choices: ["9 см³", "18 см³", "27 см³", "54 см³"],
            answer: 2,
            explanation: "V = a³ = 3³ = 27 см³.",
          },
          {
            q: "Суурь нь 10, өндөр нь 6 гурвалжны талбай хэд вэ?",
            choices: ["60", "30", "16", "36"],
            answer: 1,
            explanation: "S = (суурь · өндөр) / 2 = (10 · 6) / 2 = 30.",
          },
          {
            q: "Радиус нь 7 тойргийн урт хэд вэ?",
            choices: ["7π", "14π", "49π", "21π"],
            answer: 1,
            explanation: "Тойргийн урт C = 2πr = 2 · π · 7 = 14π.",
          },
        ],
      },
    ],
  },
  {
    key: "biology",
    name: "Биологи",
    description: "Эс, генетик, хүний бие, экологи",
    lessons: [
      {
        key: "cell",
        name: "Эс",
        description: "Эсийн бүтэц, органоид, хуваагдал",
        questions: [
          {
            q: "Амьд биеийн бүтэц, үйл ажиллагааны үндсэн нэгж юу вэ?",
            choices: ["Атом", "Эс", "Эд", "Эрхтэн"],
            answer: 1,
            explanation: "Бүх амьд организм эсээс тогтдог бөгөөд эс нь амьдралын хамгийн жижиг нэгж юм.",
            trial: true,
          },
          {
            q: "Эсийн «эрчим хүчний станц» гэгддэг органоид аль нь вэ?",
            choices: ["Бөөм", "Рибосом", "Митохондри", "Гольджийн цогцолбор"],
            answer: 2,
            explanation: "Митохондрид эсийн амьсгал явагдаж, эрчим хүч хадгалдаг АТФ нийлэгждэг.",
            trial: true,
          },
          {
            q: "Ургамлын эсэд байдаг боловч амьтны эсэд байдаггүй органоид аль нь вэ?",
            choices: ["Митохондри", "Хлоропласт", "Рибосом", "Бөөм"],
            answer: 1,
            explanation: "Хлоропласт фотосинтез явуулдаг бөгөөд зөвхөн ургамал, замагт байдаг.",
          },
          {
            q: "Эсийн удамшлын мэдээллийг хадгалдаг хэсэг аль нь вэ?",
            choices: ["Цитоплазм", "Эсийн мембран", "Бөөм", "Вакуоль"],
            answer: 2,
            explanation: "Эукариот эсийн ДНХ бөөмд хадгалагддаг.",
          },
          {
            q: "Уураг нийлэгждэг органоид аль нь вэ?",
            choices: ["Рибосом", "Лизосом", "Вакуоль", "Центриоль"],
            answer: 0,
            explanation: "Рибосом дээр мРНХ-ийн мэдээллийн дагуу амин хүчлүүдээс уураг нийлэгждэг.",
          },
          {
            q: "Эсийн хуваагдлын ямар төрлөөр бэлгийн эс үүсдэг вэ?",
            choices: ["Митоз", "Мейоз", "Амитоз", "Бүчилгээ"],
            answer: 1,
            explanation: "Мейозын үр дүнд хромосомын тоо хоёр дахин цөөрсөн (гаплоид) бэлгийн эс үүснэ.",
          },
          {
            q: "Бактерийн эс ямар бүлэгт хамаарах вэ?",
            choices: ["Эукариот", "Прокариот", "Вирус", "Мөөгөнцөр"],
            answer: 1,
            explanation: "Бактери жинхэнэ бөөмгүй тул прокариот эсэд хамаарна.",
          },
          {
            q: "Эсийн мембраны гол үүрэг юу вэ?",
            choices: [
              "Фотосинтез явуулах",
              "Бодисын нэвтрэлтийг зохицуулах",
              "Уураг нийлэгжүүлэх",
              "ДНХ хадгалах",
            ],
            answer: 1,
            explanation: "Мембран нь хагас нэвчимтгий бөгөөд эс рүү орох, гарах бодисыг зохицуулдаг.",
          },
        ],
      },
      {
        key: "genetics",
        name: "Генетик",
        description: "ДНХ, хромосом, удамшлын хууль",
        questions: [
          {
            q: "Удамшлын мэдээллийг зөөвөрлөгч молекул аль нь вэ?",
            choices: ["АТФ", "ДНХ", "Глюкоз", "Липид"],
            answer: 1,
            explanation: "ДНХ (дезоксирибонуклейн хүчил) удамшлын мэдээллийг хадгалж, дамжуулдаг.",
            trial: true,
          },
          {
            q: "Хүний биеийн (соматик) эсэд хэдэн хромосом байдаг вэ?",
            choices: ["23", "44", "46", "48"],
            answer: 2,
            explanation: "Хүний соматик эсэд 23 хос буюу 46 хромосом байдаг.",
            trial: true,
          },
          {
            q: "Удамшлын үндсэн хуулиудыг нээсэн эрдэмтэн хэн бэ?",
            choices: ["Чарльз Дарвин", "Грегор Мендель", "Луи Пастер", "Исаак Ньютон"],
            answer: 1,
            explanation: "Грегор Мендель вандуй дээр туршилт хийж удамшлын хуулиудыг нээсэн.",
          },
          {
            q: "Aa × Aa эцэг эхээс aa генотиптэй үр удам гарах магадлал хэд вэ?",
            choices: ["0%", "25%", "50%", "75%"],
            answer: 1,
            explanation: "Пеннетийн торноос AA : Aa : aa = 1 : 2 : 1 тул aa гарах магадлал 1/4 = 25%.",
          },
          {
            q: "ДНХ-д аденин (A) ямар азотын суурьтай хос үүсгэдэг вэ?",
            choices: ["Гуанин", "Цитозин", "Тимин", "Урацил"],
            answer: 2,
            explanation: "Комплементар байдлын дагуу A–T, G–C хос үүсгэнэ. Урацил зөвхөн РНХ-д байдаг.",
          },
          {
            q: "Эрэгтэй хүний бэлгийн хромосомын бүрдэл аль нь вэ?",
            choices: ["XX", "XY", "YY", "X0"],
            answer: 1,
            explanation: "Эмэгтэй хүн XX, эрэгтэй хүн XY бэлгийн хромосомтой.",
          },
          {
            q: "Зөвхөн гомозигот (aa) төлөвт илэрдэг шинжийг юу гэж нэрлэх вэ?",
            choices: ["Давамгай", "Рецессив", "Хагас давамгай", "Кодоминант"],
            answer: 1,
            explanation: "Рецессив шинж давамгай аллель байхгүй үед л илэрнэ.",
          },
          {
            q: "Генийн бүтцэд гарсан удамших өөрчлөлтийг юу гэж нэрлэх вэ?",
            choices: ["Мутаци", "Модификаци", "Рекомбинаци", "Эволюци"],
            answer: 0,
            explanation: "Мутаци нь ДНХ-ийн бүтцийн өөрчлөлт бөгөөд үр удамд дамжиж болно.",
          },
        ],
      },
      {
        key: "human-body",
        name: "Хүний бие",
        description: "Цусны эргэлт, хоол боловсруулалт, эрхтнүүд",
        questions: [
          {
            q: "Цусыг бүх биеэр шахаж гүйлгэдэг эрхтэн аль нь вэ?",
            choices: ["Уушги", "Зүрх", "Элэг", "Бөөр"],
            answer: 1,
            explanation: "Зүрх бол цусыг судсаар шахаж гүйлгэдэг булчинлаг эрхтэн.",
            trial: true,
          },
          {
            q: "Хүчилтөрөгч зөөвөрлөдөг цусны эс аль нь вэ?",
            choices: ["Цагаан эс (лейкоцит)", "Улаан эс (эритроцит)", "Ялтас (тромбоцит)", "Сийвэн"],
            answer: 1,
            explanation: "Улаан эс дэх гемоглобин хүчилтөрөгчтэй холбогдож зөөвөрлөдөг.",
            trial: true,
          },
          {
            q: "Хүний биеийн хамгийн том эрхтэн аль нь вэ?",
            choices: ["Элэг", "Арьс", "Уушги", "Тархи"],
            answer: 1,
            explanation: "Арьс бол талбай, жингээрээ хүний биеийн хамгийн том эрхтэн.",
          },
          {
            q: "Инсулин ялгаруулдаг эрхтэн аль нь вэ?",
            choices: ["Бамбай булчирхай", "Нойр булчирхай", "Элэг", "Бөөрний дээд булчирхай"],
            answer: 1,
            explanation: "Нойр булчирхайн эсүүд цусан дахь сахарыг зохицуулах инсулин ялгаруулдаг.",
          },
          {
            q: "Шүлсэнд агуулагдах амилаза фермент ямар бодисыг задалдаг вэ?",
            choices: ["Уураг", "Цардуул", "Өөх тос", "Эрдэс бодис"],
            answer: 1,
            explanation: "Амилаза цардуулыг задалж эхэлдэг тул нүүрс ус амнаас боловсорч эхэлдэг.",
          },
          {
            q: "Цусыг шүүж шээс үүсгэдэг эрхтэн аль нь вэ?",
            choices: ["Бөөр", "Элэг", "Дэлүү", "Давсаг"],
            answer: 0,
            explanation: "Бөөр цусыг шүүж, илүүдэл ус болон хорт бодисыг шээсээр ялгаруулдаг.",
          },
          {
            q: "Насанд хүрсэн хүний араг яс ойролцоогоор хэдэн яснаас бүрддэг вэ?",
            choices: ["106", "206", "306", "150"],
            answer: 1,
            explanation: "Насанд хүрсэн хүн 206 орчим ястай. Нярай хүүхэд илүү олон ястай төрж, зарим нь нийлдэг.",
          },
          {
            q: "Уушгинд хийн солилцоо явагддаг бүтэц аль нь вэ?",
            choices: ["Гуурсан хоолой", "Цулцангууд (альвеол)", "Мөгөөрсөн хоолой", "Төвөнх"],
            answer: 1,
            explanation: "Нимгэн ханатай цулцангуудаар хүчилтөрөгч цусанд орж, нүүрсхүчлийн хий гардаг.",
          },
        ],
      },
      {
        key: "ecology",
        name: "Экологи",
        description: "Экосистем, хүнсний гинж, байгаль орчин",
        questions: [
          {
            q: "Ургамал фотосинтезийн явцад агаараас ямар хий шингээдэг вэ?",
            choices: ["Хүчилтөрөгч", "Азот", "Нүүрсхүчлийн хий", "Устөрөгч"],
            answer: 2,
            explanation: "Ургамал CO₂ ба усыг нарны гэрлийн тусламжтайгаар глюкоз, хүчилтөрөгч болгодог.",
            trial: true,
          },
          {
            q: "Хүнсний гинжин хэлхээнд ногоон ургамал ямар үүрэгтэй вэ?",
            choices: ["Продуцент (үйлдвэрлэгч)", "Консумент (хэрэглэгч)", "Редуцент (задлагч)", "Махчин"],
            answer: 0,
            explanation: "Ургамал нарны энергиэр органик бодис бүтээдэг тул продуцент.",
            trial: true,
          },
          {
            q: "Үхсэн органик бодисыг задалдаг организмуудыг юу гэж нэрлэх вэ?",
            choices: ["Продуцент", "Консумент", "Редуцент", "Паразит"],
            answer: 2,
            explanation: "Бактери, мөөг зэрэг редуцентүүд органик үлдэгдлийг эрдэс бодис болгон задалдаг.",
          },
          {
            q: "Организм ба түүний орчны харилцан хамаарлыг судалдаг шинжлэх ухаан аль нь вэ?",
            choices: ["Анатоми", "Экологи", "Генетик", "Цитологи"],
            answer: 1,
            explanation: "Экологи нь амьд организм болон орчны хоорондын харилцааг судалдаг.",
          },
          {
            q: "«Өвс → туулай → үнэг» хүнсний гинжинд үнэг аль шим тэжээлийн түвшинд байх вэ?",
            choices: ["1-р түвшин", "2-р түвшин", "3-р түвшин", "Продуцент"],
            answer: 2,
            explanation: "Өвс 1-р (продуцент), туулай 2-р, үнэг 3-р түвшинд байна.",
          },
          {
            q: "Хүлэмжийн нөлөөнд хамгийн их хувь нэмэр оруулдаг хий аль нь вэ?",
            choices: ["Хүчилтөрөгч", "Нүүрсхүчлийн хий", "Азот", "Аргон"],
            answer: 1,
            explanation: "Нүүрс, нефть шатаахад ялгардаг CO₂ хүлэмжийн нөлөөний гол шалтгаан.",
          },
          {
            q: "Нэг зүйлийн, нэг нутагт амьдардаг бодгалиудын бүлгийг юу гэж нэрлэх вэ?",
            choices: ["Популяци", "Бүлгэмдэл", "Экосистем", "Биосфер"],
            answer: 0,
            explanation: "Популяци бол нэг зүйлийн, нэг нутаг дэвсгэрт хамт амьдардаг бодгалиуд.",
          },
          {
            q: "Шим тэжээлийн түвшин дээшлэх тусам дамжих энерги хэрхэн өөрчлөгдөх вэ?",
            choices: ["Нэмэгдэнэ", "Буурна", "Өөрчлөгдөхгүй", "Хоёр дахин өснө"],
            answer: 1,
            explanation: "Түвшин бүрт энергийн ихэнх нь алдагдаж, дараагийн түвшинд ердөө 10% орчим нь дамждаг.",
          },
        ],
      },
    ],
  },
  {
    key: "english",
    name: "Англи хэл",
    description: "Цаг, үгсийн сан, артикль, нөхцөлт өгүүлбэр",
    lessons: [
      {
        key: "tenses",
        name: "Цагийн хэлбэр",
        description: "Present, Past, Perfect, Future",
        questions: [
          {
            q: "Зөв хувилбарыг сонгоно уу: She ___ to school every day.",
            choices: ["go", "goes", "going", "gone"],
            answer: 1,
            explanation: "Одоо энгийн цаг (Present Simple), 3-р биеийн ганц тоонд үйл үг -s/-es авна.",
            trial: true,
          },
          {
            q: "Зөв хувилбарыг сонгоно уу: I ___ TV when you called.",
            choices: ["watch", "watched", "was watching", "have watched"],
            answer: 2,
            explanation: "Өнгөрсөн үед үргэлжилж байсан үйлийг Past Continuous (was/were + -ing) илэрхийлнэ.",
            trial: true,
          },
          {
            q: "Зөв хувилбарыг сонгоно уу: They ___ in Ulaanbaatar since 2015.",
            choices: ["live", "lived", "have lived", "are living"],
            answer: 2,
            explanation: "«since» нь өнгөрсөн үеэс одоог хүртэл үргэлжилж буйг заах тул Present Perfect.",
          },
          {
            q: "Зөв хувилбарыг сонгоно уу: Look! It ___.",
            choices: ["rains", "is raining", "rained", "has rained"],
            answer: 1,
            explanation: "«Look!» нь яг одоо болж буй үйлийг заах тул Present Continuous.",
          },
          {
            q: "Зөв хувилбарыг сонгоно уу: We ___ the film last night.",
            choices: ["see", "have seen", "saw", "seeing"],
            answer: 2,
            explanation: "«last night» тодорхой өнгөрсөн цагийг заах тул Past Simple: saw.",
          },
          {
            q: "Зөв хувилбарыг сонгоно уу: By next year, she ___ her degree.",
            choices: ["finishes", "will have finished", "finished", "has finished"],
            answer: 1,
            explanation: "Ирээдүйн тодорхой хугацаанаас өмнө дуусах үйлийг Future Perfect илэрхийлнэ.",
          },
          {
            q: "Зөв хувилбарыг сонгоно уу: He ___ his homework yet.",
            choices: ["didn't finish", "hasn't finished", "doesn't finish", "isn't finishing"],
            answer: 1,
            explanation: "Үгүйсгэх өгүүлбэр дэх «yet» Present Perfect-тэй хэрэглэгдэнэ.",
          },
          {
            q: "Зөв хувилбарыг сонгоно уу: I ___ you tomorrow at 5 o'clock.",
            choices: ["call", "will call", "called", "calling"],
            answer: 1,
            explanation: "Ирээдүйд хийх үйлийг Future Simple (will + үйл үг) илэрхийлнэ.",
          },
        ],
      },
      {
        key: "vocabulary",
        name: "Үгсийн сан",
        description: "Ойролцоо ба эсрэг утгатай үг, өдөр тутмын үг",
        questions: [
          {
            q: "«Happy» гэдэг үгийн эсрэг утгатай үг аль нь вэ?",
            choices: ["Glad", "Sad", "Joyful", "Cheerful"],
            answer: 1,
            explanation: "Happy — баяртай, Sad — гунигтай. Бусад нь ойролцоо утгатай үгс.",
            trial: true,
          },
          {
            q: "«Library» гэдэг үгийн утга аль нь вэ?",
            choices: ["Эмнэлэг", "Номын сан", "Дэлгүүр", "Сургууль"],
            answer: 1,
            explanation: "Library — номын сан. Эмнэлэг — hospital, дэлгүүр — shop, сургууль — school.",
            trial: true,
          },
          {
            q: "«Big» гэдэг үгтэй ойролцоо утгатай үг аль нь вэ?",
            choices: ["Small", "Large", "Tiny", "Short"],
            answer: 1,
            explanation: "Big ба large хоёулаа «том» гэсэн утгатай.",
          },
          {
            q: "«Хоолны өрөө» англиар юу вэ?",
            choices: ["Bedroom", "Bathroom", "Dining room", "Living room"],
            answer: 2,
            explanation: "Dining room — хоолны өрөө, bedroom — унтлагын өрөө, living room — зочны өрөө.",
          },
          {
            q: "«Expensive» гэдэг үгийн эсрэг утгатай үг аль нь вэ?",
            choices: ["Cheap", "Costly", "Rich", "Valuable"],
            answer: 0,
            explanation: "Expensive — үнэтэй, cheap — хямд.",
          },
          {
            q: "«Borrow» гэдэг үгийн утга аль нь вэ?",
            choices: ["Зээлж өгөх", "Зээлж авах", "Худалдаж авах", "Бэлэглэх"],
            answer: 1,
            explanation: "Borrow — зээлж авах, lend — зээлж өгөх.",
          },
          {
            q: "Зөв хувилбарыг сонгоно уу: A person who treats sick animals is a ___.",
            choices: ["dentist", "vet", "pilot", "farmer"],
            answer: 1,
            explanation: "Vet (veterinarian) — малын эмч.",
          },
          {
            q: "«Weather» гэдэг үгийн утга аль нь вэ?",
            choices: ["Цаг хугацаа", "Цаг агаар", "Улирал", "Ус"],
            answer: 1,
            explanation: "Weather — цаг агаар. Цаг хугацаа — time, улирал — season.",
          },
        ],
      },
      {
        key: "articles",
        name: "Артикль ба угтвар үг",
        description: "a / an / the, in / on / at",
        questions: [
          {
            q: "Зөв хувилбарыг сонгоно уу: I saw ___ elephant at the zoo.",
            choices: ["a", "an", "the", "(юу ч биш)"],
            answer: 1,
            explanation: "Эгшиг авиагаар эхэлсэн үгийн өмнө «an» хэрэглэнэ: an elephant.",
            trial: true,
          },
          {
            q: "Зөв хувилбарыг сонгоно уу: The book is ___ the table.",
            choices: ["on", "at", "in", "to"],
            answer: 0,
            explanation: "Гадаргуу дээр байхыг «on» илэрхийлнэ.",
            trial: true,
          },
          {
            q: "Зөв хувилбарыг сонгоно уу: ___ sun rises in the east.",
            choices: ["A", "An", "The", "(юу ч биш)"],
            answer: 2,
            explanation: "Ганц байдаг зүйлийн өмнө «the» хэрэглэнэ: the sun, the moon.",
          },
          {
            q: "Зөв хувилбарыг сонгоно уу: My birthday is ___ May.",
            choices: ["on", "at", "in", "by"],
            answer: 2,
            explanation: "Сар, жил, улирлын өмнө «in» хэрэглэнэ: in May.",
          },
          {
            q: "Зөв хувилбарыг сонгоно уу: We will meet ___ Monday.",
            choices: ["in", "on", "at", "by"],
            answer: 1,
            explanation: "Гараг, огнооны өмнө «on» хэрэглэнэ: on Monday.",
          },
          {
            q: "Зөв хувилбарыг сонгоно уу: She is ___ honest person.",
            choices: ["a", "an", "the", "(юу ч биш)"],
            answer: 1,
            explanation: "«honest» үгийн h дуудагдахгүй, эгшиг авиагаар эхэлдэг тул «an».",
          },
          {
            q: "Зөв хувилбарыг сонгоно уу: The class starts ___ 9 o'clock.",
            choices: ["in", "on", "at", "for"],
            answer: 2,
            explanation: "Цагийн тодорхой агшны өмнө «at» хэрэглэнэ: at 9 o'clock.",
          },
          {
            q: "Зөв хувилбарыг сонгоно уу: He is interested ___ music.",
            choices: ["at", "on", "in", "about"],
            answer: 2,
            explanation: "«interested» үргэлж «in»-тэй хэрэглэгдэнэ.",
          },
        ],
      },
      {
        key: "conditionals",
        name: "Нөхцөлт өгүүлбэр ба модаль үйл үг",
        description: "If-өгүүлбэр, must / should / could",
        questions: [
          {
            q: "Зөв хувилбарыг сонгоно уу: If it rains tomorrow, we ___ at home.",
            choices: ["stay", "will stay", "stayed", "would stay"],
            answer: 1,
            explanation: "1-р нөхцөл: If + Present Simple, will + үйл үг.",
            trial: true,
          },
          {
            q: "Зөв хувилбарыг сонгоно уу: You ___ wear a seatbelt. It's the law.",
            choices: ["must", "might", "could", "may"],
            answer: 0,
            explanation: "Хууль, заавал биелүүлэх үүргийг «must» илэрхийлнэ.",
            trial: true,
          },
          {
            q: "Зөв хувилбарыг сонгоно уу: If I ___ rich, I would travel the world.",
            choices: ["am", "were", "will be", "have been"],
            answer: 1,
            explanation: "2-р нөхцөл (бодит бус одоо): If + Past Simple (were), would + үйл үг.",
          },
          {
            q: "Зөв хувилбарыг сонгоно уу: ___ you help me, please?",
            choices: ["Must", "Could", "Should", "Need"],
            answer: 1,
            explanation: "Эелдэг хүсэлтэд «Could you…?» хэрэглэнэ.",
          },
          {
            q: "Зөв хувилбарыг сонгоно уу: If you heat ice, it ___.",
            choices: ["melts", "melted", "would melt", "will melted"],
            answer: 0,
            explanation: "0-р нөхцөл (байгалийн хууль): If + Present Simple, Present Simple.",
          },
          {
            q: "Зөв хувилбарыг сонгоно уу: You ___ smoke here. It's forbidden.",
            choices: ["mustn't", "don't have to", "needn't", "may"],
            answer: 0,
            explanation: "Хориглолтыг «mustn't» илэрхийлнэ. «don't have to» нь «шаардлагагүй» гэсэн утгатай.",
          },
          {
            q: "Зөв хувилбарыг сонгоно уу: If she had studied, she ___ the exam.",
            choices: ["will pass", "would pass", "would have passed", "passed"],
            answer: 2,
            explanation: "3-р нөхцөл (өнгөрсөн бодит бус): If + Past Perfect, would have + V3.",
          },
          {
            q: "Зөв хувилбарыг сонгоно уу: It's cold. You ___ take a jacket.",
            choices: ["should", "mustn't", "can't", "needn't"],
            answer: 0,
            explanation: "Зөвлөгөө өгөхөд «should» хэрэглэнэ.",
          },
        ],
      },
    ],
  },
];
