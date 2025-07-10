import { StandardSimulation as Simulator } from "../simulator.js";

export class StandardSimulationDRG extends Simulator {
  constructor(gearset) {
    super(gearset);
    this.gauge.createGauge("Life of the Dragon", { maxTime: 20, initTime: 0 });
    this.gauge.createGauge("Firstmind's Focus", { maxCount: 2, initCount: 0 });
  }

  // simulate(actionList, duration, start = 0, endWhenNoActions = false, simAutoAttacks = true) {
  // this.test.attach("Raiden Thurst", () => {
  //   const gauge = this.test.getGauge("Firstmind's Focus");
  //   gauge.increment();
  // });

  // // Example use for action with multiple gauge changes?
  // this.test.attach("Energy Drain", () => {
  //   const aetherflow = this.test.getGauge("Aetherflow");
  //   const fairy = this.test.getGauge("Fairy Gauge");
  //   aetherflow.decrement();
  //   fairy.update(10);
  // });

  // this.test.addTrigger("Energy Drain", "Aetherflow", (gauge) => {
  //   gauge.decrement();
  // });

  // this.test.addTrigger("Energy Drain", "Fairy Gauge", (gauge) => {
  //   gauge.update(10);
  // });
  // Example End

  //   super.simulate(actionList, duration, start, endWhenNoActions, simAutoAttacks);
  // }
}
