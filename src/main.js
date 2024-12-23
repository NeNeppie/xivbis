import { jobs } from "./constants/jobstats.js";
import { applyCritDh, calculateBaseDamage } from "./ffxivmath.js";
import { convertStatKeys, fetchItemLevel, fetchItemsGearCurrent, Gearset } from "./gearset.js";

// Need to do something about this impl, this is messy
const TESTING_LEVEL = 100;
const TESTING_JOB = "DRG";
const TESTING_JOB_OBJ = jobs[TESTING_JOB];

async function loadData() {
  const itemsTask = fetchItemsGearCurrent(TESTING_JOB);
  const itemLevelTask = fetchItemLevel();

  return {
    dataItems: await itemsTask,
    dataItemLevel: await itemLevelTask,
  };
}

function initializeElement(type, attrs) {
  var element = document.createElement(type);
  for (const attr in attrs) {
    if (element.setAttribute) {
      element.setAttribute(attr, attrs[attr]);
    } else {
      element[attr] = attrs[attr];
    }
  }
  return element;
}

function initializeGearTableHeader(text, attrs) {
  const th = initializeElement("th", attrs);
  th.appendChild(document.createTextNode(text));
  return th;
}

function initializeGearTable(id, side) {
  const tbl = initializeElement("table", { class: "tb gear-selects", id: id });
  const tblBody = initializeElement("tbody");
  const tblHeaderRow = initializeElement("tr");

  tblHeaderRow.appendChild(initializeGearTableHeader("ilvl", { scope: "col", style: "width: 32px;" }));
  tblHeaderRow.appendChild(initializeGearTableHeader(" ", { scope: "col", style: "width: 32px;" }));
  tblHeaderRow.appendChild(initializeGearTableHeader("Name", { scope: "col" }));
  tblHeaderRow.appendChild(initializeGearTableHeader("Materia", { scope: "col", style: "width: 48px;" }));

  tblBody.appendChild(tblHeaderRow);

  tbl.createCaption().textContent = id + " selection:";
  tbl.appendChild(tblBody);
  side.appendChild(tbl);

  return tbl;
}

function initializeGearTables() {
  var tables = [];

  var div = document.getElementById("gear-pair-left");
  for (const id of ["weapon", "head", "body", "hands", "legs", "feet"]) {
    tables.push(initializeGearTable(id, div));
  }
  div = document.getElementById("gear-pair-right");
  for (const id of ["offhand", "ears", "neck", "wrists", "leftring", "rightring"]) {
    tables.push(initializeGearTable(id, div));
  }

  return tables;
}

function createTableCell(args) {
  let cell = initializeElement("td");
  if (args.text) {
    cell.textContent = args.text;
  }
  if (args.img && args.img.src) {
    cell.appendChild(initializeElement("img", { src: args.img.src }));
  }
  if (args.class) {
    cell.classList = args.class;
  }
  return cell;
}

function selectRow(event) {
  const elemRow = event.target.closest("tr");
  const elemTable = event.target.closest("table");

  let old = elemTable.querySelector(".selected");
  if (old !== null) {
    old.classList.remove("selected");
  }
  elemRow.classList.add("selected");
}

function insertItemRow(table, item) {
  const tblRow = initializeElement("tr", { id: item.id });

  tblRow.appendChild(createTableCell({ text: item.itemLevel }));
  tblRow.appendChild(createTableCell({ img: { src: `https://beta.xivapi.com/api/1/asset/${item.iconPath}?format=png` } }));
  tblRow.appendChild(createTableCell({ text: item.name, class: "overflow" }));
  tblRow.appendChild(createTableCell({ text: item.materiaSlots + (item.canBePentamelded ? " (5)" : "") }));

  let headers = table.querySelectorAll("th");
  let obj = [];
  for (let i = 0; i < headers.length; i++) {
    let key = headers[i];
    obj[key.textContent] = tblRow.cells[i].textContent;
  }

  tblRow.addEventListener("click", (e) => {
    selectRow(e);
    updateGearset(e, obj);
  });
  tblRow.addEventListener("mouseenter", (e) => {
    e.target.style.background = "#ffd70033";
  });
  tblRow.addEventListener("mouseleave", (e) => {
    e.target.style.background = "";
  });

  table.tBodies[0].appendChild(tblRow);
}

const { dataItems, dataItemLevel } = await loadData();

let gearSelectTables = initializeGearTables();
for (const item of dataItems.filter((item) => item.gearJob.includes(TESTING_JOB)).sort((a, b) => a.itemLevel - b.itemLevel)) {
  if (item.gearTypeID === "ring") {
    insertItemRow(
      gearSelectTables.find((tbl) => tbl.id === "leftring"),
      item
    );
    insertItemRow(
      gearSelectTables.find((tbl) => tbl.id === "rightring"),
      item
    );
  } else {
    insertItemRow(
      gearSelectTables.find((tbl) => tbl.id === item.gearTypeID),
      item
    );
  }
}

var instanceGearset = new Gearset(TESTING_LEVEL, TESTING_JOB);

function updateGearset(event, row) {
  const elemStats = document.getElementById("item-stats");
  const elemDmg = document.getElementById("item-dmg");
  const elemRow = event.target.closest("tr");
  const elemTable = event.target.closest("table");

  const item = dataItems.find((i) => i.id == elemRow.id);
  instanceGearset[elemTable.id] = item ?? null;
  const stats = instanceGearset.stats;

  elemStats.innerHTML = "";
  for (const [key, value] of Object.entries(stats)) {
    elemStats.innerHTML += `    ${key}: ${value}<br/>`;
  }

  elemDmg.innerHTML = `    ${calculateBaseDamage(instanceGearset.level, instanceGearset.job, convertStatKeys(stats))}`;
}
