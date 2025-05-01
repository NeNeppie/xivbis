const TANK_CONSTS = {
  role: "tank",
  mainStat: "strength",
  autoStat: "strength",
  autoPotency: 90,
  traitBonus: 1,
  statBlacklist: ["Dexterity", "Intelligence", "Mind", "Piety", "Spell Speed"],
};

const MELEE_CONSTS = {
  role: "melee",
  mainStat: "strength",
  autoStat: "strength",
  autoPotency: 90,
  traitBonus: 1,
  statBlacklist: ["Dexterity", "Intelligence", "Mind", "Piety", "Spell Speed", "Tenacity"],
};

const MELEE_SCOUTING_CONSTS = {
  role: "melee",
  mainStat: "dexterity",
  autoStat: "dexterity",
  autoPotency: 90,
  traitBonus: 1,
  statBlacklist: ["Strength", "Intelligence", "Mind", "Piety", "Spell Speed", "Tenacity"],
};

const RANGED_CONSTS = {
  role: "ranged",
  mainStat: "dexterity",
  autoStat: "dexterity",
  autoPotency: 80,
  traitBonus: 1.2,
  statBlacklist: ["Strength", "Intelligence", "Mind", "Piety", "Spell Speed", "Tenacity"],
};

const CASTER_CONSTS = {
  role: "caster",
  mainStat: "intelligence",
  autoStat: "strength",
  autoPotency: 90,
  traitBonus: 1.3,
  statBlacklist: ["Strength", "Dexterity", "Mind", "Piety", "Skill Speed", "Tenacity"],
};

// Strength is on Caster's and Healer's blacklist because the only way to increase it
//    would be using potions, or extremely old gear.

const HEALER_CONSTS = {
  role: "healer",
  mainStat: "mind",
  autoStat: "strength",
  autoPotency: 90,
  traitBonus: 1.3,
  statBlacklist: ["Strength", "Dexterity", "Intelligence", "Skill Speed", "Tenacity"],
};

export const jobs = {
  PLD: { ...TANK_CONSTS, displayName: "Paladin", statBlacklist: ["Dexterity", "Intelligence", "Mind", "Piety"] },
  WAR: { ...TANK_CONSTS, displayName: "Warrior" },
  DRK: { ...TANK_CONSTS, displayName: "Dark Knight" },
  GNB: { ...TANK_CONSTS, displayName: "Gunbreaker" },

  MNK: { ...MELEE_CONSTS, displayName: "Monk" },
  DRG: { ...MELEE_CONSTS, displayName: "Dragoon" },
  NIN: { ...MELEE_SCOUTING_CONSTS, displayName: "Ninja" },
  SAM: { ...MELEE_CONSTS, displayName: "Samurai" },
  RPR: { ...MELEE_CONSTS, displayName: "Reaper" },
  VPR: { ...MELEE_SCOUTING_CONSTS, displayName: "Viper" },

  BRD: { ...RANGED_CONSTS, displayName: "Bard" },
  MCH: { ...RANGED_CONSTS, displayName: "Machinist" },
  DNC: { ...RANGED_CONSTS, displayName: "Dancer", autoPotency: 90 },

  BLM: { ...CASTER_CONSTS, displayName: "Black Mage" },
  SMN: { ...CASTER_CONSTS, displayName: "Summoner" },
  RDM: { ...CASTER_CONSTS, displayName: "Red Mage" },
  PCT: { ...CASTER_CONSTS, displayName: "Pictomancer" },
  BLU: { ...CASTER_CONSTS, displayName: "Blue Mage", traitBonus: 1.5 },

  WHM: { ...HEALER_CONSTS, displayName: "White Mage" },
  SCH: { ...HEALER_CONSTS, displayName: "Scholar" },
  AST: { ...HEALER_CONSTS, displayName: "Astrologian" },
  SGE: { ...HEALER_CONSTS, displayName: "Sage" },
};
