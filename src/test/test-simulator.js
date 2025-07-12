import { Gearset } from "../gearset.js";
import * as Actions from "../simulator/DRG/drg-actions.js";
import { StandardSimulationDRG } from "../simulator/DRG/drg-simulator.js";
import { assert, describe, it } from "./test-framework.js";

const debugGearset = new Gearset(100, "DRG");
debugGearset.debugStats = {
  wdPhys: 144,
  delay: 2.8,
  strength: 440 * 1.15 + 595,
  determination: 440 + 384,
  crit: 420 + 269,
  directHit: 420 + 0,
  spdSkill: 420 + 0,
  spdSpell: 420 + 0,
  // auto?: 134.39
};

function getEventsByParams(events, types, names) {
  return events.flatMap((event) => {
    if ((!types || types.includes(event.type)) && (!names || names.includes(event.name))) return [event];
    else return [];
  });
}

/*
As a proof of concept I'll use:
`Dragoon` for all abilities, and
`Spear Eternal` for the weapon .
*/

describe("Tracker-based Simulator Testing", () => {
  const simulator = new StandardSimulationDRG(debugGearset);
  simulator.stats = debugGearset.debugStats;

  describe("Running combo actions in the simulator", () => {
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
    let filteredEvents = getEventsByParams(simulator.events, ["Action", "Error"]);

    [
      it("Actions with no combo requirement should create events with `combo` set to `True`", () => {
        assert.condition(filteredEvents[0].data.combo);
      }),

      // Also tests for differentation between GCDs and OGCDs
      it("Successful combo executions should create damage events with `combo` set to True", () => {
        assert.condition(filteredEvents[2].data.combo);
      }),

      it("Combo followups to successful combo executions should also be True", () => {
        assert.condition(filteredEvents[3].data.combo);
      }),

      it("Unsuccessful combo executions should create events with `combo` set to False", () => {
        assert.strictEquals(false, filteredEvents[4].data.combo);
      }),

      it("Combo followups to unsuccessful combo executions should also be False", () => {
        assert.strictEquals(false, filteredEvents[5].data.combo);
        assert.strictEquals(false, filteredEvents[6].data.combo);
      }),

      it("Throw an error when attempting to execute followup actions with prerequisites unmet", () => {
        assert.strictEquals("Error", filteredEvents[7].type);
      }),

      it("Combo followups to failed actions count as unsuccessful ", () => {
        assert.strictEquals(false, filteredEvents[9].data.combo);
        assert.strictEquals(false, filteredEvents[10].data.combo);
      }),
    ].forEach((e) => results.push(e));

    // Print events for easier debugging
    if (results.includes(false)) {
      // console.table(simulator.events);
      simulator.events.forEach((e) => {
        console.dir(e, { depth: 3 });
      });
    }
  });

  describe("Event Categories, Types and Names", () => {
    let results = [];
    const actions = [Actions.actRaidenThrust, Actions.actTrueThrust, Actions.actSpiralBlow, Actions.actChaoticSpring];

    simulator.reset();
    simulator.simulate(actions, 30, 0, true, false);

    [
      it("Failed actions should fire an error event", () => {
        assert.strictEquals("Error", simulator.events[0].type);
      }),

      // Are there any exceptions?
      it("Status Effects do not affect their parent action", () => {
        const index = simulator.events.findIndex((e) => e.name === "Spiral Blow");
        const statusEvent = simulator.events[index - 1];
        const actionEvent = simulator.events[index];

        assert.partialDeepEquals({ elapsed: 2.5, name: "Power Surge" }, statusEvent);
        assert.partialDeepEquals({ damage: 0 }, actionEvent.data.buffs);
      }),

      // According to logs: Effects apply on use, damage and dots apply after applicationTime
      it("DoTs apply at the same time as their source's damage", () => {
        const events = getEventsByParams(simulator.events, undefined, "Chaotic Spring");
        // Ignoring application time
        events.forEach((event) => assert.strictEquals(5, event.elapsed));
      }),
    ].forEach((e) => results.push(e));

    // Print events for easier debugging
    if (results.includes(false)) {
      console.table(simulator.events);
    }
  });

  describe("Off-global Cooldowns and Status Effects", () => {
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
    simulator.simulate(actions, 30, 0, true, false);

    [
      it("OGCDs don't interrupt the Global Cooldown time", () => {
        assert.equals(2.5, simulator.events.find((e) => e.name === "Spiral Blow").elapsed);
        assert.equals(5, simulator.events.find((e) => e.name === "Chaotic Spring").elapsed);
      }),

      it("Double weaving OGCDs with low animation lock", () => {
        const weave1 = simulator.events.find((e) => e.name === "Life Surge");
        const weave2 = simulator.events.find((e) => e.name === "Battle Litany");
        assert.equals(2.5, simulator.events.find((e) => e.name === "Spiral Blow").elapsed);
        assert.condition(weave1.elapsed > 2.5 && weave1.elapsed < 5);
        assert.condition(weave2.elapsed > 2.5 && weave2.elapsed < 5);
        assert.equals(5, simulator.events.find((e) => e.name === "Chaotic Spring").elapsed);
      }),

      it("Buffs should activate correctly", () => {
        // Test for damage up buff on an action following Spiral Blow
        const events = getEventsByParams(simulator.events, "Action");
        assert.equals(0.1, events[2].data.buffs.damage);

        // Test for Life Surge on Chaotic Spring making it a guaranteed crit
        const event = simulator.events.find((e) => e.name === "Chaotic Spring");
        assert.condition(event.data.effects.find((e) => e.name === "Life Surge"));
        assert.partialDeepEquals({ autocrit: true }, event.data.buffs);
      }),

      it("Multiple damage buffs stacking", () => {
        // Test for { 0.21 damage, 0.1 crit } buff on 2nd True Thrust
        const event = getEventsByParams(simulator.events, "Action", "Wheeling Thrust")[0];
        assert.partialDeepEquals({ damage: 0.21, crit: 0.1 }, event.data.buffs);
      }),

      it("Only primary buff type should snapshot to DoTs", () => {
        // Test for 'damage', 'crit' and 'direct' existing while Life Surge status type does not
        const chaotic = getEventsByParams(simulator.events, "Action", "Chaotic Spring")[0];
        assert.deepEquals({ damage: 0.1, crit: 0.1, direct: 0, autocrit: true, autodirect: false }, chaotic.data.buffs);
        assert.deepEquals({ damage: 0.1, crit: 0.1, direct: 0 }, chaotic.data.appliedDot[0].buffs);
      }),

      it("Buffs applying according to restrictions", () => {
        // Test Life Surge proccing on a GCD (Weaponskill) and not OGCD
        const events = getEventsByParams(simulator.events, "Action");
        const index = events.indexOf(events.find((e) => e.name === "Life Surge"));

        assert.strictEquals("Battle Litany", events[index + 1].name);
        assert.partialDeepEquals({ autocrit: false }, events[index + 1].data.buffs);
        assert.strictEquals("Chaotic Spring", events[index + 2].name);
        assert.partialDeepEquals({ autocrit: true }, events[index + 2].data.buffs);
      }),

      it("Buffs with stacks getting used up correctly", () => {
        // Test Life Surge proccing only on Chaotic Spring
        const events = getEventsByParams(simulator.events, "Action");
        const chaotic = events.find((e) => e.name === "Chaotic Spring");
        const thrust = events.find((e) => e.name === "Wheeling Thrust");

        assert.partialDeepEquals({ autocrit: true }, chaotic.data.buffs);
        assert.partialDeepEquals({ autocrit: false }, thrust.data.buffs);
      }),

      it("Buffs getting refreshed correctly", () => {
        // Test Life Surge proccing on Drakesbane after being previously applied on Chaotic Spring
        const drakesbane = simulator.events.find((e) => e.name === "Drakesbane");
        assert.partialDeepEquals({ autocrit: true }, drakesbane.data.buffs);
      }),

      it("Can use actions with multiple charges within cooldown period", () => {
        // Third Life Surge use should throw an error instead.
        const lifeSurges = getEventsByParams(simulator.events, "Action", "Life Surge");
        assert.condition(lifeSurges.length === 2);
      }),

      it("OGCDs adhere to their cooldowns", () => {
        // Test for an error on 3rd Life Surge & 2nd Lance Charge use attempts
        const lifeSurges = getEventsByParams(simulator.events, ["Action", "Error"], "Life Surge");
        const lanceCharges = getEventsByParams(simulator.events, ["Action", "Error"], "Lance Charge");

        assert.condition(lifeSurges.length === 3);
        assert.condition(lanceCharges.length === 2);
        assert.strictEquals("Error", lifeSurges[2].type);
        assert.strictEquals("Error", lanceCharges[1].type);
      }),

      it("GCDs clip when triple weaving / using multiple OGCDs with high animation locks", () => {
        // Test that final GCD use time far exceeds what it should be
        const event = simulator.events[simulator.events.length - 1];
        assert.condition(event.elapsed > 15);
      }),
    ].forEach((e) => results.push(e));

    // Print events for easier debugging
    if (results.includes(false)) {
      console.table(simulator.events);
      // simulator.events.forEach((e) => {
      //   if (e.type === "Action") {
      //     console.dir(e, { depth: 3 });
      //   }
      // });
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
      Actions.actLanceBarrage,
      Actions.LifeSurge,
      Actions.Starcross,
      Actions.actHeavensThrust,
      Actions.MirageDive,
      Actions.RiseoftheDragon,
      Actions.actFangAndClaw,
      Actions.actDrakesbane,
      Actions.actRaidenThrust,
      Actions.WyrmwindThrust,
    ];

    simulator.reset();
    simulator.simulate(actions, 60, 0, false, true);
    console.table(simulator.events);
    // simulator.events.forEach((e) => {
    //   console.dir(e, { depth: 3 });
    // });
  });
});
