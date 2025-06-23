import { calculateDamage } from "../math-ffxiv.js";
import { rnd } from "../utils/math-utils.js";

const DOT_TICKRATE = 3;
// const TIME_ADVANCEMENT_PING_DELAY = 0.02;

export class ArrayEx extends Array {
  /** @alias push */
  append(value) {
    super.push(value);
  }

  remove(value) {
    const index = super.indexOf(value);
    if (index !== -1) {
      super.splice(index, 1);
    }
  }

  getByName(name) {
    return super.find((e) => e.name === name);
  }

  /** Creates a deep copy. Should not affect the source array */
  getActive(time) {
    return super.flatMap((e) => {
      return e.startTime <= time && e.endTime >= time ? [e] : [];
    });
  }

  /** Creates a shallow copy. Can affect the source array */
  getActiveShallow(time) {
    return super.filter((e) => e.startTime <= time && e.endTime >= time);
  }
}

export class StandardSimulation {
  #statsOverwrite;
  #cooldowns = new Map();
  #effects = new ArrayEx();
  #dots = [];
  #elapsedTime = 0;
  // #actionList = [];

  constructor(gearset) {
    this.gearset = gearset;
    this.reset();
  }

  /** Does not reset overwritten stats */
  reset() {
    this.#cooldowns.clear();
    this.#effects = new ArrayEx();
    this.#dots = [];
    this.#elapsedTime = 0;
    // this.#actionList = [];

    this.fightDuration = 0;
    this.startingPoint = 0;
    this.lastGCD = null;
    this.events = [];
  }

  /** Base layer of an event object */
  EventObjectBase = function (elapsed, type, name) {
    this.elapsed = rnd(elapsed, 3);
    this.type = type;
    this.name = name;
  };

  /** Appends a regular damage event */
  sendEventAction(name, data) {
    const event = {
      ...new this.EventObjectBase(this.elapsed, "Action", name),
      data: data,
    };
    this.events.push(event);
    return event;
  }

  /** Appends an event with a state */
  sendEventState(type, name, state, data) {
    const event = {
      ...new this.EventObjectBase(this.elapsed, type, name),
      state: state,
      data: data,
    };
    this.events.push(event);
  }

  /** Appends an error event */
  sendEventError(name, error) {
    const event = {
      ...new this.EventObjectBase(this.elapsed, "Error", name),
      message: error,
    };
    this.events.push(event);
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
  }

  get remainingTime() {
    return this.fightDuration - this.elapsed;
  }

  isActive(obj) {
    return obj.startTime <= this.elapsed && obj.endTime >= this.elapsed;
  }

  // returns true if the action cannot be used due to cooldown
  checkCooldown(name) {
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

  getValidActionBuffs(action) {
    const activeBuffs = this.#effects.getActive(this.elapsed).filter((buff) => {
      const usedOn = buff.usedOn?.(action);
      if (usedOn === true) {
        buff.onUse?.(action);
        return true;
      } else if (usedOn === undefined) {
        return true;
      } else {
        return false;
      }
    });
    return activeBuffs;
  }

  getActiveStatus(name) {
    return this.#effects.find((e) => e.name === name && this.isActive(e));
  }

  recordStatus(status, duration, stackDelta) {
    const record = {
      ...status,
      startTime: this.elapsed,
      endTime: this.elapsed + duration,
      stacks: status.stacks + (stackDelta ?? 0),
    };

    this.#effects.push(record);
    return record;
  }

  // Futureproofing NOTE: Some buffs' duration can be extended up to a max. Similar function to this?
  setBuffStacks(buff, stackDelta) {
    const newStacks = buff.stacks + stackDelta;
    // wacky method of clipping
    stackDelta = Math.min(newStacks, buff.maxStacks ?? 1) - buff.stacks;

    if (newStacks <= 0) {
      this.deactivateStatus(buff);
    } else {
      this.recordStatus(buff, buff.duration, stackDelta);
    }
  }

  consumeActiveBuffs(buffs) {
    buffs.forEach((buff) => {
      if (buff.stacks !== -1) {
        this.setBuffStacks(buff, -1);
      }
    });
  }

  deactivateStatus(status) {
    status.endTime = this.elapsed;
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
    const isOnCooldown = this.checkCooldown(action.name);
    if (isOnCooldown) {
      this.sendEventError(action.name, "Action on cooldown.");
      return false;
    }

    const conditionRes = action.condition?.call(this, this);
    if (conditionRes === false) {
      this.sendEventError(action.name, "Action condition failed.");
      return false;
    }

    // TODO: revamp the combo check to not rely on other actions (chain of values)
    //       combos should expire after 30s of no interaction
    const comboValid = action.checkCombo?.(this.lastGCD?.name, this.comboState) ?? true;
    this.comboState = comboValid;

    const potency = comboValid ? action?.comboPotency ?? action.potency : action.potency;
    if (potency < 0) {
      this.sendEventError(action.name, "Followup action unavailable.");
      return false;
    }

    // Buffs snapshot on cast for non-spells and at `castTimer - 0.5s` for spells
    const activeBuffs = this.getValidActionBuffs(action);
    const buffs = this.evaluateBuffs(activeBuffs);
    const damage =
      potency !== 0
        ? calculateDamage(this.gearset.level, this.gearset.jobCode, this.stats, potency, action.type, false, false, buffs)
        : 0;

    this.consumeActiveBuffs(activeBuffs);

    let eventInitData = {
      potency: potency,
      damage: damage,
      applicationDelay: action.applicationTime,
      combo: comboValid,
      effects: activeBuffs,
      buffs: buffs,
    };

    action.statuses?.forEach((status) => {
      if ((status.requireCombo && comboValid) || !status.requireCombo) {
        eventInitData.appliedEffect ??= [];
        const activeStatus = this.getActiveStatus(status.name);
        const refresh = Boolean(activeStatus);

        if (refresh) {
          activeStatus.endTime = this.elapsed;
        }

        // `recordStatus` parameters:
        // If the buff gains duration up to a max, compute & use the new duration (active status deltaTime + status.duration)
        // If the buff gains stacks up to a max, compute & use the new delta

        // if (blablabla buff gains stacks) {
        //  var stacksDelta = something;
        // }

        eventInitData.appliedEffect.push({ ...this.recordStatus(status, status.duration), refreshed: refresh });
        this.sendEventState("Status Effect", status.name, refresh ? "Reapplied" : "Applied", status);
      }
    });

    // Logs show status effects applying before, but not affecting, damage application
    const event = this.sendEventAction(action.name, eventInitData);

    // Can't remember if there are any abilities that apply multiple dots, but even if not, guess this is futureproofing?
    action.dots?.forEach((dot) => {
      if ((dot.requireCombo && comboValid) || !dot.requireCombo) {
        const activeDot = this.getActiveDot(dot.name);
        const dotFound = Boolean(activeDot);

        event.data.appliedDot ??= [];

        if (dotFound) {
          // Cut off active dot's time and set tickCount accordingly
          activeDot.tickCount = this.dotActualTickCount(activeDot, this.elapsed + action.applicationTime);
          activeDot.endTime = this.elapsed + action.applicationTime;
        }
        event.data.appliedDot?.push({ ...this.recordDot(dot, action.applicationTime, buffs), refreshed: dotFound });

        // Refactor NOTE: I dislike how status effects append to eventInitData while dots append to the registered event.
        //  It's done this way to keep the correct order of events (status -> action -> dot)
        //  But these events aren't truly needed when #dots and #effects record all instances of their respective types, and their mutations.
        this.sendEventState("Damage over Time", dot.name, dotFound ? "Reapplied" : "Applied", dot);
      }
    });

    if (action.cooldown) {
      this.setOnCooldown(action);
    }

    return true;
  }

  finalize() {
    // Correcting for timeskip overshooting at the end of a simulation
    this.elapsed = Math.min(this.elapsed, this.fightDuration);

    // iterating over dot applications and calculating their total damage based on
    // the number of actual ticks and their snapshotted damage buffs.
    // Refactor NOTE: action events store applied dots, but these don't share the same reference as #dots records
    //    An easy fix is to change the way new dots are pushed into action events, but maybe a design change is in order?
    //    The same issue likely applies to status effects as well.
    //    Not critical at the moment but would have implications on effective dps later on.
    this.events.forEach((event) => {
      if (event.type !== "Action") {
        return;
      }

      const dots = event.data.appliedDot ?? [];
      for (const dot of dots) {
        // Cut off any ongoing dots
        if (this.isActive(dot)) {
          dot.tickCount = this.dotActualTickCount(dot, this.elapsed);
          dot.endTime = this.elapsed;
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

        dot.totalDamage = { base: consolidated.base * dot.tickCount, expected: consolidated.expected * dot.tickCount };
      }
    });
  }

  simulate(actionList, duration, start = 0, endWhenNoActions = false, simAutoAttacks = true) {
    // this.#actionList = actionList;

    if (simAutoAttacks) {
      var actionAutoAttack = {
        name: "Auto Attack",
        type: "ability",
        potency: this.gearset.job.autoPotency,
        isGCD: false,
        damageType: "physical",
      };
    }

    this.elapsed = start;
    this.fightDuration = duration;
    this.startingPoint = start;

    let index = 0;
    let timeTillGCD = 0;
    let lastActionSuccess = true;
    while (this.elapsed <= this.fightDuration) {
      const action = index < actionList.length ? actionList[index] : null;
      if (action === null && endWhenNoActions) {
        break;
      }

      // snap to GCD if applicable and not clipping
      if (action.isGCD && lastActionSuccess && timeTillGCD > 0) {
        this.elapsed += timeTillGCD;
      }

      lastActionSuccess = this.handleAction(action);
      this.lastGCD = action.isGCD ? action : this.lastGCD;

      // Advance time elapsed TODO: Auto attacks
      if (lastActionSuccess) {
        if (action.isGCD) {
          timeTillGCD = action.baseRecastTime; // +- calculations based on speed stats, haste, instacasts yada yada
          var advance = action.baseCastTime + action.animationLock;
        } else {
          var advance = action.animationLock;
        }

        timeTillGCD -= advance;
        this.elapsed += advance;
      }

      index++;
    }

    this.finalize();
  }
}
