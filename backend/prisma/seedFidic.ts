import type { BankSubject } from "./seedData";

// FIDIC FCL: one lesson per clause of the FIDIC 2017 conditions of contract
// (Red Book numbering, 21 clauses). Questions come from content/fidic/*.json
// (see scripts/importDocx.ts), not from this file.
const CLAUSES: [string, string][] = [
  ["Ерөнхий заалтууд", "General Provisions"],
  ["Захиалагч", "The Employer"],
  ["Инженер", "The Engineer"],
  ["Гүйцэтгэгч", "The Contractor"],
  ["Туслан гүйцэтгэгч", "Subcontracting"],
  ["Ажилтан ба ажиллах хүч", "Staff and Labour"],
  ["Тоног төхөөрөмж, материал, ажлын чанар", "Plant, Materials and Workmanship"],
  ["Ажил эхлэх, саатал, түр зогсолт", "Commencement, Delays and Suspension"],
  ["Дуусгалтын туршилт", "Tests on Completion"],
  ["Захиалагч ажлыг хүлээн авах", "Employer's Taking Over"],
  ["Хүлээн авсны дараах согог", "Defects after Taking Over"],
  ["Хэмжилт ба үнэлгээ", "Measurement and Valuation"],
  ["Өөрчлөлт ба тохируулга", "Variations and Adjustments"],
  ["Гэрээний үнэ ба төлбөр", "Contract Price and Payment"],
  ["Захиалагч гэрээ цуцлах", "Termination by Employer"],
  ["Гүйцэтгэгч түр зогсоох, цуцлах", "Suspension and Termination by Contractor"],
  ["Ажлын хамгаалалт ба хохирол нөхөх", "Care of the Works and Indemnities"],
  ["Онцгой үйл явдал", "Exceptional Events"],
  ["Даатгал", "Insurance"],
  ["Захиалагч, Гүйцэтгэгчийн нэхэмжлэл", "Employer's and Contractor's Claims"],
  ["Маргаан ба арбитр", "Disputes and Arbitration"],
];

export const FIDIC_SUBJECT: BankSubject = {
  key: "fidic",
  name: "FIDIC FCL",
  description: "FIDIC гэрээний нөхцөлүүд — 21 бүлэг",
  lessons: CLAUSES.map(([mn, en], i) => ({
    key: `c${String(i + 1).padStart(2, "0")}`,
    name: mn,
    description: `Clause ${i + 1} — ${en}`,
    questions: [],
  })),
};
