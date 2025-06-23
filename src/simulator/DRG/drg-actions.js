import ActionBuilder from "../action-builder.js";
import * as Statuses from "./drg-statuses.js";

// prettier-ignore
export const actTrueThrust = ActionBuilder.CreateWeaponskill("True Thrust", 230)
  .setTimers({ baseRecastTime: 2.5, applicationTime: 0.76, });

// Upgraded version of Disembowel
export const actSpiralBlow = ActionBuilder.CreateWeaponskill("Spiral Blow", 140)
  .setTimers({ baseRecastTime: 2.5, applicationTime: 1.38 })
  .setComboAction(["True Thrust", "Raiden Thrust"], 300)
  .addStatusEffect(Statuses.PowerSurge, true);

// Upgraded version of Vorpal Thrust
export const actLanceBarrage = ActionBuilder.CreateWeaponskill("Lance Barrage", 130)
  .setTimers({ baseRecastTime: 2.5, applicationTime: 0.935 })
  .setComboAction(["True Thrust", "Raiden Thrust"], 340);

// Upgraded version of Chaos Thrust
export const actChaoticSpring = ActionBuilder.CreateWeaponskill("Chaotic Spring", 180)
  .setTimers({ baseRecastTime: 2.5, applicationTime: 0.445 })
  .setComboAction("Spiral Blow", 340)
  .addDamageOverTime(24, 45, "physical", true); // On successful combo applies a 45p dot for 24s

// Upgraded version of Full Thrust
export const actHeavensThrust = ActionBuilder.CreateWeaponskill("Heaven's Thrust", 160)
  .setTimers({ baseRecastTime: 2.5, applicationTime: 0.71 })
  .setComboAction("Lance Barrage", 460);

export const actWheelingThrust = ActionBuilder.CreateWeaponskill("Wheeling Thrust", 180)
  .setTimers({ baseRecastTime: 2.5, applicationTime: 0.67 })
  .setComboAction("Chaotic Spring", 340);

export const actFangAndClaw = ActionBuilder.CreateWeaponskill("Fang and Claw", 180)
  .setTimers({ baseRecastTime: 2.5, applicationTime: 0.62 })
  .setComboAction("Heaven's Thrust", 340);

// Technically a combo action (Followup Action). Potency is negative (-> invalid) unless requirement met.
export const actDrakesbane = ActionBuilder.CreateWeaponskill("Drakesbane", -1)
  .setTimers({ baseRecastTime: 2.5, applicationTime: 1.65 })
  .setComboAction(["Wheeling Thrust", "Fang and Claw"], 460)
  .addStatusEffect(Statuses.RaidenThrust, true);

// NOTE: Adds a charge to `Firstminds' Focus` gauge
// prettier-ignore
export const actRaidenThrust = ActionBuilder.CreateWeaponskill("Raiden Thrust", 320)
  .setTimers({ baseRecastTime: 2.5, applicationTime: 0.62, })
  .setCondition(function(ctx) { return ctx.getActiveStatus("Draconian Fire") })

export const LifeSurge = ActionBuilder.CreateBaseOGCD("Life Surge", 0)
  .setTimers({ cooldown: 40, applicationTime: 0, charges: 2 })
  .addStatusEffect(Statuses.LifeSurge);

export const LanceCharge = ActionBuilder.CreateBaseOGCD("Lance Charge", 0)
  .setTimers({ cooldown: 60, applicationTime: 0.62 })
  .addStatusEffect(Statuses.LanceCharge);

// Upgraded version of Jump
export const HighJump = ActionBuilder.CreateBaseOGCD("High Jump", 400)
  .setTimers({ cooldown: 30, applicationTime: 0.49, animationLock: 0.8 })
  .addStatusEffect(Statuses.DiveReady);

export const DragonfireDive = ActionBuilder.CreateBaseOGCD("Dragonfire Dive", 500)
  .setTimers({ cooldown: 120, applicationTime: 0.8, animationLock: 0.8 })
  .addStatusEffect(Statuses.DragonsFlight);

export const BattleLitany = ActionBuilder.CreateBaseOGCD("Battle Litany", 0)
  .setTimers({ cooldown: 120, applicationTime: 0.62 })
  .addStatusEffect(Statuses.BattleLitany);

// NOTE: Should account for damage reductions if ever planning to support multi-target simulations.
export const Geirskogul = ActionBuilder.CreateBaseOGCD("Geirskogul", 280)
  .setTimers({ cooldown: 60, applicationTime: 0.67 })
  .addStatusEffect(Statuses.LifeDragon)
  .addStatusEffect(Statuses.NastrondReady);

// prettier-ignore
export const MirageDive = ActionBuilder.CreateBaseOGCD("Mirage Dive", 380)
  .setTimers({ cooldown: 1, applicationTime: 0.8 })
  .setCondition(function(ctx) { return ctx.getActiveStatus("Dive Ready") })

// prettier-ignore
export const Nastrond = ActionBuilder.CreateBaseOGCD("Nastrond", 720)
  .setTimers({ cooldown: 2, applicationTime: 0.76 })
  .setCondition(function(ctx) { return ctx.getActiveStatus("Nastrond Ready") })

// prettier-ignore
export const Stardiver = ActionBuilder.CreateBaseOGCD("Stardiver", 840)
  .setTimers({ cooldown: 30, applicationTime: 1.29, animationLock: 1.5 })
  .setCondition(function(ctx) { return ctx.getActiveStatus("Life of the Dragon"); })
  .addStatusEffect(Statuses.StarcrossReady);

// Consider: Actions need some manner of "condition" or "requirement" that is checked on runtime.
// Raiden Thrust requires a buff from Drakesbane, TODO: Wyrmwind Thrust requires feeling up the eye gauge (states 0,1,2)
// prettier-ignore
export const WyrmwindThrust = ActionBuilder.CreateBaseOGCD("Wyrmwind Thrust", 440)
  .setTimers({ cooldown: 10, applicationTime: 1.2 })
  .setCondition(function(ctx) { return true })

// prettier-ignore
export const RiseoftheDragon = ActionBuilder.CreateBaseOGCD("Rise of the Dragon", 550)
  .setTimers({ cooldown: 1, applicationTime: 1.16 })
  .setCondition(function(ctx) { return ctx.getActiveStatus("Dragon's Flight") })

// NOTE: Action unusable when both conditions aren't met at once. But Starcross Ready will not expire when LotD does, unlike in-game
//       Could there be a scenario where this results in unwanted behaviour?
export const Starcross = ActionBuilder.CreateBaseOGCD("Starcross", 1000)
  .setTimers({ cooldown: 1, applicationTime: 0.985 })
  .setCondition(function (ctx) {
    return ctx.getActiveStatus("Life of the Dragon") && ctx.getActiveStatus("Starcross Ready");
  });

// FIXME: Lock cast and recast time for gcds and ogcds that are not affected by Speed
//        Come to think of it what *about* Speeds? I did not take them into account at all thus far.
//        Flag for combos that can and cannot be interrupted and stopped by another combo. E.g. GNB Gnashing Fang

// in the future: automatically generate a rotation, switching between Spring/Heaven combos and handling relevant gauges.
