// Example for "dmg up" buff. (x * amount) + amount
export const buffPowerSurge = {
  name: "Power Surge",
  type: "damage",
  description: "Increases Damage dealt by 10%",
  amount: 0.1,
  duration: 30,
  uses: -1,
};

export const buffLanceCharge = {
  name: "Lance Charge",
  type: "damage",
  description: "Increases Damage dealt by 10%",
  amount: 0.1,
  duration: 20,
  uses: -1,
};

// NOTE: Special edge case: Life of the Dragon also allows execution of Stardiver AND Starcross. Both expire when this one does
//       At low levels this buff is "Blood of the Dragon", granting the same(?) damage bonus without the additional effects
export const buffLifeDragon = {
  name: "Life of the Dragon",
  type: "damage",
  description: "Increases Damage dealt by 15%",
  amount: 0.15,
  duration: 20,
  uses: -1,
};

// Example for "crit rate up" buff. (x * amount) + amount
export const buffBattleLitany = {
  name: "Battle Litany",
  type: "crit",
  description: "Increases Critical Hit Rate by 10%",
  amount: 0.1,
  duration: 20,
  uses: -1,
};

// Example for "auto crit" buff. MCH and WAR have "auto direct crit", need to futureproof that.
export const buffLifeSurge = {
  name: "Life Surge",
  type: "crit",
  description: "Guarantees a Critical hit on following Weaponskill",
  amount: 1, // -1 to signify guarantee?
  duration: 5,
  uses: 1,
};

// Example for "action enabler" buff. Amount is irrelevant here but kept for consistency
export const buffRaidenThrust = {
  name: "Draconian Fire",
  type: "action",
  description: "Allows execution of `Raiden Thrust`",
  amount: 1,
  duration: 30,
  uses: 1,
};

export const buffDiveReady = {
  name: "Dive Ready",
  type: "action",
  description: "Allows execution of `Mirage Dive`",
  amount: 1,
  duration: 15,
  uses: 1,
};

export const buffDragonsFlight = {
  name: "Dragon's Flight",
  type: "action",
  description: "Allows execution of `Rise of the Dragon`",
  amount: 1,
  duration: 30,
  uses: 1,
};

export const buffNastrondReady = {
  name: "Nastrond Ready",
  type: "action",
  description: "Allows execution of `Nastrond`",
  amount: 1,
  duration: 20,
  uses: 1,
};

// NOTE: See above. Effect expires when Life of the Dragon does as well.
export const buffStarcrossReady = {
  name: "Starcross Ready",
  type: "action",
  description: "Allows execution of `Starcross`",
  amount: 1,
  duration: 20,
  uses: 1,
};

// Example for "action enhanced" buff. Should Amount refer to the increased potency? NOTE: This one's problematic
export const buffEnhancedPiercingTalon = {
  name: "Enhanced Piercing Talon",
  type: "action",
  description: "Increases potency of `Piercing Talon`",
  amount: 1, // enhanced potency: 350
  duration: 15,
  uses: 1,
};
