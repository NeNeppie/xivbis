import { Gearset } from "../gearset.js";
import { calculateDamage } from "../math-ffxiv.js";
import { rnd, sumObjectsByKey } from "../utils/math-utils.js";
import { dragoonRotationBasicTest } from "./drg-actions.js";
import { TrackerArray, TrackerBase } from "./tracker-utils.js";

const DOT_TICKRATE = 3;

class TimeTrackerSimulation {
  /** Tracker type made for registering Auto Attack events */
  static TrackerAutos = class TrackerAutos extends TrackerBase {
    #context;

    eventType = "Auto Attack";
    eventName = this.eventType;

    constructor(ctx, potency) {
      super();
      this.#context = ctx;
      this.potency = potency;
    }

    generateEvent(level, jobCode, stats) {
      super.generateEvent();

      const buffs = {
        damage: Math.min(
          1,
          this.#getUnlimitedBuffsByType("damage")?.reduce((total, status) => total + status.effect.amount, 0)
        ),
        crit: Math.min(
          1,
          this.#getUnlimitedBuffsByType("crit").reduce((total, status) => total + status.effect.amount, 0)
        ),
        direct: Math.min(
          1,
          this.#getUnlimitedBuffsByType("directhit").reduce((total, status) => total + status.effect.amount, 0)
        ),
      };

      const damage = calculateDamage(level, jobCode, stats, this.potency, true, false, buffs);
      this.timer = stats.delay;
      this.#context.sendEventDamage(this.eventType, this.eventName, this.potency, damage);
    }

    #getUnlimitedBuffsByType(type) {
      return this.#context.trackers.getActiveTrackersByType("Status Effect")?.flatMap((e) => {
        if (e.effect.type === type && e.effect.uses === -1) {
          return [e];
        } else {
          return [];
        }
      });
    }
  };

  /** Tracker type made for registering GCD events.
   *  Also acts as a builder for 'lesser' Trackers that tie to specific actions */
  static TrackerGlobalCooldown = class TrackerGlobalCooldown extends TrackerBase {
    #context;
    #predefinedGCDList = [];

    eventType = "Global Cooldown";
    gcdStepper = {
      iterator: undefined,
      current: null,
      prev: null,
      prevSuccess: false,
      done: false,

      advance(success) {
        const iterStep = this.iterator.next();
        this.prev = this.current;
        this.current = iterStep.value;
        this.prevSuccess = success;
        this.done = iterStep.done;
      },
    };

    constructor(ctx) {
      super();
      this.#context = ctx;
    }

    /** @param {array} value*/
    set predefinedGCDList(value) {
      this.#predefinedGCDList = value;
      this.gcdStepper.iterator = value[Symbol.iterator]();
      this.gcdStepper.advance();
    }

    generateEvent(level, jobCode, stats) {
      super.generateEvent();
      const currAction = this.gcdStepper.current;
      const prevAction = this.gcdStepper.prev;

      const conditionRes = currAction.condition?.call(this);
      if (conditionRes === false) {
        this.#context.sendEventError(this.eventType, this.eventName, `Action nonexecutable due to missing condition.`);
        this.gcdStepper.advance(false);
        return;
      }

      // FIXME: starting a combo from the middle will count future actions as combo'd correctly which is obviously unintended.
      const isCombo = currAction.checkCombo?.(prevAction?.name) && this.gcdStepper.prevSuccess;

      let potency = currAction.potency;
      if (isCombo) {
        potency = currAction.comboPotency;
      }

      this.#handleActionStatuses(currAction, isCombo);

      const damageStatusEffects = this.#getBuffsByType("damage");
      const critRateStatusEffects = this.#getBuffsByType("crit");
      const directHitRateStatusEffects = this.#getBuffsByType("directhit");

      const buffs = {
        damage: Math.min(
          1,
          damageStatusEffects?.reduce((total, status) => total + status.effect.amount, 0)
        ),
        crit: Math.min(
          1,
          critRateStatusEffects?.reduce((total, status) => total + status.effect.amount, 0)
        ),
        direct: Math.min(
          1,
          directHitRateStatusEffects?.reduce((total, status) => total + status.effect.amount, 0)
        ),
      };
      const damage = calculateDamage(level, jobCode, stats, potency, false, false, buffs);

      this.#handleActionDoTs(currAction, isCombo, buffs);

      let usedStatusEffects = [damageStatusEffects, critRateStatusEffects, directHitRateStatusEffects];
      if (conditionRes) usedStatusEffects.push(conditionRes);
      this.#consumeStatusEffects(usedStatusEffects);

      this.eventName = currAction.name;
      this.timer = currAction.baseRecastTime;

      this.gcdStepper.advance(true);

      let eventData = {
        combo: isCombo,
      };
      this.#context.sendEventDamage(this.eventType, this.eventName, potency, damage);
    }

    #handleActionDoTs(action, isComboSuccess, buffs) {
      action.dots?.forEach((dot) => {
        if ((dot.onSuccessfulCombo && isComboSuccess) || !dot.onSuccessfulCombo) {
          // Create / Refresh dot tracker.
          let dotTracker = this.#context.trackers.getTrackerByName(dot.name);
          if (dotTracker) {
            dotTracker.refresh(dot.potency, dot.duration, buffs);
          } else {
            dotTracker = new TimeTrackerSimulation.TrackerDoT(this.#context, dot.name, dot.potency, dot.duration, buffs);
            this.#context.trackers.append(dotTracker);
          }
        }
      });
    }

    #handleActionStatuses(action, isComboSuccess) {
      action.statuses?.forEach((status) => {
        if ((status.onSuccessfulCombo && isComboSuccess) || !status.onSuccessfulCombo) {
          // Create / Refresh status tracker.
          let statusTracker = this.#context.trackers.getTrackerByName(status.name);
          if (statusTracker) {
            statusTracker.refresh(status.duration);
          } else {
            statusTracker = new TimeTrackerSimulation.TrackerStatus(this.#context, status);
            this.#context.trackers.append(statusTracker);
          }
        }
      });
    }

    getStatusEffect(name) {
      return this.#context.trackers.getActiveTrackersByType("Status Effect").getTrackerByName(name);
    }

    #getBuffsByType(type) {
      return this.#context.trackers.getActiveTrackersByType("Status Effect")?.flatMap((e) => {
        if (e.effect.type === type) {
          return [e];
        } else {
          return [];
        }
      });
    }

    #consumeStatusEffects(statuses) {
      for (const status of statuses.flat(1)) {
        const effect = status.effect;
        if (effect.uses !== -1) {
          effect.uses -= 1;
        }
        if (effect.uses === 0) {
          status.active = false;
        }
      }

      // Unsure now why I decided to split this function into 2. There was probably a good reason that I'll rediscover later on.
      // for (const tracker of this.#context.trackers.getTrackersByType("Status Effect")) {
      //   if (tracker.effect.uses === 0) {
      //     tracker.active = false;
      //   }
      // }
    }
  };

  /** Tracker type made for registering Damage over Time events. */
  static TrackerDoT = class TrackerDoT extends TrackerBase {
    #context;
    eventType = "Damage over Time";

    constructor(ctx, name, potency, duration, effects) {
      super();
      this.#context = ctx;
      this.eventName = name;
      this.refresh(potency, duration, effects, true);
    }

    generateEvent(level, jobAbbr, stats) {
      super.generateEvent();
      if (this.duration === 0) {
        this.active = false;
        return;
      }

      const damage = calculateDamage(level, jobAbbr, stats, this.potency, false, true, this.snapshottedEffects);
      this.timer = DOT_TICKRATE;
      this.#context.sendEventDamage(this.eventType, this.eventName, this.potency, damage);
    }

    refresh(potency, newDuration, snapshottedEffects, isNew = false) {
      this.potency = potency;
      this.duration = newDuration;
      this.timer = 0; // In reality the first tick is held till the next server tick
      this.snapshottedEffects = snapshottedEffects;
      this.active = true;

      let state = "Reapplied";
      if (isNew) {
        state = "Applied";
      }

      this.#context.sendEventWithState(this.eventType, this.eventName, state, {
        potency: potency,
        duration: this.duration,
        snapshots: this.snapshottedEffects,
      });
    }
  };

  /** Special Tracker type made for handling various status effects applied by various means */
  static TrackerStatus = class TrackerStatus extends TrackerBase {
    #context;

    eventType = "Status Effect";

    constructor(ctx, effect) {
      super();
      this.#context = ctx;
      this.eventName = effect.name;
      this.duration = effect.duration;
      this.timer = Infinity;
      this.effect = effect;
      this.#context.sendEventWithState(this.eventType, this.eventName, "Applied", effect);
    }

    refresh(newDuration) {
      this.duration = newDuration;
      this.active = true;
      this.#context.sendEventWithState(this.eventType, this.eventName, "Reapplied", this.effect);
    }
  };

  events = [];
  elapsed = 0;

  constructor(gearset) {
    this.gearset = gearset;

    this.trackers = new TrackerArray();
    this.trackers.append(new TimeTrackerSimulation.TrackerGlobalCooldown(this));
    this.trackers.append(new TimeTrackerSimulation.TrackerAutos(this, this.gearset.job.autoPotency));
  }

  /** Base layer of an event object */
  EventObjectBase = function (elapsed, type, name, category) {
    this.elapsed = rnd(elapsed, 3);
    this.category = category;
    this.type = type;
    this.name = name;
  };

  /** Appends a regular damage event */
  sendEventDamage(type, name, potency, damageObj) {
    const event = {
      ...new this.EventObjectBase(this.elapsed, type, name, "Damage"),
      potency: potency,
      damage: damageObj,
    };
    this.events.push(event);
  }

  /** Appends an event with a state */
  sendEventWithState(type, name, state, data) {
    const event = {
      ...new this.EventObjectBase(this.elapsed, type, name, "State"),
      state: state,
      data: data,
    };
    this.events.push(event);
  }

  /** Appends an error event */
  sendEventError(type, name, error) {
    const event = {
      ...new this.EventObjectBase(this.elapsed, type, name, "Error"),
      message: error,
    };
    this.events.push(event);
  }

  extractGCDsFromActionList(actions) {
    return actions.flatMap((action) => {
      if (action.isGCD) {
        return [action];
      } else {
        return [];
      }
    });
  }

  simCombatLoop(stats, predefinedActions, duration = 60, startingPoint = 0, endSimWhenPredefActionsEnd = false) {
    this.elapsed = startingPoint;
    const trackerGCD = this.trackers[0];

    const gcds = this.extractGCDsFromActionList(predefinedActions);
    trackerGCD.predefinedGCDList = gcds;

    while (this.elapsed <= duration) {
      // Event generation loop
      for (let tracker of this.trackers) {
        if (tracker.timer === 0 && tracker.active) {
          tracker.generateEvent(100, "DRG", stats);
        }
      }

      if (trackerGCD.gcdStepper.done && trackerGCD.active) {
        if (endSimWhenPredefActionsEnd) {
          break;
        } else {
          trackerGCD.active = false;
        }
      }

      // Time advancing loop
      const activeTrackers = this.trackers.getActive();
      const timeSkip = Math.min(...activeTrackers.map((tracker) => tracker.timer ?? Infinity));
      for (let tracker of activeTrackers) {
        tracker.timer -= timeSkip;

        if (tracker.eventType === "Damage over Time" || tracker.eventType === "Status Effect") {
          tracker.duration -= timeSkip;
          if (tracker.duration <= 0) {
            tracker.active = false;
            // tracker.data is currently always undefined due to individual implementation of each tracker
            // Do I really need to include data for expired dots and effects?
            this.sendEventWithState(tracker.eventType, tracker.eventName, "Expired", tracker.data);
          }
        }
      }
      this.elapsed += timeSkip;
    }

    // Correcting for timeskip overshooting at the end of a simulation
    if (this.elapsed > duration) {
      this.elapsed = duration;
    }

    console.log("### Simulation Complete ###");
    this.printSimulationInformation();
  }

  getEventTotalDamageByType(type) {
    const damageInstances = this.events.flatMap((event) => {
      if (event.type === type && event.damage) return [event.damage];
      else return [];
    });
    try {
      return damageInstances.reduce((total, instance) => {
        return {
          base: total.base + instance?.base ?? 0,
          expected: total.expected + instance?.expected ?? 0,
        };
      });
    } catch {
      return { base: 0, expected: 0 };
    }
  }

  printSimulationInformation() {
    console.table(this.events);

    // Great Googly Moogly
    console.log(`Time Elapsed: ${this.elapsed} Seconds. \nTracker Information:`);
    let totalDamage = {};
    this.trackers.forEach((tracker) => {
      const trackerDamage = this.getEventTotalDamageByType(tracker.eventType);
      totalDamage = sumObjectsByKey(totalDamage, trackerDamage);

      const logMsg = `\tType: ${tracker.eventType}, ${
        tracker.eventType === "Status Effect" || tracker.eventType === "Damage over Time" ? `Name: ${tracker.eventName}, ` : ""
      }Hits: ${tracker.triggerCounter}, Damage: ${trackerDamage.expected.toFixed(2)}`;

      console.log(logMsg);
    });
    console.log(`Total Damage: { base: ${totalDamage.base}, expected: ${totalDamage.expected} }`);

    const dps = {
      base: (totalDamage.base / this.elapsed).toFixed(3),
      expected: (totalDamage.expected / this.elapsed).toFixed(3),
    };
    console.log(`Base DPS: ${dps.base}, Expected DPS: ${dps.expected}`);
  }
}

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

/*
As a proof of concept I'll use:
`Dragoon` for all abilities, and
`Spear Eternal` for the weapon .
*/

const simulator = new TimeTrackerSimulation(debugGearset);
simulator.simCombatLoop(simulator.gearset.debugStats, dragoonRotationBasicTest, 60);
