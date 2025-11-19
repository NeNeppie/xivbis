import { jobs } from "./constants/job-consts.js";
import { calculateDamage, getBaseStats } from "./math-ffxiv.js";
import { constructJobSpecificSimulator } from "./simulator/simulator-constructor.js";
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
const paramConvertMap = {
  "Vitality":         {code: "VIT", key: "vitality"},
  "Strength":         {code: "STR", key: "strength"},
  "Dexterity":        {code: "DEX", key: "dexterity"},
  "Intelligence":     {code: "INT", key: "intelligence"},
  "Mind":             {code: "MND", key: "mind"},
  "Determination":    {code: "DET", key: "determination"},
  "Tenacity":         {code: "TNC", key: "tenacity"},
  "Piety":            {code: "PIE", key: "piety"},
  "Critical Hit":     {code: "CRT", key: "crit"},
  "Direct Hit Rate":  {code: "DH",  key: "directHit"},
  "Skill Speed":      {code: "SKS", key: "spdSkill"},
  "Spell Speed":      {code: "SPS", key: "spdSpell"},
  "Physical Damage":  {code: "WD",  key: "wdPhys"},
  "Magic Damage":     {code: "WD",  key: "wdMag"},
  "Attack Delay":     {code: "AA",  key: "delay"},
  "Defense":          {code: "DEF", key: "defPhys"},
  "Magic Defense":    {code: "DEF", key: "defMag"},
  // "Block Rate",
  // "Block Strength",
};

export function convertParamToAbbr(obj) {
  let translated = {};

  for (const [key, value] of Object.entries(obj)) {
    // Keep the higher value, in case of stats which share an abbreviation
    translated[paramConvertMap[key].code] =
      translated[paramConvertMap[key].code] > value ? translated[paramConvertMap[key].code] : value;
  }
  return translated;
}

export function convertParamToAbbrSingle(paramKey) {
  return paramConvertMap[paramKey].code;
}

export function convertStatKeys(stats, statsHQ) {
  let translated = {};

  for (const [key, value] of Object.entries(paramConvertMap)) {
    translated[value.key] = stats[key] ?? 0;
  }

  // Passing HQ stats treats the item as its HQ variant.
  if (statsHQ !== undefined) {
    for (const [key, value] of Object.entries(statsHQ)) {
      translated[paramConvertMap[key].key] += value;
    }
  }
  return translated;
}

export class Gearset {
  #statsCached = undefined;
  #refreshOnSet = true;

  /** @param {number} level @param {string} jobCode */
  constructor(level, jobCode) {
    this.slots = {}; // a really odd solution for infinite recursion
    this.level = level;
    this.jobCode = jobCode;
    this.job = jobs[jobCode];

    ["weapon", "offhand", "head", "body", "hands", "legs", "feet", "ears", "neck", "wrists", "leftring", "rightring"].forEach(
      (property) => {
        Object.defineProperty(this, property, {
          get: function () {
            return this.slots[property];
          },
          set: function (value) {
            this.slots[property] = value;
            if (this.#refreshOnSet) {
              this.#refresh();
            }
          },
        });
      }
    );

    this.simulations = [
      {
        name: "100p",
        simulation: () => {
          // NOTE: Some jobs prefer Magical damage for their benchmarks
          return calculateDamage(this.level, this.jobCode, this.stats, 100, "physical");
        },
        run: function () {
          this.data = this.simulation();
          this.dps = this.data;
        },
        data: null,
        dps: null,
      },
      // TODO: Ability to add/remove simulator instances and modify them
      {
        name: "standard",
        simulator: constructJobSpecificSimulator(this, this.jobCode),
        run: function () {
          this.simulator.reset();
          this.simulator.simulate([], 60, 0, true, true);
          this.data = this.simulator.results;
          this.dps = this.data.dps;
        },
        data: null,
        dps: null,
      },
    ];
  }

  get stats() {
    if (!this.#statsCached) {
      this.#statsCached = convertStatKeys(this.#computeStats());
    }
    return this.#statsCached;
  }

  equipMultiple(items) {
    const tempRefreshFlag = this.#refreshOnSet;
    this.#refreshOnSet = false;
    for (const item of items) {
      if (Object.hasOwn(this, item.gearTypeID) && this[item.gearTypeID]?.id !== item.id) {
        this[item.gearTypeID] = item;
      }
    }
    this.#refresh();
    this.#refreshOnSet = tempRefreshFlag;
  }

  #computeStats() {
    let stats = {};
    let slots = Object.getOwnPropertyNames(this).filter((prop) => {
      return !(prop === "slots" || prop === "level" || prop === "jobCode" || prop === "job" || prop === "tribe");
    });
    for (const slot of slots) {
      const item = this[slot];
      if (item == null) {
        continue;
      }
      // If an item has HQ stats, they're combined as well.
      stats = sumObjectsByKey(stats, item.stats, item.statsHQ);
    }
    return sumObjectsByKey(stats, getBaseStats(this.level, this.jobCode, this.tribe ?? "default"));
  }

  #refresh() {
    this.#statsCached = convertStatKeys(this.#computeStats());
    for (const sim of this.simulations) {
      sim.run();
    }
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

    ({ stats: this.stats, statsHQ: this.statsHQ } = GearItem.#extractStats(item));
  }

  static #extractStats(item) {
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
