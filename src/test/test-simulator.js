import { Gearset } from "../gearset.js";
import * as Actions from "../simulator/DRG/drg-actions.js";
import { StandardSimulationDRG } from "../simulator/DRG/drg-simulator.js";
import { assert, describe, it } from "./test-framework.js";

const debugGearset = new Gearset(100, "DRG");
debugGearset.debugStats = {
  wdPhys: 144,
  delay: 2800,
  strength: 440 * 1.15 + 595,
  determination: 440 + 384,
  crit: 420 + 269,
  directHit: 420 + 0,
  spdSkill: 420 + 0,
  spdSpell: 420 + 0,
  // auto?: 134.39
};

/*
As a proof of concept I'll use:
`Dragoon` for all abilities, and
`Spear Eternal` for the weapon .
*/

describe("Tracker-based Simulator Testing", () => {
  const simulator = new StandardSimulationDRG(debugGearset);
  simulator.stats = debugGearset.debugStats;

  describe("Combo Actions", () => {
    let results = [];
    const actions = [
      // First Sequence
      Actions.actTrueThrust,
      Actions.HighJump,
      Actions.actSpiralBlow,
      Actions.actChaoticSpring,
      // Second Sequence
      Actions.actLanceBarrage,
      Actions.actHeavensThrust,
      Actions.actFangAndClaw,
      Actions.actDrakesbane,
      // Third Sequence
      Actions.actRaidenThrust,
      Actions.actSpiralBlow,
      Actions.actChaoticSpring,
    ];

    simulator.reset();
    simulator.simulate(actions, 30, 0, true, false);
    const events = simulator.results.action;

    [
      it("Actions with no combo requirement should create events with `combo` set to `True`", () => {
        assert.condition(events[0].data.combo);
      }),

      // Also tests for differentation between GCDs and OGCDs
      it("Successful combo executions should create damage events with `combo` set to True", () => {
        assert.condition(events[2].data.combo);
      }),

      it("Combo followups to successful combo executions should also be True", () => {
        assert.condition(events[3].data.combo);
      }),

      it("Unsuccessful combo executions should create events with `combo` set to False", () => {
        assert.strictEquals(false, events[4].data.combo);
      }),

      it("Combo followups to unsuccessful combo executions should also be False", () => {
        assert.strictEquals(false, events[5].data.combo);
        assert.strictEquals(false, events[6].data.combo);
      }),

      it("Throw an error when attempting to execute followup actions with prerequisites unmet", () => {
        assert.condition(events[7].data.errorMessage);
      }),

      it("Combo followups to failed actions count as unsuccessful ", () => {
        assert.strictEquals(false, events[9].data.combo);
        assert.strictEquals(false, events[10].data.combo);
      }),
    ].forEach((e) => results.push(e));

    // Print events for easier debugging
    if (results.includes(false)) {
      console.table(events);
      // simulator.results.action.forEach((e) => {
      //   console.dir(e, { depth: 3 });
      // });
    }
  });

  describe("General", () => {
    let results = [];
    const actions = [Actions.actRaidenThrust, Actions.actTrueThrust, Actions.actSpiralBlow, Actions.actChaoticSpring];

    simulator.reset();
    simulator.simulate(actions, 30, 0, true, false);
    const eventsAction = simulator.results.action;
    const eventsStatus = simulator.results.status;

    [
      it("Failed actions should fire an error event", () => {
        assert.condition(eventsAction[0].data.errorMessage);
      }),

      // Are there any exceptions?
      it("Status Effects do not affect their parent action", () => {
        const statusEvent = eventsStatus.find((e) => e.startTime === 2.5);
        const actionEvent = eventsAction.find((e) => e.elapsed === 2.5);

        assert.partialDeepEquals(statusEvent, { name: "Power Surge" });
        assert.partialDeepEquals(actionEvent.data.buffs, { damage: 0 });
      }),

      // According to logs: Effects apply on use, damage and dots apply after applicationTime
      it("DoTs apply at the same time as their source's damage", () => {
        const dotAction = eventsAction.find((e) => e.name === "Chaotic Spring");
        // Ignoring application time
        assert.strictEquals(5, dotAction.elapsed);
      }),
    ].forEach((e) => results.push(e));

    // Print events for easier debugging
    if (results.includes(false)) {
      console.table(simulator.results.action);
      console.table(simulator.results.status);
    }
  });

  describe("OGCDs and Status Effects", () => {
    let results = [];
    const actions = [
      Actions.actTrueThrust,
      Actions.actSpiralBlow,
      // Double Weaving
      Actions.LifeSurge,
      Actions.BattleLitany,
      Actions.actChaoticSpring,
      Actions.LanceCharge,
      Actions.actWheelingThrust,
      // Testing actions with multiple charges
      Actions.LifeSurge,
      Actions.actDrakesbane,
      // Attempting to use OGCDs on cooldown
      Actions.LifeSurge,
      Actions.LanceCharge,
      Actions.actRaidenThrust,
      // Triple weaving, testing clipping
      Actions.Geirskogul,
      Actions.Stardiver,
      Actions.DragonfireDive,
      Actions.actSpiralBlow,
    ];

    simulator.reset();
    const simRes = simulator.simulate(actions, 30, 0, true, false);
    const eventsAction = simRes.action;
    const eventsStatus = simRes.status;

    [
      it("OGCDs don't interrupt the Global Cooldown time", () => {
        assert.equals(2.5, eventsAction.find((e) => e.name === "Spiral Blow").elapsed);
        assert.equals(5, eventsAction.find((e) => e.name === "Chaotic Spring").elapsed);
      }),

      it("Double weaving OGCDs with low animation lock", () => {
        const weave1 = eventsAction.find((e) => e.name === "Life Surge");
        const weave2 = eventsAction.find((e) => e.name === "Battle Litany");
        assert.equals(2.5, eventsAction.find((e) => e.name === "Spiral Blow").elapsed);
        assert.condition(weave1.elapsed > 2.5 && weave1.elapsed < 5);
        assert.condition(weave2.elapsed > 2.5 && weave2.elapsed < 5);
        assert.equals(5, eventsAction.find((e) => e.name === "Chaotic Spring").elapsed);
      }),

      it("Buffs should activate correctly", () => {
        // Test for damage up buff on an action following Spiral Blow
        assert.equals(0.1, eventsAction[2].data.buffs.damage);

        // Test for Life Surge on Chaotic Spring making it a guaranteed crit
        const event = eventsAction.find((e) => e.name === "Chaotic Spring");
        assert.condition(event.data.effects.find((e) => e.name === "Life Surge"));
        assert.partialDeepEquals(event.data.buffs, { autocrit: true });
      }),

      it("Multiple damage buffs stacking", () => {
        // Test for { 0.21 damage, 0.1 crit } buff on first Wheeling Thrust
        const event = eventsAction.find((e) => e.name === "Wheeling Thrust");
        assert.partialDeepEquals(event.data.buffs, { damage: 0.21, crit: 0.1 });
      }),

      it("Only primary buff type should snapshot to DoTs", () => {
        // Test for 'damage', 'crit' and 'direct' existing while Life Surge status type does not
        const chaotic = eventsAction.find((e) => e.name === "Chaotic Spring");
        assert.deepEquals(chaotic.data.buffs, { damage: 0.1, crit: 0.1, direct: 0, autocrit: true, autodirect: false });
        assert.deepEquals(chaotic.data.appliedDot[0].buffs, { damage: 0.1, crit: 0.1, direct: 0 });
      }),

      it("Buffs applying according to restrictions", () => {
        // Test Life Surge proccing on a GCD (Weaponskill) and not OGCD
        const index = eventsAction.indexOf(eventsAction.find((e) => e.name === "Life Surge"));

        assert.strictEquals(eventsAction[index + 1].name, "Battle Litany");
        assert.partialDeepEquals(eventsAction[index + 1].data.buffs, { autocrit: false });
        assert.strictEquals(eventsAction[index + 2].name, "Chaotic Spring");
        assert.partialDeepEquals(eventsAction[index + 2].data.buffs, { autocrit: true });
      }),

      it("Buffs with stacks getting used up correctly", () => {
        // Test Life Surge proccing only on Chaotic Spring
        const chaotic = eventsAction.find((e) => e.name === "Chaotic Spring");
        const thrust = eventsAction.find((e) => e.name === "Wheeling Thrust");

        assert.partialDeepEquals(chaotic.data.buffs, { autocrit: true });
        assert.partialDeepEquals(thrust.data.buffs, { autocrit: false });
      }),

      it("Buffs getting refreshed correctly", () => {
        // Test Life Surge proccing on Drakesbane after being previously applied on Chaotic Spring
        const drakesbane = eventsAction.find((e) => e.name === "Drakesbane");
        assert.partialDeepEquals(drakesbane.data.buffs, { autocrit: true });
      }),

      it("Buffs' duration is dependant on their usage", () => {
        // Test Life Surge: endtime - starttime < duration
        const lifeSurge = eventsStatus.find((e) => e.name === "Life Surge");
        assert.condition(lifeSurge.endTime - lifeSurge.startTime < 5);
        assert.condition(lifeSurge.duration < 5);
      }),

      it("Can use actions with multiple charges within cooldown period", () => {
        // Third Life Surge use should throw an error instead.
        const lifeSurges = eventsAction.filter((e) => e.name === "Life Surge" && !e.data.errorMessage);
        assert.condition(lifeSurges.length === 2);
      }),

      it("OGCDs adhere to their cooldowns", () => {
        // Test for an error on 3rd Life Surge & 2nd Lance Charge use attempts
        const lifeSurges = eventsAction.filter((e) => e.name === "Life Surge");
        const lanceCharges = eventsAction.filter((e) => e.name === "Lance Charge");

        assert.condition(lifeSurges.length === 3);
        assert.condition(lanceCharges.length === 2);
        assert.condition(lifeSurges[2].data.errorMessage);
        assert.condition(lanceCharges[1].data.errorMessage);
      }),

      it("GCDs clip when triple weaving / using multiple OGCDs with high animation locks", () => {
        // Test that final GCD use time far exceeds what it should be
        const event = eventsAction[eventsAction.length - 1];
        assert.condition(event.elapsed > 15);
      }),
    ].forEach((e) => results.push(e));

    // Print events for easier debugging
    if (results.includes(false)) {
      console.table(eventsAction);
      console.table(eventsStatus);
      eventsAction.forEach((e) => {
        console.dir(e, { depth: 3 });
      });
    }
  });

  describe("Example rotation", () => {
    const actions = [
      Actions.actTrueThrust,
      Actions.actSpiralBlow,
      Actions.LanceCharge, // NOTE: Should be late-weaved in reopeners.
      // Potion goes here
      Actions.actChaoticSpring,
      Actions.BattleLitany,
      Actions.Geirskogul,
      Actions.actWheelingThrust,
      Actions.HighJump,
      Actions.LifeSurge,
      Actions.actDrakesbane,
      Actions.DragonfireDive,
      Actions.Nastrond,
      Actions.actRaidenThrust,
      Actions.Stardiver,
      Actions.actSpiralBlow,
      Actions.LifeSurge,
      Actions.Starcross,
      Actions.actChaoticSpring,
      Actions.MirageDive,
      Actions.RiseoftheDragon,
      Actions.actWheelingThrust,
      Actions.actDrakesbane,
      Actions.actRaidenThrust,
      Actions.WyrmwindThrust,
    ];

    simulator.reset();
    simulator.simulate(actions, 60, 0, true, true, true);
    console.table(simulator.results.action);
    console.table(simulator.results.status);
    console.table(simulator.results.gauge);
    // simulator.results.action.forEach((e) => {
    //   console.dir(e, { depth: 3 });
    // });
    console.log(simulator.results.dps);
  });
});
