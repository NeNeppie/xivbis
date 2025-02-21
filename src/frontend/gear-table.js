import { createElementEx } from "./ui-core.js";

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
    let table = new GearTable();
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

function createHeaderCell(text, attr) {
  const th = createElementEx("th", { ...attr, scope: "col" });
  th.appendChild(document.createTextNode(text));
  return th;
}

class GearTable extends HTMLTableElement {
  constructor() {
    super();

    this.classList.add("tb", "gear-selects");

    const headerRow = this.insertRow(0);
    headerRow.appendChild(createHeaderCell("ilvl", { style: "width: 32px;" }));
    headerRow.appendChild(createHeaderCell("", { style: "width: 32px;" }));
    headerRow.appendChild(createHeaderCell("Name"));
    headerRow.appendChild(createHeaderCell("Materia", { style: "width: 48px;" }));
  }

  connectedCallback() {
    this.createCaption().textContent = this.id + " selection:";
  }

  addRow(item, gearset) {
    const row = new GearTableRow(item, gearset);
    this.tBodies[0].appendChild(row);
  }
}

class GearTableRow extends HTMLTableRowElement {
  constructor(item = null, gearsetInstance) {
    super();

    this.item = item;
    this.gearset = gearsetInstance;

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

    this.insertCell().textContent = this.item.itemLevel;
    this.insertCell().append(
      createElementEx("img", {
        src: `https://beta.xivapi.com/api/1/asset/${this.item.iconPath}?format=png`,
      })
    );
    const nameCell = this.insertCell();
    this.insertCell().textContent = this.item.materiaSlots + (this.item.canBePentamelded ? " (5)" : "");

    nameCell.textContent = this.item.name;
    nameCell.classList.add("overflow");
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
