import { Gearset } from "../../gearset.js";
import { DamageInfotable, GaugeInfotable, StatusInfotable } from "./simulator-infotable.js";
import TimelineElement from "./simulator-timeline.js";

/** @param {Gearset} gearset */
export default function SimModal(gearset) {
  const simDialog = document.querySelector('[data-modal="sim"]');
  const simDialogShowButton = document.querySelector("#sim-modal-show");
  const simDialogCloseButton = document.querySelector("#sim-modal-hide");
  const simTimeline = simDialog.querySelector('[is="sim-timeline"]');
  const simInfotables = simDialog.querySelectorAll("table");

  window.addEventListener("keyup", (event) => {
    if (event.key === "Escape") {
      if (simDialog.open) {
        simDialog.close();
      }
    }
  });

  // simDialog.addEventListener("click", (event) => {
  //   const dim = simDialog.getBoundingClientRect();
  //   if (event.clientX < dim.left || event.clientX > dim.right || event.clientY < dim.top || event.clientY > dim.bottom) {
  //     simDialog.close();
  //   }
  // });

  simDialogShowButton.addEventListener("click", (event) => {
    simDialog.showModal();
    simTimeline.build(gearset);
    for (const table of simInfotables) {
      table.build(gearset);
    }
  });

  simDialogCloseButton.addEventListener("click", (event) => {
    simDialog.close();
  });
}
