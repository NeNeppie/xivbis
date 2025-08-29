import { Gearset } from "../../gearset.js";
import TimelineElement from "./simulator-timeline.js";

// TODO: Create timeline once, update on modal reopen?

/** @param {Gearset} gearset */
export default function SimModal(gearset) {
  const simDialog = document.querySelector('[data-modal="sim"]');
  const simDialogShowButton = document.querySelector("#sim-modal-show");
  const simDialogCloseButton = document.querySelector("#sim-modal-hide");

  function clearDialog() {
    const timeline = simDialog.querySelector("div.timeline");
    simDialog.removeChild(timeline);
  }

  window.addEventListener("keyup", (event) => {
    if (event.key === "Escape") {
      if (simDialog.open) {
        simDialog.close();
      }
      clearDialog();
    }
  });

  // simDialog.addEventListener("click", (event) => {
  //   const dim = simDialog.getBoundingClientRect();
  //   if (event.clientX < dim.left || event.clientX > dim.right || event.clientY < dim.top || event.clientY > dim.bottom) {
  //     simDialog.close();
  //     clearDialog();
  //   }
  // });

  simDialogShowButton.addEventListener("click", (event) => {
    const timelineElem = new TimelineElement(gearset);
    simDialog.appendChild(timelineElem);
    simDialog.showModal();
    timelineElem.init();
  });

  simDialogCloseButton.addEventListener("click", (event) => {
    simDialog.close();
    clearDialog();
  });
}
