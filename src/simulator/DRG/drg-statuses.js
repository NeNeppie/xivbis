// Example for "dmg up" buff. (x * amount) + amount
export const PowerSurge = {
  name: "Power Surge",
  id: 210303,
  type: "buff",
  description: "Increases Damage dealt by 10%",
  effect: { damage: 0.1 },
  duration: 30,
};

export const LanceCharge = {
  name: "Lance Charge",
  id: 210304,
  type: "buff",
  description: "Increases Damage dealt by 10%",
  effect: { damage: 0.1 },
  duration: 20,
};

// NOTE: Special edge case: Life of the Dragon also allows execution of Stardiver AND Starcross. Both expire when this one does
//       At low levels this buff is "Blood of the Dragon", granting the same(?) damage bonus without the additional effects
export const LifeDragon = {
  name: "Life of the Dragon",
  id: 214935,
  type: "buff",
  description: "Increases Damage dealt by 15%",
  effect: { damage: 0.15 },
  duration: 20,
};

// Example for "crit rate up" buff. (x * amount) + amount
export const BattleLitany = {
  name: "Battle Litany",
  id: 212578,
  type: "buff",
  description: "Increases Critical Hit Rate by 10%",
  effect: { crit: 0.1 },
  duration: 20,
};

// Example for "auto crit" buff. MCH and WAR have "auto direct crit", need to futureproof that.
export const LifeSurge = {
  name: "Life Surge",
  id: 210302,
  type: "buff",
  description: "Guarantees a Critical Hit on following Weaponskill",
  effect: { autocrit: true },
  duration: 5,
  stacks: 1,
  usedOn: (action) => {
    return action.type === "weaponskill";
  },
};

// Example for "action enabler" buff.
export const RaidenThrust = {
  name: "Draconian Fire",
  type: "action",
  description: "Allows execution of `Raiden Thrust`",
  duration: 30,
  stacks: 1,
  usedOn: (action) => {
    return action.name === "Raiden Thrust";
  },
};

export const DiveReady = {
  name: "Dive Ready",
  type: "action",
  description: "Allows execution of `Mirage Dive`",
  duration: 15,
  stacks: 1,
  usedOn: (action) => {
    return action.name === "Mirage Dive";
  },
};

export const DragonsFlight = {
  name: "Dragon's Flight",
  type: "action",
  description: "Allows execution of `Rise of the Dragon`",
  duration: 30,
  stacks: 1,
  usedOn: (action) => {
    return action.name === "Rise of the Dragon";
  },
};

export const NastrondReady = {
  name: "Nastrond Ready",
  type: "action",
  description: "Allows execution of `Nastrond`",
  duration: 20,
  stacks: 1,
  usedOn: (action) => {
    return action.name === "Nastrond";
  },
};

// NOTE: See above. Effect expires when Life of the Dragon does as well.
export const StarcrossReady = {
  name: "Starcross Ready",
  type: "action",
  description: "Allows execution of `Starcross`",
  duration: 20,
  stacks: 1,
  usedOn: (action) => {
    return action.name === "Starcross";
  },
};

// Example for "action enhanced" buff. `onUse` method should modify the affected action.
export const EnhancedPiercingTalon = {
  name: "Enhanced Piercing Talon",
  type: "action",
  description: "Increases potency of `Piercing Talon`", // 350
  duration: 15,
  stacks: 1,
  usedOn: (action) => {
    return action.name === "Piercing Talon";
  },
  onUse: (action) => {
    action.potency = 350;
  },
};
