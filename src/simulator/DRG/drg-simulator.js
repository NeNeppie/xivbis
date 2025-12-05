import { StandardSimulation as Simulator } from "../simulator.js";
import * as Actions from "./drg-actions.js";

export class StandardSimulationDRG extends Simulator {
  constructor(gearset) {
    super(gearset);
    this.gauge.createGauge("Life of the Dragon", { maxTime: 20, initTime: 0 });
    this.gauge.createGauge("Firstmind's Focus", { maxCount: 2, initCount: 0 });
  }

  simulate(actionsOverwrite, duration, start = 0, endWhenNoActions = false, simAutoAttacks = true, doDamageComputation = true) {
    if (!actionsOverwrite || actionsOverwrite.length === 0) {
      return super.simulate(this.#actionsDefault, duration, start, endWhenNoActions, simAutoAttacks, doDamageComputation);
    } else {
      return super.simulate(actionsOverwrite, duration, start, endWhenNoActions, simAutoAttacks, doDamageComputation);
    }
  }

  #actionsDefault = [
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
    Actions.actSpiralBlow,
    Actions.actChaoticSpring,
  ];
}
