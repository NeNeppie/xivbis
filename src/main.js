import { jobs } from "./constants/jobstats.js";
import { applyCritDh, calculateBaseDamage } from "./ffxivmath.js";
import { convertStatKeys, fetchItemLevel, fetchItemsGearCurrent, Gearset } from "./gearset.js";

// Need to do something about this impl, this is messy
const TESTING_LEVEL = 100;
const TESTING_JOB = "PLD";
const TESTING_JOB_OBJ = jobs[TESTING_JOB];

async function loadData() {
  const itemsTask = fetchItemsGearCurrent(TESTING_JOB);
  const itemLevelTask = fetchItemLevel();

  return {
    dataItems: await itemsTask,
    dataItemLevel: await itemLevelTask,
  };
}

const { dataItems, dataItemLevel } = await loadData();

let selects = document.getElementsByClassName("gear-selects");
console.log(selects);
for (const item of dataItems.filter((item) => item.gearJob.includes(TESTING_JOB))) {
  if (item.gearTypeID === "ring") {
    selects.leftring.add(new Option(item.name, item.internalID));
    selects.rightring.add(new Option(item.name, item.internalID));
  } else {
    selects[item.gearTypeID].add(new Option(item.name, item.internalID));
  }
}
if (selects.offhand.options.length === 0) {
  // Doesn't get rid of the label
  selects.offhand.setAttribute("hidden", "");
  selects.offhand.labels[0].style.display = "none";
}

var instanceGearset = new Gearset(TESTING_LEVEL, TESTING_JOB);

function updateGearset(e) {
  const statsElement = document.getElementById("item-stats");
  const dmgElement = document.getElementById("item-dmg");

  const elementID = e.target.id;
  const itemID = e.target.value;
  const item = dataItems.find((i) => i.internalID == itemID);

  instanceGearset[elementID] = item ?? null;
  const stats = instanceGearset.stats;

  statsElement.innerHTML = "";
  for (const [key, value] of Object.entries(stats)) {
    statsElement.innerHTML += `    ${key}: ${value}<br/>`;
  }

  dmgElement.innerHTML = `    ${calculateBaseDamage(instanceGearset.level, instanceGearset.job, convertStatKeys(stats))}`;
}

for (const select of selects) {
  select.onchange = updateGearset;
}
