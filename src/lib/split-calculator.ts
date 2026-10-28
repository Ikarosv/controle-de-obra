// src/lib/split-calculator.ts

export type SplitPreset =
  | "50/50"
  | "60/40"
  | "70/30"
  | "100/0"
  | "EQUAL_ALL"
  | "CUSTOM";

export interface SplitParticipantInput {
  userId: string;
  role: "ADMIN" | "PARTICIPANT";
}

export interface CalculatedSplit {
  userId: string;
  amountDue: number;
  status: "PAID" | "PENDING";
}

/**
 * Converte um valor monetário em reais (float) para centavos inteiros.
 * Protege contra NaN, Infinity e imprecisão de ponto flutuante binário (IEEE 754).
 */
export function toCents(value: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return 0;
  }
  return Math.round(num * 100);
}

/**
 * Converte centavos inteiros de volta para valor decimal com 2 casas exatas.
 */
export function fromCents(cents: number): number {
  if (!Number.isFinite(cents)) {
    return 0;
  }
  return Number((Math.round(cents) / 100).toFixed(2));
}

/**
 * Retorna a diferença em centavos entre o valor total do item e a soma das cotas:
 * `toCents(totalValue) - sum(toCents(split.amountDue))`
 */
export function calculateSplitsDifferenceInCents(
  totalValue: number,
  splits: { amountDue: number }[]
): number {
  const totalCents = toCents(totalValue);
  const sumCents = (splits || []).reduce(
    (acc, s) => acc + toCents(s.amountDue),
    0
  );
  return totalCents - sumCents;
}

/**
 * Verifica a invariante contábil estrita (Tolerância Zero de Centavos):
 * - totalValue deve ser > 0 em centavos
 * - nenhum split pode ter valor negativo ou NaN/Infinity
 * - deve haver pelo menos 1 split com valor > 0
 * - soma exata em centavos: sum(toCents(amountDue)) === toCents(totalValue)
 */
export function isSplitSumExact(
  totalValue: number,
  splits: { amountDue: number }[]
): boolean {
  if (!Number.isFinite(Number(totalValue))) {
    return false;
  }
  const totalCents = toCents(totalValue);
  if (totalCents <= 0) {
    return false;
  }
  if (!Array.isArray(splits) || splits.length === 0) {
    return false;
  }

  let sumCents = 0;
  let hasPositiveSplit = false;

  for (const split of splits) {
    const rawVal = Number(split.amountDue);
    if (!Number.isFinite(rawVal)) {
      return false;
    }
    const cents = toCents(rawVal);
    if (cents < 0) {
      return false;
    }
    if (cents > 0) {
      hasPositiveSplit = true;
    }
    sumCents += cents;
  }

  if (!hasPositiveSplit) {
    return false;
  }

  return sumCents === totalCents;
}

/**
 * Distribui `totalCents` igualmente entre `count` participantes em centavos inteiros.
 * Os centavos residuais (`totalCents % count`) são distribuídos +1 para os primeiros participantes.
 */
export function distributeEqualInCents(
  totalCents: number,
  count: number
): number[] {
  if (count <= 0) return [];
  const safeTotal = Math.max(0, Math.round(Number(totalCents) || 0));
  if (safeTotal === 0) {
    return new Array(count).fill(0);
  }
  const weights = new Array(count).fill(1);
  return distributeByWeightsInCents(safeTotal, weights);
}

/**
 * Distribui `totalCents` proporcionalmente aos pesos `weights` usando aritmética inteira
 * e alocação determinística dos centavos residuais nos primeiros participantes com peso > 0.
 * Garante matematicamente que sum(result) === totalCents.
 */
export function distributeByWeightsInCents(
  totalCents: number,
  weights: number[]
): number[] {
  if (!Array.isArray(weights) || weights.length === 0) {
    return [];
  }

  const safeTotal = Math.max(0, Math.round(Number(totalCents) || 0));
  const cleanWeights = weights.map((w) =>
    Number.isFinite(Number(w)) && Number(w) > 0 ? Number(w) : 0
  );
  const totalWeight = cleanWeights.reduce((acc, w) => acc + w, 0);

  if (safeTotal <= 0 || totalWeight <= 0) {
    return new Array(weights.length).fill(0);
  }

  const floorCents = cleanWeights.map((w) =>
    Math.floor((safeTotal * w) / totalWeight)
  );
  const currentSum = floorCents.reduce((acc, c) => acc + c, 0);
  let remainder = safeTotal - currentSum;

  const result = [...floorCents];
  for (let i = 0; i < result.length && remainder > 0; i++) {
    if (cleanWeights[i] > 0) {
      result[i] += 1;
      remainder -= 1;
    }
  }

  return result;
}

/**
 * Calcula os splits de um item para os participantes conforme o preset selecionado,
 * garantindo soma exata em centavos (sum(amountDue) === totalValue).
 */
export function calculatePresetSplits(
  totalValue: number,
  users: SplitParticipantInput[],
  preset: SplitPreset | string,
  targetUserIdFor100?: string
): CalculatedSplit[] {
  if (!Array.isArray(users) || users.length === 0) {
    return [];
  }

  const totalCents = Math.max(0, toCents(totalValue));
  let weights: number[] = new Array(users.length).fill(0);

  if (preset === "50/50") {
    if (users.length === 1) {
      weights[0] = 100;
    } else {
      weights[0] = 50;
      weights[1] = 50;
    }
  } else if (preset === "60/40") {
    if (users.length === 1) {
      weights[0] = 100;
    } else {
      weights[0] = 60;
      weights[1] = 40;
    }
  } else if (preset === "70/30") {
    if (users.length === 1) {
      weights[0] = 100;
    } else {
      weights[0] = 70;
      weights[1] = 30;
    }
  } else if (preset === "100/0") {
    const targetIdx = targetUserIdFor100
      ? users.findIndex((u) => u.userId === targetUserIdFor100)
      : 0;
    const winnerIdx = targetIdx >= 0 ? targetIdx : 0;
    weights[winnerIdx] = 100;
  } else if (preset === "EQUAL_ALL") {
    weights = users.map(() => 1);
  } else {
    // Fallback para CUSTOM ou modelo desconhecido: divide igual entre os 2 primeiros (ou todos se 1)
    if (users.length === 1) {
      weights[0] = 100;
    } else {
      weights[0] = 50;
      weights[1] = 50;
    }
  }

  const centsPerUser = distributeByWeightsInCents(totalCents, weights);

  return users.map((u, idx) => ({
    userId: u.userId,
    amountDue: fromCents(centsPerUser[idx] ?? 0),
    status: u.role === "ADMIN" ? "PAID" : "PENDING",
  }));
}
