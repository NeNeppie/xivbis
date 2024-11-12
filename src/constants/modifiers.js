// Wacky data structure. Should be fixed in the future
export const tribalStats = {
  default: { tribe: "Default", Race: "Default", strength: 0, dexterity: 0, vitality: 0, intelligence: 0, mind: 0 },
  highlander: { tribe: "Highlander", Race: "Hyur", strength: 3, dexterity: 0, vitality: 2, intelligence: -2, mind: 0 },
  midlander: { tribe: "Midlander", Race: "Hyur", strength: 2, dexterity: -1, vitality: 0, intelligence: 3, mind: -1 },
  duskwight: { tribe: "Duskwight", Race: "Elezen", strength: 0, dexterity: 0, vitality: -1, intelligence: 3, mind: 1 },
  wildwood: { tribe: "Wildwood", Race: "Elezen", strength: 0, dexterity: 3, vitality: -1, intelligence: 2, mind: -1 },
  plainsfolk: { tribe: "Plainsfolk", Race: "Hyur", strength: -1, dexterity: 3, vitality: -1, intelligence: 2, mind: 0 },
  dunesfolk: { tribe: "Dunesfolk", Race: "Hyur", strength: -1, dexterity: 1, vitality: -2, intelligence: 2, mind: 3 },
  seekers: { tribe: "Seekers of the Sun", Race: "Hyur", strength: 2, dexterity: 3, vitality: 0, intelligence: -1, mind: -1 },
  keepers: { tribe: "Keepers of the Moon", Race: "Hyur", strength: -1, dexterity: 2, vitality: -2, intelligence: 1, mind: 3 },
  seawolves: { tribe: "Sea Wolves", Race: "Roegadyn", strength: 2, dexterity: -1, vitality: 3, intelligence: -2, mind: 1 },
  hellsguard: { tribe: "Hellsguard", Race: "Roegadyn", strength: 0, dexterity: -2, vitality: 2, intelligence: 0, mind: 2 },
  raen: { tribe: "Raen", Race: "Au Ra", strength: -1, dexterity: 2, vitality: -1, intelligence: 0, mind: 3 },
  xaela: { tribe: "Xaela", Race: "Au Ra", strength: 3, dexterity: 0, vitality: 2, intelligence: 0, mind: -2 },
  rava: { tribe: "Rava", Race: "Viera", strength: 0, dexterity: 3, vitality: -2, intelligence: 1, mind: 1 },
  veena: { tribe: "Veena", Race: "Viera", strength: -1, dexterity: 0, vitality: -1, intelligence: 3, mind: 2 },
  helions: { tribe: "Helions", Race: "Hrothgar", strength: 3, dexterity: -3, vitality: 3, intelligence: -3, mind: 3 },
  lost: { tribe: "The Lost", Race: "Hrothgar", strength: 3, dexterity: -3, vitality: 3, intelligence: -3, mind: 3 },
};

export const jobModifiers = {
  PLD: { health: 1.4, vitality: 1.1, strength: 1.0, dexterity: 0.95, intelligence: 0.6, mind: 1.0 },
  WAR: { health: 1.45, vitality: 1.1, strength: 1.05, dexterity: 0.95, intelligence: 0.4, mind: 0.55 },
  DRK: { health: 1.4, vitality: 1.1, strength: 1.05, dexterity: 0.95, intelligence: 0.6, mind: 0.4 },
  GNB: { health: 1.4, vitality: 1.1, strength: 1.0, dexterity: 0.95, intelligence: 0.6, mind: 1.0 },

  MNK: { health: 1.1, vitality: 1.0, strength: 1.1, dexterity: 1.05, intelligence: 0.5, mind: 0.9 },
  DRG: { health: 1.15, vitality: 1.05, strength: 1.15, dexterity: 1.0, intelligence: 0.45, mind: 0.65 },
  NIN: { health: 1.08, vitality: 1.0, strength: 0.85, dexterity: 1.1, intelligence: 0.65, mind: 0.75 },
  SAM: { health: 1.09, vitality: 1.0, strength: 1.12, dexterity: 1.08, intelligence: 0.6, mind: 0.5 },
  RPR: { health: 1.15, vitality: 1.05, strength: 1.15, dexterity: 1.0, intelligence: 0.8, mind: 0.4 },
  VPR: { health: 1.11, vitality: 1.0, strength: 1.0, dexterity: 1.1, intelligence: 0.45, mind: 0.55 },

  BRD: { health: 1.05, vitality: 1.0, strength: 0.9, dexterity: 1.15, intelligence: 0.85, mind: 0.8 },
  MCH: { health: 1.05, vitality: 1.0, strength: 0.85, dexterity: 1.15, intelligence: 0.8, mind: 0.85 },
  DNC: { health: 1.05, vitality: 1.0, strength: 0.9, dexterity: 1.15, intelligence: 0.85, mind: 0.8 },

  BLM: { health: 1.05, vitality: 1.0, strength: 0.45, dexterity: 1.0, intelligence: 1.15, mind: 0.75 },
  SMN: { health: 1.05, vitality: 1.0, strength: 0.9, dexterity: 1.0, intelligence: 1.15, mind: 0.8 },
  RDM: { health: 1.05, vitality: 1.0, strength: 0.55, dexterity: 1.05, intelligence: 1.15, mind: 1.1 },
  PCT: { health: 1.05, vitality: 1.0, strength: 0.5, dexterity: 1.1, intelligence: 1.15, mind: 0.8 },
  BLU: { health: 1.05, vitality: 1.0, strength: 0.7, dexterity: 1.1, intelligence: 1.15, mind: 1.05 },

  WHM: { health: 1.05, vitality: 1.0, strength: 0.55, dexterity: 1.05, intelligence: 1.05, mind: 1.15 },
  SCH: { health: 1.05, vitality: 1.0, strength: 0.9, dexterity: 1.0, intelligence: 1.05, mind: 1.15 },
  AST: { health: 1.05, vitality: 1.0, strength: 0.5, dexterity: 1.0, intelligence: 1.05, mind: 1.15 },
  SGE: { health: 1.05, vitality: 1.0, strength: 0.6, dexterity: 1.0, intelligence: 1.05, mind: 1.15 },
};

// prettier-ignore
export const levelModifiers = {
  50:  { main: 202, sub: 341, div: 341,  HP: 1400, mhpNormal: 11.2, mhpTank: 15.5 },
  60:  { main: 218, sub: 354, div: 600,  HP: 1500, mhpNormal: 12.9, mhpTank: 17.5},
  70:  { main: 292, sub: 364, div: 900,  HP: 1700, mhpNormal: 14,   mhpTank: 18.8 },
  80:  { main: 340, sub: 380, div: 1300, HP: 2000, mhpNormal: 18.8, mhpTank: 26.6 },
  90:  { main: 390, sub: 400, div: 1900, HP: 3000, mhpNormal: 24.3, mhpTank: 34.6 },
  100: { main: 440, sub: 420, div: 2780, HP: 4000, mhpNormal: 30.1, mhpTank: 43 },
};
