import { jobs } from "./constants/job-consts.js";
import { calculateDamage, getBaseStats } from "./math-ffxiv.js";
import { constructJobSpecificSimulator } from "./simulator/simulator-constructor.js";
import { rnd, sumObjectsByKey } from "./utils/math-utils.js";
import { convertStatKeys } from "./utils/param-utils.js";

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
}; // High = percentage. Low = rnd(percentage * 0.7)

export class Gearset {
  #statsCached = undefined;
  #refreshOnSet = true;

  /** @param {number} level @param {string} jobCode */
  constructor(level, jobCode, runSimsOnRefresh = true) {
    this.slots = {}; // a really odd solution for infinite recursion
    this.level = level;
    this.jobCode = jobCode;
    this.job = jobs[jobCode];
    this.runSimsOnRefresh = runSimsOnRefresh;

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
          this.simulator.simulate([], 60, 0, true, true, true);
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
      stats = sumObjectsByKey(stats, item.stats);
    }
    return sumObjectsByKey(stats, getBaseStats(this.level, this.jobCode, this.tribe ?? "default"));
  }

  #refresh() {
    this.#statsCached = convertStatKeys(this.#computeStats());
    if (this.runSimsOnRefresh) {
      for (const sim of this.simulations) {
        sim.run();
      }
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
    this.slotStatPercentage = GearpieceStatDistribution[equipmentID].percentage;
    this.gearJob = item.ClassJobCategory.fields.Name.split(" ");

    this.stats = GearItem.#extractStats(item);
  }

  static syncItemStats(item, ilvlSyncParams, ilvl) {
    if (typeof ilvlSyncParams[ilvl] === "undefined") return;

    const statSyncValues = ilvlSyncParams[ilvl];
    for (const stat in item.stats) {
      if (Object.hasOwn(statSyncValues, stat)) {
        const cap = rnd(statSyncValues[stat] * 0.001 * item.slotStatPercentage);
        item.stats[stat] = Math.min(cap, item.stats[stat]);
      }
    }
  }

  // TODO: convert from base to key immediately instead of on gearset assignment
  static #extractStats(itemRaw) {
    let stats = {};
    for (let i = 0; i < 5; i++) {
      const param = itemRaw.BaseParam[i];
      const paramValue = itemRaw.BaseParamValue[i];

      if (param.fields.Name) {
        stats[param.fields.Name] = paramValue;
      }
    }

    switch (itemRaw.EquipSlotCategory.value) {
      case 1:
      case 13:
        stats["Physical Damage"] = itemRaw.DamagePhys;
        stats["Magical Damage"] = itemRaw.DamageMag;
        stats["Attack Delay"] = itemRaw.Delayms;
        break;
      case 2:
        stats["Block Strength"] = itemRaw.Block;
        stats["Block Rate"] = itemRaw.BlockRate;
        break;
      default:
        stats["Defense"] = itemRaw.DefensePhys;
        stats["Magic Defense"] = itemRaw.DefenseMag;
        break;
    }

    // Items with HQ variants are treated as HQ
    if (itemRaw.CanBeHq) {
      for (let i = 0; i < 6; i++) {
        const paramSpecial = itemRaw.BaseParamSpecial[i];
        const paramValueSpecial = itemRaw.BaseParamValueSpecial[i];

        if (paramSpecial !== undefined && paramSpecial.row_id !== undefined) {
          if (paramSpecial.fields.Name === "Magic Damage") {
            paramSpecial.fields.Name = "Magical Damage";
          }
          stats[paramSpecial.fields.Name] += paramValueSpecial;
        }
      }
    }
    return stats;
  }
}
