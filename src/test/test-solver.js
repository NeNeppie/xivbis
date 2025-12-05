import { GearItem } from "../gearset.js";
import { getSpeedStatForGCD } from "../math-ffxiv.js";
import { BestInSlotSolver as Solver } from "../solver/bis-solver.js";
import { cartesianProductCounter } from "../utils/math-utils.js";
import { assert, describe, it } from "./test-framework.js";

function parseDebugResults(data) {
  const totalIter = data.debugData.iterationCount + data.debugData.cacheHitCount + data.debugData.speedHitCount;
  const cacheHitPercent = ((data.debugData.cacheHitCount / totalIter) * 100).toFixed(1);
  const speedHitPercent = ((data.debugData.speedHitCount / totalIter) * 100).toFixed(1);
  console.table(data.solution.items);
  console.log(`Solver loop elapsed runtime  : ${data.debugData.elapsedTime}ms`);
  console.log(`Algorithm Unique Combinations: ${data.debugData.algorithmCombinationCount}`);
  console.log(`Algorithm Total Iterations   : ${data.debugData.algorithmIterationCount}`);
  console.log(`Solver Iterations            : ${data.debugData.iterationCount}`);
  console.log(`Cache hits                   : ${data.debugData.cacheHitCount} (${cacheHitPercent}%)`);
  console.log(`Speed stat filter hits       : ${data.debugData.speedHitCount} (${speedHitPercent}%)`);
  console.log(`Ring "Unique" Hits           : ${data.debugData.uniqueHitCount}`);
}

describe("Mathematics and Computations", () => {
  it("`getSpeedStatForGCD` returns correct min & max stats", () => {
    const lvHunderedTestOne = getSpeedStatForGCD(100, 2.49, 2.5);
    const lvHunderedTestTwo = getSpeedStatForGCD(100, 2.45, 2.5);
    const lvHunderedTestThree = getSpeedStatForGCD(100, 2.5, 2.5);
    // min: 420 + 21.3846 * 0 + 1 (Tier 1), max: 420 + 21.3846 * 4 (Tier 4)
    assert.deepEquals(lvHunderedTestOne, { min: 421, max: 505 });
    // min: 420 + 21.3846 * 16 + 1 (Tier 17), max: 420 + 21.3846 * 20 (Tier 20)
    assert.deepEquals(lvHunderedTestTwo, { min: 763, max: 847 });
    // min: 420, max: 420
    assert.deepEquals(lvHunderedTestThree, { min: 420, max: 420 });
  });

  it("Correct number of Cartesian Product unique combinations", () => {
    const testArray1 = [
      [1, 2, 3],
      [1, 2, 3, 4],
      [1, 2, 3],
      [1, 2, 3, 4, 5],
    ]; // total =?= 180

    const testArray2 = [
      [1, 2, 3, 4],
      [1, 2, 3, 4],
      [1, 2, 3, 4],
      [1, 2, 3, 4],
      [1, 2, 3, 4],
    ]; // total == 1024

    assert.strictEquals(cartesianProductCounter(testArray1), 180);
    assert.strictEquals(cartesianProductCounter(testArray2), 1024);
    assert.strictEquals(cartesianProductCounter([[1]]), 1);
    assert.strictEquals(cartesianProductCounter([[], [], []]), 0);
    assert.strictEquals(cartesianProductCounter([]), 0);
  });
  // TODO: Add test for array distribution calculation
});

describe("Item manipulation", () => {
  const item1 = {
    equipLevel: 100,
    itemLevel: 760,
    slotStatPercentage: 85,
    stats: { Dexterity: 435, "Critical Hit": 176, "Direct Hit Rate": 251, Piety: 251 },
  };
  const item2 = {
    equipLevel: 100,
    itemLevel: 735,
    slotStatPercentage: 85,
    stats: { Mind: 222, "Spell Speed": 333, "Critical Hit": 111 },
  };

  const ilvlSyncDebugInfo = {
    730: { Dexterity: 4359, Vitality: 4603, Piety: 2774, "Critical Hit": 2774 },
    735: { Dexterity: 4485, Vitality: 4764, Piety: 2807, "Critical Hit": 2807 },
    740: { Dexterity: 4610, Vitality: 4925, Piety: 2840, "Critical Hit": 2840 },
  };

  it("Downsyncing stats to target ilvl", () => {
    GearItem.syncItemStats(item1, ilvlSyncDebugInfo, 735);

    assert.strictEquals(item1.stats["Dexterity"], 381);
    assert.strictEquals(item1.stats["Critical Hit"], 176); // unchanged - below threshold
    assert.strictEquals(item1.stats["Direct Hit Rate"], 251); // unchanged - no info
    assert.strictEquals(item1.stats["Piety"], 239);
  });

  it("Removal of speed stat gear from a sample", () => {
    let items = [[item1, item2]];
    items = Solver.eliminateSpeedStatGear(items);

    assert.condition(items[0].length === 1);
    assert.strictEquals(items[0][0].itemLevel, 760);
  });
});

await describe("Solver Testing, randomised items", async () => {
  const results = await Solver.solve("DRG", 100, { min: 730, max: 735, debug: true }, 2.5, "standard", 735);
  parseDebugResults(results);

  // const sksItems = [];
  // results.items.map((arr) => {
  //   sksItems.push(arr.filter((item) => item.stats["Skill Speed"]));
  // });

  it("Total iteration count matches unique no. of combinations", () => {
    const totalValidIter = results.debugData.iterationCount + results.debugData.speedHitCount + results.debugData.uniqueHitCount;
    assert.strictEquals(totalValidIter, results.debugData.algorithmCombinationCount);
  });
});

describe("Solver Testing, items pulled from xivapi", async () => {
  const results = await Solver.solve("DRG", 100, { min: 735, max: 760 }, 2.5, "standard", 760);
  parseDebugResults(results);

  it("Cap item stats above ilvl sync", () => {
    for (const item of results.items.filter((i) => i.itemLevel > 735)) {
      console.log(item);
      if (item.gearTypeID === "weapon") {
        assert.condition(item.stats["Strength"] === 628);
        assert.condition(item.stats["Determination"] ?? 0 <= 393);
      }
      if (item.gearTypeID === "feet") {
        assert.condition(item.stats["Strength"] === 381);
        assert.condition(item.stats["Critical Hit"] ?? 0 <= 239);
      }
      if (item.gearTypeID === "wrists") {
        assert.condition(item.stats["Strength"] === 300);
        assert.condition(item.stats["Direct Hit Rate"] ?? 0 <= 188);
      }
    }
  });
});
