import DataManager from "./datamanager.js";
import { GearTableContainer } from "./frontend/gear-table.js";
import { Gearset } from "./gearset.js";

const TESTING_JOB = "PLD"; // TEMP:

const dataManager = new DataManager(TESTING_JOB);
await dataManager.fetchData();

var instanceGearset = new Gearset(document.getElementById("config-level").value, TESTING_JOB);
var container = new GearTableContainer(dataManager, instanceGearset);
