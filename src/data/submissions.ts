// Submission card maps: which cards (by GradingCard id) belong to each PSA
// submission and how many copies of each. Editable in the UI — these are the
// defaults; user edits are persisted to localStorage by PortfolioContext.
export type SubmissionMaps = Record<number, Record<number, number>>;

export const defaultSubmissionMaps: SubmissionMaps = {
  1: {
    1: 4, 2: 2, 3: 2, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1,
    9: 1, 10: 1, 11: 1, 12: 1, 13: 1, 14: 1, 15: 1, 16: 1, 17: 1, 18: 1, 19: 1, 20: 1,
  },
  // Sub 2 originally had Shanks (id 24) and 3x McDonalds Pikachu (id 2) — both
  // moved to keepers in singles. Their grading cost still counts via keeperCost
  // added to totals.invested. McDonalds dropped from 3 → 2 (1 kept); Shanks removed.
  2: {
    1: 4, 2: 2, 3: 1, 4: 2, 5: 1, 6: 1, 7: 1,
    21: 1, 22: 1, 23: 1, 25: 1, 26: 1, 27: 1, 28: 1, 29: 1, 30: 1,
  },
  // id 31 split: 10 sellable + 1 keeper (id 36). id 34 (Naruto) is a whole keeper.
  // Keepers stay in the map so their grading cost still counts toward Sub 3.
  3: { 31: 10, 36: 1, 32: 1, 33: 10, 34: 1 },
  // Sub 4 — Submission #14972306 (Value Bulk, submitted 5/28/26)
  4: {
    37: 20, 38: 1, 39: 1, 40: 1, 41: 1, 42: 1, 43: 1, 44: 1, 45: 1, 46: 6,
    47: 1, 48: 1, 49: 1, 50: 1, 51: 1, 52: 1, 53: 7, 54: 1, 55: 1, 56: 1,
  },
  // Subs 5A/5B — Chinese Pokemon, split from the original 40-card Sub 5.
  // Multi-copy lots are split across both subs (grader-variance hedge) and the
  // big singles sit on opposite sides so each package carries similar value.
  // v23–v26: damaged/print-line cards pulled from the original 40-card batch
  // (3× Gengar 58, 2× Meowth 65, 2× Ponyta 66, 1× Pikachu Group 62).
  // v27: seller refunded $60 on the Meowths — both go back in ($84.41/card
  // avg cost). v28: both Gengars actually shipped in 5A, and 2 Ponytas were
  // never delivered (pulled from 5B) → 32 cards, split 18/14.
  // Sub 5A — anchored by Pikachu Gengar AR (57); shipped as packed
  5: { 57: 1, 58: 2, 61: 2, 62: 1, 63: 4, 65: 4, 66: 4 },
  // Sub 5B — anchored by Pikachu Psyduck (59), Magearna (60), Dodgers Luffy (67)
  6: { 59: 1, 60: 1, 61: 1, 62: 1, 63: 3, 65: 3, 66: 3, 67: 1 },
};
