/**
 * Customer avatars — a fixed catalogue, not random pictures.
 *
 * An avatar is chosen from four tiers, and the tier is *readable from the
 * picture*: staff should be able to glance at a row and know what kind of
 * customer it is. That only works if the tier's look is constant, so within a
 * tier the clothes, colour, eyes and mouth are pinned and only hair, hair
 * colour and skin vary — enough to tell two people apart, not enough to blur
 * the tier they belong to.
 *
 * The tier lives inside the stored id (`royal-f2`), so no second column is
 * needed and `avatarTier()` can recover it for filtering or a text label.
 *
 * Rendered locally from the DiceBear packages — no network call, no API key,
 * so it behaves the same in Server and Client Components.
 */

import { Avatar, Style } from "@dicebear/core";
import personas from "@dicebear/styles/personas.json" with { type: "json" };

// Validating a style definition isn't free — build it once and reuse it.
const style = new Style(personas);

export const AVATAR_TIER_KEYS = [
  "normal",
  "royal",
  "reseller",
  "watch",
] as const;

export type AvatarTier = (typeof AVATAR_TIER_KEYS)[number];

/**
 * Tab copy. Every tier ships a text label — the picture is a fast cue, never
 * the only one, the same rule delivery status follows in lib/orders.ts.
 */
export const AVATAR_TIERS: Record<
  AvatarTier,
  { label: string; description: string }
> = {
  normal: {
    label: "Normal",
    description: "A regular customer.",
  },
  royal: {
    label: "Royal",
    description: "Buys often, worth keeping close.",
  },
  reseller: {
    label: "Reseller",
    description: "Buys in bulk to sell on.",
  },
  watch: {
    label: "Watch",
    description: "Has refused or missed a delivery before.",
  },
};

/**
 * What makes a tier recognisable. Fixed for every avatar in the tier.
 *
 * Watch is red, which the theme otherwise reserves for destructive UI — it is
 * safe here because it is a shirt inside an illustration rather than a button
 * or a status pill, and because the frown and closed eyes carry the same
 * meaning by form. See the red note in CLAUDE.md.
 */
const TIER_LOOK = {
  normal: {
    clothesVariant: "rounded",
    clothingColor: "#456dff",
    eyesVariant: "open",
    mouthVariant: "smile",
  },
  royal: {
    clothesVariant: "squared",
    clothingColor: "#7555ca",
    eyesVariant: "sunglasses",
    mouthVariant: "bigSmile",
  },
  reseller: {
    clothesVariant: "checkered",
    clothingColor: "#f3b63a",
    eyesVariant: "glasses",
    mouthVariant: "smirk",
  },
  watch: {
    clothesVariant: "small",
    clothingColor: "#e24553",
    eyesVariant: "sleep",
    mouthVariant: "frown",
  },
} as const;

/**
 * The people in each tier. Hair is what separates them, and what reads as
 * female or male — personas has no gender flag, so the hairstyle is the cue.
 * Hair colours stay dark because RALLA's customers are Burmese.
 */
const FEMALE = [
  { hairVariant: "bobCut", hairColor: "#362c47", skinColor: "#eeb4a4" },
  { hairVariant: "long", hairColor: "#362c47", skinColor: "#e5a07e" },
  { hairVariant: "pigtails", hairColor: "#6c4545", skinColor: "#d78774" },
  { hairVariant: "straightBun", hairColor: "#362c47", skinColor: "#b16a5b" },
] as const;

const MALE = [
  { hairVariant: "buzzcut", hairColor: "#362c47", skinColor: "#eeb4a4" },
  { hairVariant: "fade", hairColor: "#362c47", skinColor: "#e5a07e" },
  { hairVariant: "shortCombover", hairColor: "#6c4545", skinColor: "#d78774" },
  { hairVariant: "curlyHighTop", hairColor: "#362c47", skinColor: "#b16a5b" },
] as const;

/** Two of the four men wear facial hair, so the row doesn't read as unisex. */
const MALE_FACIAL_HAIR = ["", "shadow", "", "goatee"] as const;

export type AvatarGender = "f" | "m";

export type ParsedAvatarId = {
  tier: AvatarTier;
  gender: AvatarGender;
  /** 1-based, matching the id staff never see but developers read in the DB. */
  index: number;
};

const ID_PATTERN = /^([a-z]+)-([fm])([1-4])$/;

/**
 * Reads `royal-f2` back into its parts. Returns null for anything unknown, so
 * a hand-edited or outdated value falls back to the initials monogram rather
 * than throwing.
 */
export function parseAvatarId(id: string): ParsedAvatarId | null {
  const match = ID_PATTERN.exec(id);
  if (!match) return null;

  const [, tier, gender, index] = match;
  if (!AVATAR_TIER_KEYS.includes(tier as AvatarTier)) return null;

  return {
    tier: tier as AvatarTier,
    gender: gender as AvatarGender,
    index: Number(index),
  };
}

/** The tier a stored avatar belongs to, or null if it isn't a valid id. */
export function avatarTier(id: string | null): AvatarTier | null {
  if (!id) return null;
  return parseAvatarId(id)?.tier ?? null;
}

/** Every avatar in a tier, women first — the order the picker grid shows. */
export function avatarIdsForTier(tier: AvatarTier): string[] {
  return [
    ...FEMALE.map((_, i) => `${tier}-f${i + 1}`),
    ...MALE.map((_, i) => `${tier}-m${i + 1}`),
  ];
}

/**
 * The picture for a catalogue id, as a `data:image/svg+xml` URI.
 *
 * Returns null for an unrecognised id rather than inventing a face, which is
 * what lets CustomerAvatar fall back to initials.
 */
export function avatarDataUri(id: string): string | null {
  const parsed = parseAvatarId(id);
  if (!parsed) return null;

  const { tier, gender, index } = parsed;
  const person = gender === "f" ? FEMALE[index - 1] : MALE[index - 1];
  if (!person) return null;

  const facialHair = gender === "m" ? MALE_FACIAL_HAIR[index - 1] : "";

  return new Avatar(style, {
    // Only salts the SVG's internal element ids, which keeps them unique when
    // a grid renders several avatars at once. The picture comes from the
    // options below, so it stays the same every time.
    seed: id,
    ...TIER_LOOK[tier],
    ...person,
    noseVariant: gender === "f" ? "smallRound" : "mediumRound",
    ...(facialHair
      ? { facialHairVariant: facialHair, facialHairProbability: 100 }
      : { facialHairProbability: 0 }),
  }).toDataUri();
}
