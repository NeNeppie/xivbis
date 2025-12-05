import { sumObjectsByKey } from "../utils/math-utils.js";
import { convertParamsToAbbr, convertParamToAbbr } from "../utils/param-utils.js";
import { createElementEx, CustomTable } from "./ui-core.js";

const MESSAGE_LOADING = "Loading...";
const MESSAGE_LOAD_ERROR = "Error loading content.";

export class GearTableContainer {
  gearTables = [];

  constructor(dataManager, gearset) {
    this.dataManager = dataManager;
    this.gearset = gearset;

    var div = document.getElementById("gear-group-weapon");
    this.#addTable("weapon", div);
    if (this.gearset.jobCode === "PLD") {
      this.#addTable("offhand", div);
    }

    var div = document.getElementById("gear-pair-left");
    for (const id of ["head", "body", "hands", "legs", "feet"]) {
      this.#addTable(id, div);
    }
    div = document.getElementById("gear-pair-right");
    for (const id of ["ears", "neck", "wrists", "leftring", "rightring"]) {
      this.#addTable(id, div);
    }

    this.#populateTables(this.gearset.jobCode);
  }

  #addTable(id, div) {
    let table = new GearTable(this.gearset.job);
    table.id = id;
    this.gearTables.push(table);
    div.appendChild(table);
  }

  async #populateTables(job) {
    const items = await this.dataManager.itemsGear;
    for (const item of items.filter((item) => item.gearJob.includes(job)).sort((a, b) => a.itemLevel - b.itemLevel)) {
      if (item.gearTypeID === "ring") {
        // Could alternatively push gearTables to a dictionary. this.gearTables["leftring"/"rightring"]...
        this.gearTables.find((tbl) => tbl.id === "leftring").addRow(item, this.gearset);
        this.gearTables.find((tbl) => tbl.id === "rightring").addRow(item, this.gearset);
      } else {
        this.gearTables.find((tbl) => tbl.id === item.gearTypeID).addRow(item, this.gearset);
      }
    }

    this.gearTables.forEach((table) => {
      if (!table.loaded) {
        table.displayError();
      }
    });
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

class GearTable extends CustomTable {
  constructor(job) {
    super();

    this.customHeaders = [
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
        colWidth: 60,
      },
      {
        name: "WD",
        callback: (data) => {
          // Keeping `data.statsHQ` in place in case I ever revert to using it
          const stats = sumObjectsByKey(data.stats, data.statsHQ);
          return Math.max(convertParamsToAbbr(stats).WD);
        },
        condition: () => this.id === "weapon",
        colWidth: 40,
        colClasses: ["stat-cell"],
        headerClasses: ["stat-header"],
      },
    ];

    for (const stat of statList) {
      this.customHeaders.push({
        name: convertParamToAbbr(stat),
        callback: (data) => {
          const stats = sumObjectsByKey(data.stats, data.statsHQ);
          return stats[stat] ?? 0;
        },
        condition: () => !this.job.statBlacklist.includes(stat),
        colWidth: 40,
        colClasses: ["stat-cell"],
        headerClasses: ["stat-header"],
      });
    }

    this.job = job;
    this.loaded = false;
    this.classList.add("table-selectable", "table-stripped");
  }

  connectedCallback() {
    super.connectedCallback();

    const titleCell = createElementEx("th", { colSpan: 999, style: "text-align: center;" });
    // FIXME: Formatting for leftring & rightring
    titleCell.textContent = "~-~ " + this.id.toUpperCase() + " ~-~";
    this.insertRow(0).appendChild(titleCell);

    const infoCell = this.tBodies[0].insertRow(-1).insertCell();
    infoCell.colSpan = 999;
    infoCell.style = "text-align: center; height: 300px;";
    infoCell.textContent = MESSAGE_LOADING;
  }

  addRow(item, gearset) {
    const tbody = this.tBodies[0];

    if (!this.loaded) {
      tbody.lastChild.remove();
      this.loaded = true;
    }

    const visibleHeaders = this.rows[1].cells;

    const row = new GearTableRow(item, gearset, visibleHeaders);
    tbody.appendChild(row);
  }

  displayError() {
    if (!this.loaded) {
      const infoRow = this.tBodies[0].lastChild;
      infoRow.childNodes[0].textContent = MESSAGE_LOAD_ERROR;
    }
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

if (!customElements.get("gear-row")) customElements.define("gear-row", GearTableRow, { extends: "tr" });
if (!customElements.get("gear-table")) customElements.define("gear-table", GearTable, { extends: "table" });

// TODO: Adding custom items
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
