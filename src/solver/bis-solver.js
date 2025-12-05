import { fetchItemsGearCustom } from "../datamanager.js";
import { GearItem, Gearset } from "../gearset.js";
import { getBaseSubstat, getSpeedStatForGCD } from "../math-ffxiv.js";
import { rand } from "../utils/math-utils.js";

const DEBUG_SLOT_COUNT = 5;
const DEBUG_SLOT_ARRAY_SIZE = 4;

// DEBUG:
const indexToID = {
  0: "weapon",
  1: "head",
  2: "body",
  3: "hands",
  4: "legs",
  5: "feet",
  6: "ears",
  7: "neck",
  8: "wrists",
  9: "ring",
  10: "offhand",
};

// DEBUG:
const debugIlvlSyncData = {
  730: { Strength: 4359, Determination: 2774, "Critical Hit": 2774, "Direct Hit Rate": 2774, "Skill Speed": 2774 },
  735: { Strength: 4485, Determination: 2807, "Critical Hit": 2807, "Direct Hit Rate": 2807, "Skill Speed": 2807 },
  740: { Strength: 4610, Determination: 2840, "Critical Hit": 2840, "Direct Hit Rate": 2840, "Skill Speed": 2840 },
};

// DEBUG:
function debugRandomiseItems(arrayCount, arrayLength, jobCode) {
  let list = [];
  arrayCount = Math.min(arrayCount, 11);
  for (let i = 0; i < arrayCount; i++) {
    for (let j = 0; j < arrayLength; j++) {
      let stats = {
        Strength: 10 * rand(1, 9) + 100 * rand(1, 4),
        Determination: 10 * rand(1, 9) + 100 * rand(1, 4),
        "Critical Hit": 10 * rand(1, 9) + 100 * rand(1, 4),
      };
      if (rand(1, 10) === 5) {
        stats["Skill Speed"] = 10 * rand(1, 9) + 100 * rand(1, 4);
      }

      if (indexToID[i] === "weapon") {
        stats["Attack Delay"] = 2800;
        stats["Physical Damage"] = 130;
      }

      list.push({
        name: j,
        id: `100${i}${j}`,
        itemLevel: 735,
        gearTypeID: indexToID[i],
        gearJob: [jobCode],
        stats: stats,
        isUnique: indexToID[i] === "ring" ? true : false,
      });
    }
  }
  console.log(`Generated ${list.length} items`);
  return list;
}

export class BestInSlotSolver {
  static #currentSet = {};
  static #currentSetStats = {};
  static #bestRecord = {};

  static #configGearset;
  static #configSimulation;
  static #configJobSpeedStat;

  static #debugTotalIterCount;
  static #debugValidIterCount;
  static #debugCacheHitCount;
  static #debugUniqueHitCount;
  static #debugSpeedHitCount;

  static #ignoreNextIteration;

  static #resetState() {
    this.#currentSet = {};
    this.#currentSetStats = {};
    this.#bestRecord = { dps: { raw: 0, expected: 0 } };

    this.#debugTotalIterCount = 0;
    this.#debugValidIterCount = 0;
    this.#debugCacheHitCount = 0;
    this.#debugUniqueHitCount = 0;
    this.#debugSpeedHitCount = 0;

    this.#ignoreNextIteration = 0;
  }

  static #setUpSolverConfig(level, jobCode, simName) {
    this.#configGearset = new Gearset(level, jobCode, false);
    // TODO: While Sps Paladin is not very practical, I want it to be an option.
    if (["ranged, caster, healer"].includes(this.#configGearset.job.role)) {
      this.#configJobSpeedStat = "Spell Speed";
    } else {
      this.#configJobSpeedStat = "Skill Speed";
    }

    return true;
  }

  static #compareCombinationSpeed(speedStatRange) {
    const speedStat = this.#currentSetStats[this.#configJobSpeedStat] ?? 0;
    if (speedStat < speedStatRange.min || speedStat > speedStatRange.max) {
      return false;
    }
    return true;
  }

  // FIXME: Change redundant gearset stat update?
  static #updateSetStats(item) {
    const prevStats = Object.entries(this.#currentSet[item.gearTypeID]?.stats ?? []);
    for (const [key, value] of prevStats) {
      this.#currentSetStats[key] -= value;
    }
    for (const [key, value] of Object.entries(item.stats)) {
      this.#currentSetStats[key] ??= 0;
      this.#currentSetStats[key] += value;
    }
  }

  // FIXME: DT Relics (equal points for both substats) can be interpreted as two separate keys,
  //    which wrongly allows certain other weapons through the filter (See Phantom vs Veldian spears)
  static makeStatsHashKey(stats) {
    const keys = Object.keys(stats);
    return keys.map((str) => str.substring(0, 5)).join("");
  }

  /** mutates original array */
  static sortByStatPoints(items) {
    return items.sort(
      (b, a) => Object.values(a.stats).reduce((t, e) => t + e, 0) - Object.values(b.stats).reduce((t, e) => t + e, 0)
    );
  }

  /** Eliminates gear that has any speed stat points allocated to it.
   *  For target gcd speeds that forbid speed stats. */
  static eliminateSpeedStatGear(groupedItems) {
    const newItemList = [];
    groupedItems.forEach((list) => {
      const newItemListInner = [];
      for (const item of list) {
        const keys = Object.keys(item.stats);
        if (!keys.includes("Skill Speed") && !keys.includes("Spell Speed")) {
          newItemListInner.push(item);
        }
      }
      newItemList.push(newItemListInner);
    });
    return newItemList;
  }

  /** Removes gear that has lower stat potential within the same gear category
   * Stat potential - base stats of an item, synced down if need be, plus (TODO:) maximum stat points that can be melded into said item
   * For gear above the ilvl sync - 0 meld points. otherwise substruct stats of the two items and find if melds can cover the difference. */
  static eliminateLowStatGear(groupedItems, job, ilvlSync) {
    const newItemList = [];
    for (let items of groupedItems) {
      const newItemListInner = [];
      let statHashTable = {};
      items = this.sortByStatPoints(items);

      for (const item of items) {
        const canMeld = item.itemLevel <= ilvlSync;
        const hashKey = this.makeStatsHashKey(item.stats);

        if (!Object.hasOwn(statHashTable, hashKey)) {
          statHashTable[hashKey] = item.stats;
          newItemListInner.push(item);
          continue;
        }

        const statDifference = {};
        const bestStats = statHashTable[hashKey];
        for (const [key, value] of Object.entries(bestStats)) {
          const difference = value - item.stats[key];
          statDifference[key] = difference;
          if (difference < 0) {
            newItemListInner.push(item);
            break;
          }
        }
      }
      newItemList.push(newItemListInner);
    }
    return newItemList;
  }

  static generateCombinationNew(item, speedStatRange, setSize) {
    const currentSetValues = Object.values(this.#currentSet);
    const ids = currentSetValues.map((i) => i.id);

    if (currentSetValues.length !== setSize) {
      return false;
    }

    if (!this.#compareCombinationSpeed(speedStatRange)) {
      this.#debugSpeedHitCount++;
      return false;
    }

    if (
      item.isUnique &&
      ((item.gearTypeID === "leftring" && this.#currentSet["rightring"].id === item.id) ||
        (item.gearTypeID === "rightring" && this.#currentSet["leftring"].id === item.id))
    ) {
      this.#debugUniqueHitCount++;
      return false;
    }

    this.#configGearset.equipMultiple(currentSetValues);
    if (this.#bestRecord?.dps?.expected < this.#configSimulation.dps.expected) {
      this.#bestRecord = { items: currentSetValues, dps: this.#configSimulation.dps };
    }

    return true;
  }

  static solverLoopRecursive(items, speedStatRange, index = 0) {
    this.#debugTotalIterCount++;

    if (index < items.length) {
      for (const item of items[index]) {
        this.#updateSetStats(item);
        this.#currentSet[item.gearTypeID] = item;

        if (this.#ignoreNextIteration > 0) {
          this.#ignoreNextIteration--;
          this.#debugCacheHitCount++;
        } else if (this.generateCombinationNew(item, speedStatRange, items.length)) {
          this.#debugValidIterCount++;
        }
        this.solverLoopRecursive(items, speedStatRange, index + 1);
      }
      this.#ignoreNextIteration++;
    }
  }

  /**
   * @param {String} jobCode Character job abbreviation
   * @param {Number} targetLevel Target character gearset level
   * @param {Object} targetIlvls Object containing one or both `min` and `max` properties
   * @param {Number} targetSpeed Target gearset GCD speed. TODO: support list of values.
   * @param {String} targetSimulation Name of simulation to run comparisons with
   * @param {Number} ilvlSync ilvl from which to apply Sync restrictions (stat cap, melding, etc)
   * @param {Boolean} doMateria Whether to also solve materia melds
   * @param {Boolean} doFood Whether to include food items
   * @param {Array} itemWhitelist List of individual item IDs(?) to bypass ilvl restriction (e.g. Relics)
   */
  static async solve(
    jobCode,
    targetLevel,
    targetIlvls,
    targetSpeed,
    targetSimulation,
    ilvlSync = 0,
    doMateria = false,
    doFood = false,
    itemWhitelist = []
  ) {
    this.#resetState();
    if (!this.#setUpSolverConfig(targetLevel, jobCode, targetSimulation)) return;
    this.#configSimulation = this.#configGearset.simulations.find((sim) => sim.name === targetSimulation);
    if (!this.#configSimulation) {
      console.warning("Couldn't find target simulation attached to gearset. Aborting solver");
      return;
    }

    if (targetIlvls.debug) {
      var allItems = debugRandomiseItems(DEBUG_SLOT_COUNT, DEBUG_SLOT_ARRAY_SIZE, jobCode);
    } else {
      var allItems = await fetchItemsGearCustom(jobCode, targetIlvls.min, targetIlvls.max);
      allItems.forEach((i) => GearItem.syncItemStats(i, debugIlvlSyncData, ilvlSync));
    }

    const itemGroups = groupItemsBySlot(jobCode, allItems);
    let itemArrays = Object.values(itemGroups);

    // TEMP: To replace with an actual check for relevant jobs (e.g. MNK)
    if (targetSpeed === 2.5) {
      itemArrays = this.eliminateSpeedStatGear(itemArrays);
    }
    itemArrays = this.eliminateLowStatGear(itemArrays, jobCode, ilvlSync);

    const itemArraysStringRep = itemArrays.reduce((str, arr) => {
      return str + arr.length + " ";
    }, "");
    console.debug(`             ARRAY NO. 1 2 3 4 5 6 7 8 9 A B `);
    console.debug(`Item distribution  : [ ${itemArraysStringRep}]`);

    const speedStatRange = getSpeedStatForGCD(targetLevel, targetSpeed);
    speedStatRange.min -= getBaseSubstat(targetLevel);
    speedStatRange.max -= getBaseSubstat(targetLevel);

    const startTime = Performance.prototype.now();
    this.solverLoopRecursive(itemArrays, speedStatRange);
    const endTime = Performance.prototype.now();

    // TODO: Reflect actual fetching (inconsistent array sizes)
    const totalUniqueCombinations = Math.pow(
      DEBUG_SLOT_ARRAY_SIZE,
      // ring slot adds 2 arrays
      DEBUG_SLOT_COUNT >= 10 ? Math.min(DEBUG_SLOT_COUNT + 1, 12) : DEBUG_SLOT_COUNT
    );
    return {
      items: itemArrays.flat(1),
      solution: this.#bestRecord,
      debugData: {
        elapsedTime: (endTime - startTime).toFixed(3),
        algorithmCombinationCount: totalUniqueCombinations,
        algorithmIterationCount: this.#debugTotalIterCount,
        iterationCount: this.#debugValidIterCount,
        cacheHitCount: this.#debugCacheHitCount,
        uniqueHitCount: this.#debugUniqueHitCount,
        speedHitCount: this.#debugSpeedHitCount,
      },
    };
  }
}

function groupItemsBySlot(jobCode, items) {
  return items.reduce((memo, item) => {
    if (!item.gearJob.includes(jobCode)) {
      return;
    }

    if (item.gearTypeID === "ring") {
      memo["leftring"] ??= [];
      memo["rightring"] ??= [];
    } else {
      memo[item.gearTypeID] ??= [];
    }

    if (item.gearTypeID === "ring") {
      item.gearTypeID = "leftring";
      memo["leftring"].push(structuredClone(item));
      item.gearTypeID = "rightring";
      memo["rightring"].push(structuredClone(item));
      item.gearTypeID = "ring";
    } else {
      memo[item.gearTypeID].push(item);
    }
    return memo;
  }, {});
}
