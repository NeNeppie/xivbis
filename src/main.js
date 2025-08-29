import DataManager from "./datamanager.js";
import { GearTableContainer } from "./frontend/gear-table.js";
import SimModal from "./frontend/sim/sim-modal.js";
import { Gearset } from "./gearset.js";

const TESTING_JOB = "DRG"; // TEMP:

const dataManager = new DataManager(TESTING_JOB);
dataManager.fetchData();

var instanceGearset = new Gearset(document.getElementById("config-level").value, TESTING_JOB);
var container = new GearTableContainer(dataManager, instanceGearset);
SimModal(instanceGearset);
