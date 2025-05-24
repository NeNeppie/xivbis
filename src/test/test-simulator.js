import { Gearset } from "../gearset.js";
import * as Actions from "../simulator/drg-actions.js";
import { TimeTrackerSimulation } from "../simulator/simulator.js";
import { assert, configure, describe, it } from "./test-framework.js";

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

function getEventsByParams(events, categories, types, names) {
  return events.flatMap((event) => {
    if (
      (!categories || categories.includes(event.category)) &&
      (!types || types.includes(event.type)) &&
      (!names || names.includes(event.name))
    )
      return [event];
    else return [];
  });
}

/*
As a proof of concept I'll use:
`Dragoon` for all abilities, and
`Spear Eternal` for the weapon .
*/

describe("Tracker-based Simulator Testing", () => {
  const simulator = new TimeTrackerSimulation(debugGearset);
  const stats = debugGearset.debugStats;

  describe("Running combo actions in the simulator", () => {
    let results = [];
    const actions = [
      // First Sequence
      Actions.actTrueThrust,
      Actions.actSpiralBlow,
      Actions.actChaoticSpring,
      // Second Sequence
      Actions.actLanceBarrage,
      Actions.actHeavensThrust,
      Actions.actFangAndClaw,
      // Third Sequence
      Actions.actRaidenThrust,
      Actions.actSpiralBlow,
      Actions.actChaoticSpring,
    ];

    simulator.reset();
    simulator.simCombatLoop(stats, actions, 30, 0, true, false);
    // TODO: might wanna create tests for events' categories, types, names, yada yada
    let filteredEvents = getEventsByParams(simulator.events, ["Damage", "Error"], "Global Cooldown");

    [
      it("Actions with no combo requirement should create events with `combo` set to `True`", () => {
        assert.condition(filteredEvents[0].data.combo);
      }),

      it("Successful combo executions should create damage events with `combo` set to True", () => {
        assert.condition(filteredEvents[1].data.combo);
      }),

      it("Combo followups to successful combo executions should also be True", () => {
        assert.condition(filteredEvents[2].data.combo);
      }),

      it("Unsuccessful combo executions should create events with `combo` set to False", () => {
        assert.strictEquals(false, filteredEvents[3].data.combo);
      }),

      it("Combo followups to unsuccessful combo executions should also be False", () => {
        assert.strictEquals(false, filteredEvents[4].data.combo);
        assert.strictEquals(false, filteredEvents[5].data.combo);
      }),

      it("Combo followups to failed actions count as unsuccessful ", () => {
        assert.strictEquals(false, filteredEvents[7].data.combo);
        assert.strictEquals(false, filteredEvents[8].data.combo);
      }),
    ].forEach((e) => results.push(e));

    // Print events for easier debugging
    if (results.includes(false)) {
      console.table(simulator.events);
    }
  });

  describe("Event Categories, Types and Names", () => {
    let results = [];
    const actions = [Actions.actRaidenThrust, Actions.actTrueThrust, Actions.actSpiralBlow, Actions.actChaoticSpring];

    simulator.reset();
    simulator.simCombatLoop(stats, actions, 30, 0, true, false);

    [
      it("Failed actions should fire an error event", () => {
        assert.strictEquals("Error", simulator.events[0].category);
      }),

      it("Names of Error and Damage events should reflect their sources", () => {
        assert.strictEquals("Raiden Thrust", simulator.events[0].name);
        assert.strictEquals("True Thrust", simulator.events[1].name);
      }),

      it("Names of State events of Status type should reflect the effect, not its source", () => {
        const event = getEventsByParams(simulator.events, "State", "Status Effect")[0];
        assert.strictEquals("Power Surge", event.name);
      }),

      it("Names of State events of DoT type should reflect their source", () => {
        const event = getEventsByParams(simulator.events, "State", "Damage over Time")[0];
        assert.strictEquals("Chaotic Spring", event.name);
      }),

      it("Status Effects are applied before their source's damage is", () => {
        const eventDamage = simulator.events.find((e) => e.name === "Spiral Blow");
        const index = simulator.events.indexOf(eventDamage);
        const eventState = simulator.events[index - 1];

        assert.strictEquals("State", eventState.category);
      }),

      it("DoTs apply before their source's damage is, but should tick afterwards", () => {
        const events = getEventsByParams(simulator.events, undefined, undefined, "Chaotic Spring");
        assert.strictEquals("Global Cooldown", events[1].type);
        assert.partialDeepEquals({ type: "Damage over Time", category: "State", state: "Applied" }, events[0]);
        assert.partialDeepEquals({ type: "Damage over Time", category: "Damage" }, events[2]);
      }),
    ].forEach((e) => results.push(e));

    // Print events for easier debugging
    if (results.includes(false)) {
      console.table(simulator.events);
    }
  });
});
