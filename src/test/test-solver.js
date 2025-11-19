import { getSpeedStatForGCD } from "../math-ffxiv.js";
import { BestInSlotSolver as Solver } from "../solver/bis-solver.js";
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
  console.log(`Ring "Unique" Hits           : ${data.debugData.uniqueHitCount}`);
  console.log(`Speed stat filter hits       : ${data.debugData.speedHitCount} (${speedHitPercent}%)`);
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

  // TODO: Add test for array distribution and total combination count calculation
});

describe("Solver Testing, randomised items", async () => {
  const results = await Solver.solve("DRG", 100, { min: 730, max: 735, debug: true }, 2.5, "standard", 735);
  parseDebugResults(results);

  // const sksItems = [];
  // results.items.map((arr) => {
  //   sksItems.push(arr.filter((item) => item.stats["Skill Speed"]));
  // });

  it("Total iteration count matches unique no. of combinations", () => {
    const totalValidIter = results.debugData.iterationCount + results.debugData.speedHitCount;
    assert.strictEquals(results.debugData.algorithmCombinationCount, totalValidIter);
  });
});
