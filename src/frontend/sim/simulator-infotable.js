import { CustomTable, getIconUrl } from "../ui-core.js";

class InfotableBase extends CustomTable {
  #gearset;

  constructor() {
    super();
    this.customHeaders = [];
    this.classList.add("infotable");
  }

  build(gearset, name = "standard") {
    this.#gearset = gearset;
    const tbody = this.tBodies[0];
    tbody.innerHTML = "";

    const simulation = this.#gearset.simulations.find((s) => s.name === name);
    if (!simulation?.data) {
      console.warn("Attempted to construct simulation infotable without simulation data");
      return;
    }

    const simData = simulation.data;
    const filteredRecords = this.filterCallback(simData);

    for (const record of filteredRecords) {
      const row = tbody.insertRow();
      for (const header of this.customHeaders) {
        const cell = row.insertCell();
        cell.innerHTML = header.callback(record);
        cell.classList.add(...header.colClasses);
      }
    }
  }
}

/** Formats a number to MM:SS.MS */
function secondsToDigital(value) {
  value = value.toFixed(2);
  const integer = value | 0;
  var minutes = (integer / 60) | 0;
  var seconds = integer % 60;
  var milliseconds = (value + "").split(".")[1] ?? "0";

  minutes = ("" + minutes).padStart(2, "0");
  seconds = ("" + seconds).padStart(2, "0");
  milliseconds = milliseconds.padEnd(2, "0");

  return `${minutes}:${seconds}.${milliseconds}`;
}

export class DamageInfotable extends InfotableBase {
  constructor(gearset) {
    super(gearset);
    this.customHeaders = [
      {
        name: "Time",
        callback: (record) => {
          return secondsToDigital(record.elapsed);
        },
        colWidth: 64,
      },
      {
        name: "",
        callback: (record) => {
          return record.id ? `<img src=${getIconUrl(record.id)}>` : `<img src="src/frontend/assets/autoattack.svg">`;
        },
        colWidth: 24,
      },
      {
        name: "Name",
        callback: (record) => {
          return record.name;
        },
        colClasses: ["overflow"],
      },
      {
        name: "Pot",
        callback: (record) => {
          return record.data.potency;
        },
        colWidth: 48,
      },
      {
        name: "Est. Damage",
        callback: (record) => {
          const dotDamage = record.data.appliedDot?.reduce((damage, curr) => damage + curr.damage.expected, 0) ?? 0;
          const actionDamage = record.data.damage.expected ?? 0;
          const total = dotDamage + actionDamage;
          return total !== 0 ? total.toFixed(2) : "";
        },
        colWidth: 100,
      },
      {
        name: "Active Buffs",
        callback: (record) => {
          let html = "";
          if (record.data.buffs.damage > 0) {
            html += `<span>+${record.data.buffs.damage * 100}% dmg</span>`;
          }
          for (const status of record.data.effects) {
            if (status.id) {
              html += `<img class="buff-icon-small" src=${getIconUrl(status.id)}>`;
            }
          }
          return html;
        },
        colClasses: ["overflow"],
      },
    ];

    this.filterCallback = (data) => data.action;
  }
}

export class StatusInfotable extends InfotableBase {
  constructor(gearset) {
    super(gearset);
    this.customHeaders = [
      {
        name: "Time",
        callback: (record) => {
          return secondsToDigital(record.startTime);
        },
        colWidth: 64,
      },
      {
        name: "",
        callback: (record) => {
          return record.id ? `<img src=${getIconUrl(record.id)}>` : "<div></div>";
        },
        colWidth: 24,
      },
      {
        name: "Name",
        callback: (record) => {
          return record.name;
        },
        colClasses: ["overflow"],
      },
      {
        name: "Expires",
        callback: (record) => {
          return secondsToDigital(record.endTime);
        },
        colWidth: 64,
      },
      {
        name: "Dur",
        callback: (record) => {
          return `${record.duration.toFixed(2)}s`;
        },
        colWidth: 48,
      },
      {
        // TODO: Maybe remove in favor of hover effect on name or icon
        // or css a title-attribute equivalent to the overflow class. Would be handy in general
        name: "Description",
        callback: (record) => {
          return record.description;
        },
        colClasses: ["overflow"],
      },
    ];

    this.filterCallback = (data) => data.status;
  }
}

export class GaugeInfotable extends InfotableBase {
  constructor(gearset) {
    super(gearset);
    this.customHeaders = [
      {
        name: "Time",
        callback: (record) => {
          // record.elapsed?
          return secondsToDigital(record.elapsed);
        },
        colWidth: 64,
      },
      {
        name: "Name",
        callback: (record) => {
          return record.name;
        },
        colClasses: ["overflow"],
      },
      {
        name: "State",
        callback: (record) => {
          return `${record.count} -> ${record.newCount} | ${record.time}s -> ${record.newTime}s`; // TODO: custom display of job resource ala xivgear
        },
        colWidth: 150,
        colClasses: ["align-center"],
      },
    ];

    this.filterCallback = (data) => data.gauge;
  }
}

// Action infotable
// Timestamp | Icon | Name | Potency | Exp. Damage |

// Status Effect infotable
// Timestamp | Icon | Name | Duration | Description

// Gauge infotable?
// Timestamp | [] | Name | Delta? | State

// Common columns: Timestamp, Icon/blank, Name, Data1, Data2

// --------- Layout
// | d | b |  d - damage
// | d | b |  b - buffs
// | d |---|  g - gauge
// | d | g |
// | d | g |
// ---------

if (!customElements.get("sim-infotable-damage"))
  customElements.define("sim-infotable-damage", DamageInfotable, { extends: "table" });
if (!customElements.get("sim-infotable-status"))
  customElements.define("sim-infotable-status", StatusInfotable, { extends: "table" });
if (!customElements.get("sim-infotable-gauge"))
  customElements.define("sim-infotable-gauge", GaugeInfotable, { extends: "table" });
