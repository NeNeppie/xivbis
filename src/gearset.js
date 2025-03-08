import { calculateBaseDamage, getBaseStats } from "./math-ffxiv.js";
import { sumObjectsByKey } from "./utils/math-utils.js";

export const GearpieceStatDistribution = {
  1: { name: "Mainhand", id: "weapon", percentage: 100 }, // Mainhand (PLD Sword, One-handed WHM and BLM wands)
  2: { name: "Offhand", id: "offhand", percentage: 40 }, // Offhand (PLD Shield (Certain ARR shields are multiclass))
  3: { name: "Head", id: "head", percentage: 85 },
  4: { name: "Body", id: "body", percentage: 135 },
  5: { name: "Hands", id: "hands", percentage: 85 },
  7: { name: "Legs", id: "legs", percentage: 135 },
  8: { name: "Feet", id: "feet", percentage: 85 },
  9: { name: "Ears", id: "ears", percentage: 67 },
  10: { name: "Neck", id: "neck", percentage: 67 },
  11: { name: "Wrists", id: "wrists", percentage: 67 },
  12: { name: "Ring", id: "ring", percentage: 67 },
  13: { name: "Mainhand", id: "weapon", percentage: 140 }, // Mainhand && !Offhand (All jobs)
  15: { name: "Head + Body", id: "body", percentage: 220 }, // Head + Body (e.g. Eureka Caster Robe)
  16: { name: "Suit", id: "body", percentage: 440 }, // All but Head (ARR Suits, Mogstation pieces)
  18: { name: "Legs + Feet", id: "legs", percentage: 220 }, // Legs + Feet (VERY few exist)
};

// prettier-ignore
const paramToStatKey = {
  "Vitality":         "vitality",
  "Strength":         "strength",
  "Dexterity":        "dexterity",
  "Intelligence":     "intelligence",
  "Mind":             "mind",
  "Determination":    "determination",
  "Tenacity":         "tenacity",
  "Piety":            "piety",
  "Critical Hit":     "crit",
  "Direct Hit Rate":  "directHit",
  "Skill Speed":      "spdSkill",
  "Spell Speed":      "spdSpell",
  "Physical Damage":  "wdPhys",
  "Magic Damage":     "wdMag",
  "Attack Delay":     "delay",
  "Defense":          "defPhys",
  "Magic Defense":    "defMag",
  // "Block Rate"
  // "Block Strength"
};

// prettier-ignore
export const paramToAbbr = {
  "Vitality":         "VIT",
  "Strength":         "STR",
  "Dexterity":        "DEX",
  "Intelligence":     "INT",
  "Mind":             "MND",
  "Determination":    "DET", 
  "Tenacity":         "TNC",
  "Piety":            "PIE",
  "Critical Hit":     "CRT",
  "Direct Hit Rate":  "DH",
  "Skill Speed":      "SKS",
  "Spell Speed":      "SPS",
  "Physical Damage":  "WD",
  "Magic Damage":     "WD",
  "Defense":          "DEF",
  "Magic Defense":    "DEF",
}

export function convertParamToAbbr(obj) {
  let translated = {};

  for (const [key, value] of Object.entries(obj)) {
    // Keep the higher value, in case of stats which share an abbreviation
    translated[paramToAbbr[key]] = translated[paramToAbbr[key]] > value ? translated[paramToAbbr[key]] : value;
  }
  return translated;
}

export function convertStatKeys(stats, statsHQ) {
  let translated = {};

  for (const [key, value] of Object.entries(paramToStatKey)) {
    translated[value] = stats[key] ?? 0;
  }

  // Passing HQ stats treats the item as its HQ variant.
  if (statsHQ !== undefined) {
    for (const [key, value] of Object.entries(statsHQ)) {
      translated[paramToStatKey[key]] += value;
    }
  }
  return translated;
}

export class Gearset {
  /** @param {number} level @param {string} job */
  constructor(level, job) {
    this.slots = {}; // a really odd solution for infinite recursion
    this.level = level;
    this.job = job;

    ["weapon", "offhand", "head", "body", "hands", "legs", "feet", "ears", "neck", "wrists", "leftring", "rightring"].forEach(
      (property) => {
        Object.defineProperty(this, property, {
          get: function () {
            return this.slots[property];
          },
          set: function (value) {
            this.slots[property] = value;
            this.calculateDamage();
          },
        });
      }
    );
  }

  get stats() {
    let stats = {};
    let slots = Object.getOwnPropertyNames(this).filter((prop) => {
      return !(prop === "slots" || prop === "level" || prop === "job" || prop === "tribe");
    });
    for (const slot of slots) {
      const item = this[slot];
      if (item == null) {
        continue;
      }
      stats = sumObjectsByKey(stats, item.stats, item.statsHQ);
    }
    return sumObjectsByKey(stats, getBaseStats(this.level, this.job, this.tribe ?? "default"));
  }

  calculateDamage() {
    const elemStats = document.getElementById("item-stats");
    const elemDamage = document.getElementById("item-dmg");
    const configLevel = document.getElementById("config-level").value;

    const stats = this.stats;
    elemStats.innerHTML = "";
    for (const [key, value] of Object.entries(stats)) {
      elemStats.innerHTML += `    ${key}: ${value}<br/>`;
    }

    if (configLevel !== this.level) {
      this.level = configLevel;
    }
    elemDamage.innerHTML = `${calculateBaseDamage(this.level, this.job, convertStatKeys(stats))}`;
  }
}

export class GearItem {
  constructor(item) {
    const equipmentID = item.EquipSlotCategory.value;
    // Soulstone filter
    if (equipmentID === 17) {
      throw Error(
        `Couldn't create GearItem from xivapi entry '${item.Name}: Item is a Soulstone. EquipSlotCategory=${equipmentID}`
      );
    }
    this.id = item.ID;
    this.name = item.Name;
    this.iconPath = item.Icon.path_hr1;
    this.equipLevel = item.LevelEquip;
    this.itemLevel = item.LevelItem.value;

    this.materiaSlots = item.MateriaSlotCount;
    this.canBePentamelded = item.IsAdvancedMeldingPermitted;
    this.canBeHQ = item.CanBeHq;
    this.isUnique = item.IsUnique;
    this.gearTypeName = GearpieceStatDistribution[equipmentID].name;
    this.gearTypeID = GearpieceStatDistribution[equipmentID].id;
    this.gearJob = item.ClassJobCategory.fields.Name.split(" ");

    ({ stats: this.stats, statsHQ: this.statsHQ } = GearItem.#assignStats(item));
  }

  static #assignStats(item) {
    let stats = {};
    let statsHQ = {};
    for (let i = 0; i < 5; i++) {
      const param = item.BaseParam[i];
      const paramValue = item.BaseParamValue[i];

      if (param.fields.Name) {
        stats[param.fields.Name] = paramValue;
      }
    }

    switch (item.EquipSlotCategory.value) {
      case 1:
      case 13:
        stats["Physical Damage"] = item.DamagePhys;
        stats["Magic Damage"] = item.DamageMag;
        stats["Attack Delay"] = item.Delayms;
        break;
      case 2:
        stats["Block Strength"] = item.Block;
        stats["Block Rate"] = item.BlockRate;
        break;
      default:
        stats["Defense"] = item.DefensePhys;
        stats["Magic Defense"] = item.DefenseMag;
        break;
    }

    if (item.CanBeHq) {
      for (let i = 0; i < 6; i++) {
        const paramSpecial = item.BaseParamSpecial[i];
        const paramValueSpecial = item.BaseParamValueSpecial[i];

        if (paramSpecial !== undefined && paramSpecial.row_id !== undefined) {
          statsHQ[paramSpecial.fields.Name] = paramValueSpecial;
        }
      }
      return { stats: stats, statsHQ: statsHQ };
    }
    return { stats };
  }
}
