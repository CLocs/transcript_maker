import type { TranscriptBlock } from "../../types";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(text: string): string[] {
  const normalized = normalize(text);
  if (!normalized) return [];
  return normalized.split(" ").filter((word) => word.length > 1);
}

export type MatchResult = {
  blockIndex: number;
  score: number;
};

/**
 * Score heard speech against transcript blocks (word overlap + optional position prior).
 */
export function findBestTranscriptMatch(
  heard: string,
  blocks: TranscriptBlock[],
  options?: { priorIndex?: number; priorWeight?: number },
): MatchResult | null {
  const heardTokens = tokens(heard);
  if (heardTokens.length === 0 || blocks.length === 0) return null;

  const heardSet = new Set(heardTokens);
  const priorIndex = options?.priorIndex;
  const priorWeight = options?.priorWeight ?? 0.15;

  let best: MatchResult | null = null;

  for (let index = 0; index < blocks.length; index++) {
    const block = blocks[index];
    if (!block) continue;
    const blockTokens = tokens(block.text);
    if (blockTokens.length === 0) continue;

    let overlap = 0;
    for (const word of blockTokens) {
      if (heardSet.has(word)) overlap += 1;
    }

    // Prefer denser overlap relative to the shorter of the two windows
    const denom = Math.min(heardTokens.length, blockTokens.length);
    let score = denom > 0 ? overlap / denom : 0;

    // Bonus if a multi-word phrase from the block appears in heard text
    const blockNorm = normalize(block.text);
    const heardNorm = normalize(heard);
    if (blockNorm.length >= 12 && heardNorm.includes(blockNorm.slice(0, Math.min(40, blockNorm.length)))) {
      score += 0.35;
    }

    if (typeof priorIndex === "number" && Number.isFinite(priorIndex)) {
      const distance = Math.abs(index - priorIndex);
      score += priorWeight / (1 + distance / 8);
    }

    if (!best || score > best.score) {
      best = { blockIndex: index, score };
    }
  }

  if (!best || best.score < 0.2) return null;
  return best;
}
