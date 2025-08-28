import { StandardSimulationDRG } from "./DRG/drg-simulator.js";
import { StandardSimulation } from "./simulator.js";

export function constructJobSpecificSimulator(gearset, jobCode) {
  switch (jobCode) {
    case "DRG":
      return new StandardSimulationDRG(gearset);
    default:
      console.warn(`Job ${jobCode} is currently unsupported. Constructing base simulator class instead.`);
      return new StandardSimulation(gearset);
  }
}
