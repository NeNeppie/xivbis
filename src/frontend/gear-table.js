import { jobs } from "../constants/jobstats.js";
import { convertParamToAbbr, paramToAbbr } from "../gearset.js";
import { sumObjectsByKey } from "../utils/math-utils.js";

export class GearTableContainer {
  gearTables = [];

  constructor(dataManager, gearset) {
    this.dataManager = dataManager;
    this.gearset = gearset;

    var div = document.getElementById("gear-pair-left");
    for (const id of ["weapon", "head", "body", "hands", "legs", "feet"]) {
      this.#addTable(id, div);
    }
    div = document.getElementById("gear-pair-right");
    for (const id of ["offhand", "ears", "neck", "wrists", "leftring", "rightring"]) {
      this.#addTable(id, div);
    }

    this.#populateTables(this.gearset.job);
  }

  #addTable(id, div) {
    let table = new GearTable(this.gearset.job);
    table.id = id;
    this.gearTables.push(table);
    div.appendChild(table);
  }

  #populateTables(job) {
    for (const item of this.dataManager.itemsGear
      .filter((item) => item.gearJob.includes(job))
      .sort((a, b) => a.itemLevel - b.itemLevel)) {
      if (item.gearTypeID === "ring") {
        // Could alternatively push gearTables to a dictionary. this.gearTables["leftring"/"rightring"]...
        this.gearTables.find((tbl) => tbl.id === "leftring").addRow(item, this.gearset);
        this.gearTables.find((tbl) => tbl.id === "rightring").addRow(item, this.gearset);
      } else {
        this.gearTables.find((tbl) => tbl.id === item.gearTypeID).addRow(item, this.gearset);
      }
    }
  }
}

const statList = [
  "Strength",
  "Dexterity",
  "Intelligence",
  "Mind",
  "Determination",
  "Tenacity",
  "Piety",
  "Critical Hit",
  "Direct Hit Rate",
  "Skill Speed",
  "Spell Speed",
];

class GearTable extends HTMLTableElement {
  #headers = [];

  constructor(job) {
    super();

    this.job = jobs[job];
    this.classList.add("tb", "gear-selects");

    this.#headers = [
      {
        name: "ilvl",
        callback: (data) => {
          return data.itemLevel;
        },
        colWidth: 32,
      },
      {
        name: "",
        callback: (data) => {
          return `<img src=https://v2.xivapi.com/api/asset/${data.iconPath}?format=png>`;
        },
        colWidth: 32,
      },
      {
        name: "Name",
        callback: (data) => {
          return data.name;
        },
        colClasses: ["overflow"],
      },
      {
        name: "Materia",
        callback: (data) => {
          return data.materiaSlots + (data.canBePentamelded ? " (5)" : "");
        },
        colWidth: 56,
      },
      {
        name: "WD",
        callback: (data) => {
          const stats = sumObjectsByKey(data.stats, data.statsHQ);
          return Math.max(convertParamToAbbr(stats).WD);
        },
        condition: () => this.id === "weapon",
        colWidth: 32,
        colClasses: ["stat-cell"], // TEMP: Rename?
        headerClasses: ["stat-header"],
      },
    ];

    for (const stat of statList) {
      this.#headers.push({
        name: paramToAbbr[stat],
        callback: (data) => {
          const stats = sumObjectsByKey(data.stats, data.statsHQ);
          return stats[stat] ?? 0;
        },
        condition: () => !this.job.statBlacklist.includes(stat),
        colWidth: 32,
        colClasses: ["stat-cell"], // TEMP: Rename?
        headerClasses: ["stat-header"],
      });
    }
  }

  connectedCallback() {
    this.createCaption().textContent = this.id + " selection:";

    const headerRow = this.insertRow(0);
    for (const headerInfo of this.#headers) {
      const header = new ExtendedHeader(headerInfo);
      if (header.condition()) {
        headerRow.appendChild(header);
      }
    }
  }

  addRow(item, gearset) {
    const visibleHeaders = this.rows[0].cells;

    const row = new GearTableRow(item, gearset, visibleHeaders);
    this.tBodies[0].appendChild(row);
  }
}

class GearTableRow extends HTMLTableRowElement {
  constructor(item = null, gearsetInstance, headers) {
    super();

    this.item = item;
    this.gearset = gearsetInstance;
    this.headers = headers;

    this.addEventListener("click", (e) => {
      const row = e.target.closest("tr");
      const table = e.target.closest("table");
      let old = table.querySelector(".selected");

      this.classList.toggle("selected");
      if (old !== null && old !== row) {
        old.classList.remove("selected");
      }

      this.#updateGearset(e);
    });
  }

  connectedCallback() {
    this.id = this.item.id;

    for (const header of this.headers) {
      let cell = this.insertCell();
      cell.innerHTML = header.callback(this.item);
      cell.classList.add(...header.colClasses);
    }
  }

  #updateGearset(event) {
    const table = event.target.closest("table");
    if (this.gearset == null) {
      throw Error(`Can't add item to gearset; Gearset reference is invalid.`);
    }
    this.gearset[table.id] = this.gearset[table.id] === this.item ? null : this.item;
  }
}

class ExtendedHeader extends HTMLTableCellElement {
  callback = () => {};
  condition = () => true;
  headerClasses = [];
  colClasses = [];
  name = "";
  colWidth = 0;

  constructor(obj) {
    super();
    super.scope = "col";

    for (const key of Object.keys(obj)) {
      if (key in this) {
        this[key] = obj[key];
      }
    }
  }

  connectedCallback() {
    super.textContent = this.name;
    if (this.colWidth) {
      this.style.width = `${this.colWidth}px`;
    }
    super.classList.add(...this.headerClasses);
  }
}

if (!customElements.get("gear-row")) customElements.define("gear-row", GearTableRow, { extends: "tr" });
if (!customElements.get("gear-table")) customElements.define("gear-table", GearTable, { extends: "table" });
if (!customElements.get("th-extended")) customElements.define("th-extended", ExtendedHeader, { extends: "th" });

// const testRow = new GearTableRow({
//   id: 99999,
//   itemLevel: 735,
//   iconPath: "ui/icon/055000/055543_hr1.tex",
//   name: "Hello World Boots of Scouting",
//   materiaSlots: 3,
//   canBePentamelded: true,
// });
// const testRow2 = new GearTableRow({
//   id: 3333,
//   itemLevel: 777,
//   name: "Augmented Illegal Item for Funsies of Healing",
//   materiaSlots: 5,
// });

// const testTable = new GearTable();
// testTable.id = "custom items (PoC)";

// var div = document.getElementById("gear-pair-left");
// testTable.tBodies[0].append(testRow, testRow2);
// div.appendChild(testTable);
