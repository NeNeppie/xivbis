import ActionBuilder from "./action-builder.js";
import * as Statuses from "./drg-statuses.js";

// prettier-ignore
const actTrueThrust = ActionBuilder.CreateBaseGCD("True Thrust", 230)
  .setTimers({baseCastTime: 0, baseRecastTime: 2.5, applicationTime: 0.76, animationLock: 0.6 });

// Upgraded version of Disembowel
const actSpiralBlow = ActionBuilder.CreateBaseGCD("Spiral Blow", 140)
  .setTimers({ baseCastTime: 0, baseRecastTime: 2.5, applicationTime: 1.38, animationLock: 0 })
  .setComboAction(["True Thrust", "Raiden Thrust"], 300)
  .addStatusEffect(Statuses.buffPowerSurge, true);

// Upgraded version of Vorpal Thrust
const actLanceBarrage = ActionBuilder.CreateBaseGCD("Lance Barrage", 130)
  .setTimers({ baseCastTime: 0, baseRecastTime: 2.5, applicationTime: 0, animationLock: 0 })
  .setComboAction(["True Thrust", "Raiden Thrust"], 340);

// Upgraded version of Chaos Thrust
const actChaoticSpring = ActionBuilder.CreateBaseGCD("Chaotic Spring", 180)
  .setTimers({ baseCastTime: 0, baseRecastTime: 2.5, applicationTime: 0.445, animationLock: 0 })
  .setComboAction("Spiral Blow", 340)
  .addDamageOverTime(24, 45, true); // On successful combo applies a 45p dot for 24s

// Upgraded version of Full Thrust
const actHeavensThrust = ActionBuilder.CreateBaseGCD("Heaven's Thrust", 160)
  .setTimers({ baseCastTime: 0, baseRecastTime: 2.5, applicationTime: 0.71, animationLock: 0 })
  .setComboAction("Lance Barrage", 460);

const actWheelingThrust = ActionBuilder.CreateBaseGCD("Wheeling Thrust", 180)
  .setTimers({ baseCastTime: 0, baseRecastTime: 2.5, applicationTime: 0, animationLock: 0 })
  .setComboAction("Chaotic Spring", 340);

const actFangAndClaw = ActionBuilder.CreateBaseGCD("Fang and Claw", 180)
  .setTimers({ baseCastTime: 0, baseRecastTime: 2.5, applicationTime: 0, animationLock: 0 })
  .setComboAction("Heaven's Thrust", 340);

// Becomes available via a buff (obtained from Wheeling / Fang), not through combo.
// ACTUALLY NOT A BUFF AND IS TECHNICALLY THROUGH COMBO. ITS A FOLLOWUP ACTION. POTENCY IS 0 UNLESS REQUIREMENT MET.
// prettier-ignore
const actDrakesbane = ActionBuilder.CreateBaseGCD("Drakesbane", 0)
  .setTimers({ baseCastTime: 0, baseRecastTime: 2.5, applicationTime: 0, animationLock: 0 })
  .setComboAction(["Wheeling Thrust", "Fang and Claw"], 460)
  .addStatusEffect(Statuses.buffRaidenThrust, true);

// Becomes available via a buff (obtained from Drakesbane), not through combo. TODO: ?
// NOTE: Adds a charge to `Firstminds' Focus` gauge
// prettier-ignore
const actRaidenThrust = ActionBuilder.CreateBaseGCD("Raiden Thrust", 320)
  .setTimers({ baseCastTime: 0, baseRecastTime: 2.5, applicationTime: 0, animationLock: 0 })
  .setCondition(function() { return this.getStatusEffect("Draconian Fire") })

// Consider: Actions need some manner of "condition" or "requirement" that is checked on runtime.
// Raiden Thrust requires a buff from Drakesbane, Wyrmwind Thrust requires feeling up the eye gauge (states 0,1,2)

/*
Concept of initializing a predefined act list:
insertAction("True Thrust")
insertAction("Spiral Blow")
insertAction("Lance Charge", secondWeave=true)
insertAction("Chaotic Spring")
insertAction("Battle Litany")
insertAction("Geirskogul")
insertAction("Wheeling Thrust")
insertAction("Drakesbane")

in the future: automatically generate a rotation, switching between Spring/Heaven combos and handling relevant gauges.
*/

export const dragoonRotationBasicTest = [
  actTrueThrust,
  actSpiralBlow,
  actChaoticSpring,
  actWheelingThrust,
  actDrakesbane,
  actRaidenThrust,
  actRaidenThrust,
  actLanceBarrage,
  actHeavensThrust,
  actFangAndClaw,
  actDrakesbane,
  actRaidenThrust,
  actSpiralBlow,
  actChaoticSpring,
  actWheelingThrust,
  actDrakesbane,
];
