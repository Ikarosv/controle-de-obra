// src/lib/constants.ts
export const STAGES = [
  "Projetos & Taxas",
  "Terraplenagem & Fundação",
  "Estrutura & Alvenaria",
  "Cobertura & Telhado",
  "Instalações (Elétrica & Hidráulica)",
  "Revestimentos & Pisos",
  "Esquadrias & Marcenaria",
  "Acabamento, Louças & Pintura",
] as const;

export const UNITS = [
  { value: "un", label: "Unidade (un)" },
  { value: "sc", label: "Saco (sc)" },
  { value: "m²", label: "Metro Quadrado (m²)" },
  { value: "m³", label: "Metro Cúbico (m³)" },
  { value: "m", label: "Metro Linear (m)" },
  { value: "kg", label: "Quilo (kg)" },
  { value: "lt", label: "Litro (lt)" },
  { value: "cx", label: "Caixa (cx)" },
  { value: "vb", label: "Verba / Serviço (vb)" },
] as const;

export const SPLIT_PRESETS = [
  { value: "50/50", label: "50% / 50% (Meio a Meio)" },
  { value: "60/40", label: "60% / 40% (Proporcional)" },
  { value: "70/30", label: "70% / 30% (Proporcional)" },
  { value: "100/0", label: "100% Responsável Único" },
  { value: "EQUAL_ALL", label: "Divisão Igual entre Todos" },
  { value: "CUSTOM", label: "Personalizado (Manual R$)" },
] as const;

export const DEFAULT_PIX_KEY = "obra.residencial@pix.com.br";
