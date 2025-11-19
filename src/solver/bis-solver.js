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
function debugRandomiseItems(arrayCount, arrayLength, jobCode) {
  let list = [];
  arrayCount = Math.min(arrayCount, 11);
  for (let i = 0; i < arrayCount; i++) {
    for (let j = 0; j < arrayLength; j++) {
      let stats = {
        Strength: 10 * rand(1, 9) + 100 * rand(1, 4),
        Determination: 10 * rand(1, 9) + 100 * rand(1, 4),
        "Critical Hit Rate": 10 * rand(1, 9) + 100 * rand(1, 4),
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
  static #bestRecord = {};

  static #configGearset;
  static #configSimulation;

  static #debugTotalIterCount;
  static #debugValidIterCount;
  static #debugCacheHitCount;
  static #debugUniqueHitCount;
  static #debugSpeedHitCount;

  static #ignoreNextIteration;
  static #currentSetSpeedStat;

  static #resetState() {
    this.#currentSet = {};
    this.#bestRecord = { dps: { raw: 0, expected: 0 } };

    this.#debugTotalIterCount = 0;
    this.#debugValidIterCount = 0;
    this.#debugCacheHitCount = 0;
    this.#debugUniqueHitCount = 0;
    this.#debugSpeedHitCount = 0;

    this.#ignoreNextIteration = 0;
    this.#currentSetSpeedStat = 0;
  }

  static #compareCombinationSpeed(speedStatRange) {
    if (this.#currentSetSpeedStat < speedStatRange.min || this.#currentSetSpeedStat > speedStatRange.max) {
      return false;
    }
    return true;
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

    // TODO: Left/Right ring "Unique" tag filter

    this.#configGearset.equipMultiple(currentSetValues);
    if (this.#bestRecord?.dps?.expected < this.#configSimulation.dps.expected) {
      this.#bestRecord = { items: currentSetValues, dps: this.#configSimulation.dps };
    }

    return true;
  }

  // NOTE: 10x10 sample size (1e11) runtime: Unachievable.
  //       10x4 sample size (4.194m) runtime : 25 min -> 8.6 min (50% spdHit).
  //       10x3 sample size (177,147) runtime : 1 min -> 19 sec (50% spdHit).
  //       Array counts above 10 get incremented e.g. 10x10 => 11x10
  //  Optmizations:
  //    ✅ remove duplicate iterations aka memoization (now not via memoization!);
  //      - Cuts down about 50% of iterations.
  //    ✅ ignore gear combinations not meeting target speeds;
  //      - Variable, but otherwise theoretically great, performance boost.
  //      - Extra: add/remove stats on combination assignment instead of fully iterating every single time.
  //    🔷 Simulate once for each target gcd speed, and only run damage calculation on stat changes;
  //    🔷 For default target speeds, remove gear from `items` that has any speed stat points;
  //      - Effectiveness varies, and only for default (2.5) GCD speeds, but offers a substantial boost
  //    🔷 Remove gear with proportional stat distribution and lower overall stats;
  //      - Tricking the item count for each array down for extremely large sample sizes
  //      - Only implement AFTER materia due to ilvl sync
  //    ✅ ignore gear combinations that do not utilize all available slots;
  //      - Saves 1-10 iterations. Very insignificant.
  static solverLoopRecursive(items, speedStatRange, index = 0) {
    this.#debugTotalIterCount++;

    if (index < items.length) {
      for (const item of items[index]) {
        // TODO: Differentiate between Skill and Spell speed jobs
        this.#currentSetSpeedStat -= this.#currentSet[item.gearTypeID]?.stats["Skill Speed"] ?? 0;
        this.#currentSetSpeedStat += item.stats["Skill Speed"] ?? 0;
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

    this.#configGearset = new Gearset(targetLevel, jobCode);
    this.#configSimulation = this.#configGearset.simulations.find((sim) => sim.name === targetSimulation);
    if (!this.#configSimulation) {
      console.warning("Couldn't find target simulation attached to gearset. Aborting solver");
      return;
    }

    if (targetIlvls.debug) {
      var allItems = debugRandomiseItems(DEBUG_SLOT_COUNT, DEBUG_SLOT_ARRAY_SIZE, jobCode);
    } else {
      var allItems = await fetchItemsGearCustom(jobCode, targetIlvls.min, targetIlvls.max);
    }

    const itemGroups = groupItemsBySlot(jobCode, allItems);
    const itemArrays = Object.values(itemGroups);
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
      items: itemArrays,
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
