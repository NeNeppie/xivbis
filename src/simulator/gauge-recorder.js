/**
 * Job Gauge object. Contains data on a certain Job resource.
 */
class Gauge {
  #maxCount;
  #initCount;
  #count;
  #maxTime;
  #initTime;
  #time;
  #parent;

  /**
   * @param {object} thisArg Owner of the Gauge object
   * @param {string} name Name of the Gauge object
   * @param {object} spec Specification on the job resource.
   *                      An object containing the following optional fields:
   *                      `maxCount`, `initCount`, `maxTime`, `initTime`
   */
  constructor(thisArg, name, spec) {
    this.name = name;
    this.#parent = thisArg;

    // Stacks-based gauges tend to count up
    this.#maxCount = spec.maxCount ?? Infinity;
    this.#initCount = spec.initCount ?? 0;
    this.#count = spec.initCount ?? 0;

    // Time-based gauges tend to count down
    this.#maxTime = spec.maxTime ?? Infinity; // lasts forever?
    this.#initTime = spec.initTime ?? 0;
    // TEMP: Bad design. I don't want to be spammed by records when the elapsed time advances
    //  but #time must be constantly modified for any checks against it to work
    this.#time = spec.initTime ?? 0;
  }

  get count() {
    return this.#count;
  }
  set count(value) {
    if (this.#count !== undefined && value !== this.#count) {
      const clamped = Math.max(Math.min(value, this.#maxCount), 0);
      this.#parent.addRecord(this, { count: clamped });
      this.#count = clamped;
    }
  }

  get maxCount() {
    return this.#maxCount;
  }

  get initCount() {
    return this.#initCount;
  }

  get time() {
    return this.#time;
  }
  set time(value) {
    if (this.#time !== undefined && value !== this.#time) {
      const clamped = Math.max(Math.min(value, this.#maxTime), 0);
      this.#parent.addRecord(this, { time: clamped });
      this.#time = clamped;
    }
  }

  get maxTime() {
    return this.#maxTime;
  }

  get initTime() {
    return this.#initTime;
  }

  reset() {
    this.#parent.addRecord(this, { count: this.#initCount, time: this.#initTime });
    this.count = this.#initCount;
    this.time = this.#initTime;
  }
}

export class SimulationGaugeRecorder {
  // List of Gauge elements.
  #gauges = [];
  // Records all gauge changes. Exported when `finalize()` is called
  #records;
  // Indicates `finalize()` has been called
  #finalized;

  constructor(simTimeElapsed) {
    this.initialize(simTimeElapsed);
  }

  get gauges() {
    return this.#gauges;
  }

  /** Will NOT clear gauge elements stored */
  initialize(simTimeElapsed) {
    this.#records = [];
    this.#finalized = false;
    this.elapsed = simTimeElapsed; // DEBUG: Check if local elapsed changes with simulator's elapsed
  }

  createGauge(name, gaugeSpec) {
    const gauge = new Gauge(this, name, gaugeSpec);
    this.#gauges.push(gauge);
    return gauge;
  }

  // getByName but seeing as there aren't any other values by which to fetch a gauge, byName becomes the default
  get(name) {
    return this.gauges.find((gauge) => gauge.name === name);
  }

  addRecord(gauge, newValues) {
    const record = {
      elapsed: this.elapsed, // DEBUG: Check if local elapsed changes with simulator's elapsed
      name: gauge.name,
      count: gauge.count,
      time: gauge.time,
      newCount: newValues.count ?? gauge.count,
      newTime: newValues.time ?? gauge.time,
    };
    this.#records.push(record);
  }

  // NOTE: Assumes records are sorted by elapsed time.
  #getLatestRecord(gaugeName) {
    this.#records.toReversed().find((record) => record.name === gaugeName);
  }

  finalize() {
    this.#finalized = true;

    const data = {
      gauges: this.#gauges.map((gauge) => {
        return {
          name: gauge.name,
          maxCount: gauge.maxCount,
          initCount: gauge.initCount,
          maxTime: gauge.maxTime,
          initTime: gauge.initTime,
        };
      }),
      records: this.#records, // Assumes records are presorted by elapsed time
    };
    return data;
  }
}
