/**
 * Job Gauge object. Contains data on a certain Job resource.
 */
class Gauge {
  #parent;
  #count;
  #time;

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

    Object.defineProperties(this, {
      maxCount: {
        value: spec.maxCount ?? Infinity,
        writable: false,
      },
      initCount: {
        value: spec.initCount ?? 0,
        writable: false,
      },
      maxTime: {
        value: spec.maxTime ?? Infinity, // lasts forever?
        writable: false,
      },
      initTime: {
        value: spec.initTime ?? 0,
        writable: false,
      },
    });

    this.#count = spec.initCount ?? 0;
    // TEMP: Bad design. I don't want to be spammed by records when the elapsed time advances
    //  but #time must be constantly modified for any checks against it to work
    this.#time = spec.initTime ?? 0;
  }

  get count() {
    return this.#count;
  }

  set count(value) {
    if (this.#count !== undefined && value !== this.#count) {
      const clamped = Math.max(Math.min(value, this.maxCount), 0);
      this.#parent.addRecord(this, { count: clamped });
      this.#count = clamped;
    }
  }

  get time() {
    return this.#time;
  }

  set time(value) {
    if (this.#time !== undefined && value !== this.#time && !isNaN(value)) {
      const clamped = Math.max(Math.min(value, this.maxTime), 0);
      this.#parent.addRecord(this, { time: clamped });
      this.#time = clamped;
    }
  }

  reset() {
    this.#parent.addRecord(this, { count: this.initCount, time: this.initTime });
    this.#count = this.initCount;
    this.#time = this.initTime;
  }
}

export class SimulationGaugeRecorder {
  #currTime;
  #gauges = [];
  #records;
  #finalized;

  /** Manually call `initialize()` ! */
  constructor() {}

  get gauges() {
    return this.#gauges;
  }

  set elapsed(value) {
    this.#currTime = value;
  }

  /** Will NOT clear gauge elements stored */
  initialize() {
    this.#currTime = 0;
    this.#gauges.forEach((gauge) => gauge.reset(0));
    this.#records = [];
    this.#finalized = false;
  }

  createGauge(name, gaugeSpec) {
    const gauge = new Gauge(this, name, gaugeSpec);
    this.#gauges.push(gauge);
    return gauge;
  }

  addRecord(gauge, newValues) {
    const record = {
      elapsed: this.#currTime,
      name: gauge.name,
      count: gauge.count,
      time: gauge.time,
      newCount: newValues.count ?? gauge.count,
      newTime: newValues.time ?? gauge.time,
    };
    this.#records.push(record);
  }

  // getByName but seeing as there aren't any other values by which to fetch a gauge, byName becomes the default
  get(name) {
    return this.gauges.find((gauge) => gauge.name === name);
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
