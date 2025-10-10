import { rnd } from "../utils/math-utils.js";

export class SimulationStatusRecorder {
  #currTime;
  #records;
  #finalized;

  /** Manually call `initialize()` ! */
  constructor() {}

  set elapsed(value) {
    this.#currTime = value;
  }

  #isActive(status) {
    return status.startTime <= this.#currTime && status.endTime >= this.#currTime;
  }

  initialize() {
    this.#currTime = 0;
    this.#records = [];
    this.#finalized = false;
  }

  activateStatus(status) {
    const activeStatus = this.getActiveByName(status.name);
    const refresh = Boolean(activeStatus);

    if (refresh) {
      this.deactivateStatus(activeStatus);
    }

    this.addRecord(status);
    return refresh;
  }

  deactivateStatus(status) {
    status.endTime = this.#currTime;
  }

  addRecord(status, stacks, forceRefresh = true) {
    const record = {
      ...status,
      startTime: this.#currTime,
      endTime: forceRefresh ? this.#currTime + status.duration : status.endTime,
      stacks: stacks ?? status.stacks,
    };
    this.#records.push(record);
  }

  // Futureproofing NOTE: Some buffs' duration can be extended up to a max. Similar function to this?
  changeStatusStacks(status, stackDelta) {
    let newStacks = status.stacks + stackDelta;
    // wacky method of clipping
    newStacks = Math.min(newStacks, status.maxStacks ?? 1);

    if (newStacks <= 0) {
      this.deactivateStatus(status);
    } else {
      this.addRecord(status, newStacks, status.refreshOnStackChange ?? false);
    }
  }

  /** Creates a deep copy. Should not affect the source array */
  getActive() {
    return this.#records.flatMap((e) => {
      return this.#isActive(e) ? [e] : [];
    });
  }

  /** Creates a shallow copy. Can affect the source array */
  getActiveShallow() {
    return this.#records.filter((e) => {
      this.#isActive(e);
    });
  }

  getActiveByName(name) {
    return this.#records.find((status) => this.#isActive(status) && status.name === name);
  }

  finalize() {
    this.#finalized = true;

    for (const record of this.#records) {
      if (record.endTime > this.#currTime) {
        record.endTime = this.#currTime;
      }
      record.startTime = rnd(record.startTime, 3);
      record.endTime = rnd(record.endTime, 3);
      record.duration = rnd(record.endTime - record.startTime, 3);
    }

    return this.#records;
  }
}
