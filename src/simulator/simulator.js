import { calculateDamage } from "../math-ffxiv.js";
import { rnd } from "../utils/math-utils.js";
import { SimulationGaugeRecorder } from "./gauge-recorder.js";
import { SimulationStatusRecorder } from "./status-recorder.js";

const DOT_TICKRATE = 3;
const TIME_ADVANCEMENT_PING_DELAY = 0.02;

export class StandardSimulation {
  #statsOverwrite;
  #cooldowns = new Map();
  #dots = [];
  #events = [];
  #elapsedTime = 0;
  // #actionList = [];

  constructor(gearset) {
    this.gearset = gearset;
    this.gauge = new SimulationGaugeRecorder();
    this.status = new SimulationStatusRecorder();

    this.actionAutoAttack = {
      name: "Auto Attack",
      type: "auto",
      potency: this.gearset.job.autoPotency,
      isGCD: false,
      damageType: "physical",
      baseRecastTime: this.stats.delay / 1000,
    };

    this.reset();
  }

  /** Does not reset overwritten stats */
  reset() {
    this.gauge.initialize();
    this.status.initialize();
    this.#cooldowns.clear();
    this.#dots = [];
    this.#events = [];
    this.#elapsedTime = 0;
    // this.#actionList = [];

    this.fightDuration = 0;
    this.startingPoint = 0;
    this.timeTillGCD = 0;
    this.timeTillAuto = 0;
    this.lastGCD = null;
    this.results = {};
  }

  appendEvent(action, data) {
    const event = {
      elapsed: rnd(this.elapsed, 3),
      name: action.name,
      id: action.id,
      data: data,
    };
    this.#events.push(event);
    return event;
  }

  get stats() {
    return this.#statsOverwrite ? this.#statsOverwrite : this.gearset.stats;
  }
  set stats(newStats) {
    this.#statsOverwrite = newStats;
  }

  get elapsed() {
    return this.#elapsedTime;
  }
  set elapsed(time) {
    const delta = time - this.#elapsedTime;
    this.#elapsedTime = time;
    this.status.elapsed = time;
    this.gauge.elapsed = time;
    // advance cooldowns of used abilities. we do be triple nested iffing
    this.#cooldowns.forEach((cd) => {
      if (cd.cooldown > 0) {
        cd.cooldown = Math.max(cd.cooldown - delta, 0);
        if (cd.cooldown === 0) {
          cd.charges++;
          if (cd.charges < cd.maxCharges) {
            cd.cooldown = cd.maxCooldown;
          }
        }
      }
    });

    // Set elapsed time for any tracker objects or complex classes such as GaugeTracker
  }

  get remainingTime() {
    return this.fightDuration - this.elapsed;
  }

  isActive(obj) {
    return obj.startTime <= this.elapsed && obj.endTime >= this.elapsed;
  }

  // returns true if the action cannot be used due to cooldown
  actionOnCooldown(name) {
    const cd = this.#cooldowns.get(name);
    if (cd) {
      return cd.charges > 0 ? false : cd.cooldown > 0 ? true : false;
    }
    return false;
  }

  // Decrements a charge and sets cooldown accordingly
  setOnCooldown(action) {
    const existing = this.#cooldowns.get(action.name);
    if (existing) {
      this.#cooldowns.set(action.name, { ...existing, charges: existing.charges - 1 });
    } else {
      this.#cooldowns.set(action.name, {
        maxCooldown: action.cooldown,
        cooldown: action.cooldown,
        maxCharges: action.charges,
        charges: action.charges - 1,
      });
    }
  }

  #checkCondition(actionCondition) {
    if (!actionCondition) return true;

    if (actionCondition.hasStatus) {
      if (Array.isArray(actionCondition.hasStatus)) {
        for (const name of actionCondition.hasStatus) {
          if (!this.status.getActiveByName(name)) {
            return false;
          }
        }
      } else {
        if (!this.status.getActiveByName(actionCondition.hasStatus)) {
          return false;
        }
      }
    }

    if (actionCondition.hasResource) {
      for (const [name, resource] of Object.entries(actionCondition.hasResource)) {
        const gauge = this.gauge.get(name);
        for (const [trait, value] of Object.entries(resource)) {
          if (gauge[trait] !== value) {
            return false;
          }
        }
      }
    }
    // Add cases as necessary...
    return true;
  }

  getValidActionBuffs(action) {
    const activeBuffs = this.status.getActive().filter((buff) => {
      const usedOn = buff.usedOn?.(action);
      return usedOn || usedOn === undefined;
    });
    return activeBuffs;
  }

  consumeActiveBuffs(buffs) {
    buffs.forEach((buff) => {
      if (buff.stacks !== undefined) {
        this.status.changeStatusStacks(buff, -1);
      }
    });
  }

  evaluateBuffs(buffs) {
    let parsed = {
      damage: 1,
      crit: 0,
      direct: 0,
      autocrit: false,
      autodirect: false,
      //haste: 0,
    };

    buffs.forEach((buff) => {
      const effect = buff.effect;
      if (!effect) {
        return;
      }

      // Minuscule floating point precision errors. Shouldn't have any effect.
      if (effect.damage) {
        parsed.damage *= 1 + effect.damage;
      }
      parsed.crit += effect.crit ?? 0;
      parsed.direct += effect.direct ?? 0;
      // parsed.haste += effect.haste ?? 0;
      parsed.autocrit = parsed.autocrit || (effect.autocrit ?? false);
      parsed.autodirect = parsed.autodirect || (effect.autodirect ?? false);
    });

    parsed.damage = Number((parsed.damage - 1).toPrecision(15));
    return parsed;
  }

  getActiveDot(name) {
    return this.#dots.find((e) => e.name === name && this.isActive(e));
  }

  recordDot(dot, applicationDelay, buffs) {
    const delayTime = this.elapsed + applicationDelay;
    const dotBuffs = {
      damage: buffs.damage,
      crit: buffs.crit,
      direct: buffs.direct,
      // haste?
    };

    const record = {
      name: dot.name,
      duration: dot.duration,
      potency: dot.potency,
      type: dot.type,
      buffs: dotBuffs,
      startTime: delayTime,
      endTime: delayTime + dot.duration,
      // Max possible tick count. Overwritten if dot is refreshed early
      tickCount: dot.duration / DOT_TICKRATE,
    };

    this.#dots.push(record);
    return record;
  }

  // Inaccurate due to the inherent inaccuracy of server ticks
  dotActualTickCount(dot, currentTime) {
    return Math.min(Math.floor(currentTime / DOT_TICKRATE) - Math.floor(dot.startTime / DOT_TICKRATE), dot.tickCount);
  }

  handleAction(action) {
    const isOnCooldown = this.actionOnCooldown(action.name);
    if (isOnCooldown) {
      this.appendEvent(action, { errorMessage: "Action on cooldown." });
      return false;
    }

    const conditionRes = this.#checkCondition(action.condition);
    if (conditionRes === false) {
      this.appendEvent(action, { errorMessage: "Action condition failed." });
      return false;
    }

    // TODO: revamp the combo check to not rely on other actions (chain of values)
    //       combos should expire after 30s of no interaction
    const comboValid = action.checkCombo?.(this.lastGCD?.name, this.comboState) ?? true;
    this.comboState = comboValid;

    const potency = comboValid ? action?.comboPotency ?? action.potency : action.potency;
    if (potency < 0) {
      this.appendEvent(action, { errorMessage: "Followup action unavailable." });
      return false;
    }

    // NOTE: Buffs snapshot on cast for non-spells and at `castTimer - 0.5s` for spells
    const activeBuffs = this.getValidActionBuffs(action);
    activeBuffs.forEach((buff) => {
      buff.onUse?.(action);
    });

    const buffs = this.evaluateBuffs(activeBuffs);
    const damage =
      potency !== 0
        ? calculateDamage(
            this.gearset.level,
            this.gearset.jobCode,
            this.stats,
            potency,
            action.type,
            action.type === "auto" ? true : false,
            false,
            buffs
          )
        : 0;

    this.consumeActiveBuffs(activeBuffs);

    let eventData = {
      potency: potency,
      damage: damage,
      isGCD: action.isGCD,
      applicationDelay: action.applicationTime,
      combo: comboValid,
      effects: activeBuffs,
      buffs: buffs,
    };

    action.statusInfo?.forEach((status) => {
      if ((status.requireCombo && comboValid) || !status.requireCombo) {
        eventData.appliedEffect ??= [];

        const isRefresh = this.status.activateStatus(status);
        eventData.appliedEffect.push({ status: status.name, refreshed: isRefresh });
      }
    });

    action.dotInfo?.forEach((dot) => {
      if ((dot.requireCombo && comboValid) || !dot.requireCombo) {
        eventData.appliedDot ??= [];

        const activeDot = this.getActiveDot(dot.name);
        if (activeDot) {
          // Cut off active dot's time and set tickCount accordingly
          activeDot.tickCount = this.dotActualTickCount(activeDot, this.elapsed + action.applicationTime);
          activeDot.endTime = this.elapsed + action.applicationTime;
          activeDot.duration = activeDot.endTime - activeDot.startTime;
        }
        // a "refresh" property is omitted to keep the object reference
        // (though I could make it a function parameter, but it still serves no purpose at the moment)
        eventData.appliedDot.push(this.recordDot(dot, action.applicationTime, buffs));
      }
    });

    // Logs show status effects applying before, but not affecting, damage application
    this.appendEvent(action, eventData);

    action.gaugeInfo?.forEach((info) => {
      // Are there any actions that modify job gauge without a successful combo?
      // if ((dot.requireCombo && comboValid) || !dot.requireCombo)
      const gauge = this.gauge.get(info.name);

      gauge.count = gauge.count + info.changeCount;
      gauge.time = info.setTime;

      if (info.shouldResetGauge) {
        gauge.reset();
      }
    });

    if (action.cooldown) {
      this.setOnCooldown(action);
    }

    return true;
  }

  advanceBy(time, shouldAdvanceAuto) {
    // check if we're intersecting an auto attack use.
    // If so, advance to it, handle it, then subtract from the total time we're advancing by
    if (shouldAdvanceAuto) {
      if (this.timeTillAuto <= time) {
        this.elapsed += this.timeTillAuto;
        this.timeTillGCD -= this.timeTillAuto;
        time -= this.timeTillAuto;

        this.handleAction(this.actionAutoAttack);

        // TODO: Affected by certain buffs (e.g. Riddle of Wind). Speed stat affects damage
        this.timeTillAuto = this.actionAutoAttack.baseRecastTime;
      }
    }

    this.timeTillGCD -= time;
    this.timeTillAuto -= shouldAdvanceAuto ? time : 0;
    this.elapsed += time;
  }

  simulate(actionList, duration, start = 0, endWhenNoActions = false, simAutoAttacks = true) {
    // this.#actionList = actionList;

    // Reassigning recast time in case stats got overwritten
    this.actionAutoAttack.baseRecastTime = this.stats.delay / 1000;

    this.elapsed = start;
    this.fightDuration = duration;
    this.startingPoint = start;
    this.timeTillGCD = 0;
    this.timeTillAuto = 0;

    let index = 0;
    let timeCommited = 0;
    let lastActionSuccess = true;

    while (this.elapsed < this.fightDuration) {
      const action = index < actionList.length ? actionList[index] : null;
      if (!action) {
        if (!endWhenNoActions && simAutoAttacks && this.remainingTime > this.timeTillAuto) {
          // rapid fire all remaining autoattacks
          this.advanceBy(this.timeTillAuto, simAutoAttacks);
          continue;
        }
        break;
      }

      if (action.isGCD && this.timeTillGCD - timeCommited > 0) {
        // advance to GCD
        this.advanceBy(this.timeTillGCD, simAutoAttacks);
      } else {
        this.advanceBy(timeCommited, simAutoAttacks);
      }

      timeCommited = 0;
      lastActionSuccess = this.handleAction(action);
      this.lastGCD = action.isGCD ? action : this.lastGCD;

      if (lastActionSuccess) {
        if (action.isGCD) {
          // TODO: +- calculations based on speed stats, haste, instacasts yada yada
          this.timeTillGCD = action.baseRecastTime;
          timeCommited = action.baseCastTime;
        }
        timeCommited += action.animationLock + TIME_ADVANCEMENT_PING_DELAY;
      }

      index++;
    }

    return this.finalize();
  }

  finalize() {
    let totalDamage = { raw: 0, exp: 0 };

    // Correcting for timeskip overshooting at the end of a simulation
    this.elapsed = Math.min(this.elapsed, this.fightDuration);

    // iterating over dot applications and calculating their total damage based on
    // the number of actual ticks and their snapshotted damage buffs.
    this.#events.forEach((event) => {
      const dots = event.data.appliedDot ?? [];
      for (const dot of dots) {
        // Cut off any ongoing dots
        if (this.isActive(dot) || dot.startTime > this.elapsed) {
          dot.tickCount = this.dotActualTickCount(dot, this.elapsed);
          dot.endTime = this.elapsed;
          dot.duration = dot.endTime - dot.startTime;
        }

        const consolidated = calculateDamage(
          this.gearset.level,
          this.gearset.jobCode,
          this.stats,
          dot.potency,
          dot.type,
          false,
          true,
          dot.buffs
        );

        dot.damage = { raw: consolidated.raw * dot.tickCount, expected: consolidated.expected * dot.tickCount };

        totalDamage.raw += dot.damage.raw;
        totalDamage.exp += dot.damage.expected;
      }
      totalDamage.raw += event.data.damage?.raw ?? 0;
      totalDamage.exp += event.data.damage?.expected ?? 0;
    });

    const gaugeData = this.gauge.finalize();
    const statusData = this.status.finalize();
    this.results = {
      gaugeInfo: gaugeData.gauges,
      action: this.#events,
      status: statusData,
      gauge: gaugeData.records,
      time: this.elapsed,
      dps: { raw: totalDamage.raw / this.elapsed, expected: totalDamage.exp / this.elapsed },
    };

    return this.results;
  }
}
