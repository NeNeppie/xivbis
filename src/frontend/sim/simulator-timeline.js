import { Gearset } from "../../gearset.js";
import { createElementEx, getIconUrl } from "../ui-core.js";
import StatusColors from "./effect-frontend-colors.json" with { type: "json" };

export default class TimelineElement extends HTMLDivElement {
  #gearset;

  constructor(gearset) {
    super();
    this.#gearset = gearset;

    this.scroll = 0;
    this.iconWidth = 40;
    this.classList.add("timeline");
  }

  /** @param {Gearset} gearsetObj */
  set gearset(gearsetObj) {
    this.#gearset = gearsetObj;
  }

  #syncTickSpacing(event) {
    const style = getComputedStyle(this);
    const tickWidth = parseFloat(style.getPropertyValue("--ruler-tick-width"));
    const em = parseFloat(style.fontSize);

    const newSpacing = parseFloat(event.detail) + tickWidth * em;
    this.divSkillBoard.style.backgroundSize = `${newSpacing}px`;

    this.redrawSkillboard();
  }

  #syncScroll(event) {
    const newScroll = event.target.scrollLeft;
    if (this.scroll === newScroll) {
      return;
    }

    if (event.target === this.divSkillBoard) {
      this.divTimeRuler.scrollLeft = newScroll;
    }
    if (event.target === this.divTimeRuler) {
      this.divSkillBoard.scrollLeft = newScroll;
    }
    this.divSkillBoard.style.backgroundPositionX = `${-newScroll}px`;
    this.scroll = newScroll;
  }
  #syncScrollBound = this.#syncScroll.bind(this);

  connectedCallback() {
    this.divSkillBoard = this.appendChild(createElementEx("div", { class: "skillboard" }));
    this.divTimeRuler = this.appendChild(new DynamicRuler());

    this.addEventListener("spacing-changed", this.#syncTickSpacing);
    this.divSkillBoard.addEventListener("scroll", this.#syncScrollBound, false);
    this.divTimeRuler.addEventListener("scroll", this.#syncScrollBound, false);
  }

  disconnectedCallback() {
    this.removeEventListener("spacing-changed", this.#syncTickSpacing);
    this.divSkillBoard.removeEventListener("scroll", this.#syncScrollBound, false);
    this.divTimeRuler.removeEventListener("scroll", this.#syncScrollBound, false);
  }

  init(name = "standard") {
    const simulation = this.#gearset.simulations.find((s) => s.name === name);
    if (!simulation?.data) {
      console.warn("Attempted to construct simulation timeline without simulation data");
      return;
    }

    this.divTimeRuler.setAttribute("data-count", simulation.simulator.elapsed);
    const records = simulation.data;
    console.table(records);

    const buffElevation = {};
    const uniqueBuffs = {};
    for (const obj of records.filter((record) => record.type === "Status Effect" && record.data.type === "buff").reverse()) {
      uniqueBuffs[obj.name] = obj;
    }
    Object.values(uniqueBuffs).forEach((br, i, arr) => {
      buffElevation[br.name] = ((this.divSkillBoard.clientHeight - 20 - this.iconWidth * 3) / arr.length) * i; // zero-indexed, on purpose.
    });

    const rulerTick = this.divTimeRuler.firstChild;
    for (const record of records) {
      if (record.type === "Action") {
        if (record.name === "Auto Attack") {
          var eventDiv = this.createEventAutoAttack(record, rulerTick);
        } else {
          var eventDiv = this.createEventAction(record, rulerTick);
        }
      } else if (record.type === "Status Effect" && record.data.type === "buff") {
        var eventDiv = this.createEventBuff(record, rulerTick, buffElevation[record.name]);
      } else {
        continue;
      }

      this.divSkillBoard.appendChild(eventDiv);
    }
  }

  createEventAction(record, rulerTick) {
    const posX = record.elapsed * rulerTick.clientWidth;
    const posY = (record.data.isGCD ? 1 : 2) * this.iconWidth;

    let tooltipText = `${record.name}\nUsed at: ${record.elapsed}s`;
    if (record.data.potency !== 0) {
      tooltipText += `\nPotency: ${record.data.potency}`;
    }

    const imgSrc = getIconUrl(record.id);

    const div = createElementEx("div", {
      "data-timestamp": record.elapsed,
      class: "timeline-event",
      style: `transform: translate(${posX}px, ${posY}px)`,
    });

    const img = createElementEx("img", { src: imgSrc, title: tooltipText });
    div.appendChild(img);
    return div;
  }

  createEventAutoAttack(record, rulerTick) {
    const posX = record.elapsed * rulerTick.clientWidth;
    const posY = this.iconWidth * 0.4;

    let tooltipText = `Auto Attack\nUsed at: ${record.elapsed}s\nPotency: ${record.data.potency}`;

    const div = createElementEx("div", {
      "data-timestamp": record.elapsed,
      class: "timeline-event timeline-event-auto",
      style: `transform: translate(${posX}px, ${posY}px)`,
      title: tooltipText,
    });

    return div;
  }

  createEventBuff(record, rulerTick, hLevel) {
    const posX = record.elapsed * rulerTick.clientWidth;
    const posY = this.iconWidth * 3;

    let tooltipText = `${record.name}\nUsed at: ${record.elapsed}s\nDuration: ${record.data.duration}s\n${record.data.description}`;
    const imgSrc = getIconUrl(record.id);

    const div = createElementEx("div", {
      "data-timestamp": record.elapsed,
      "data-duration": record.data.duration,
      class: "timeline-event timeline-event-buff",
      style: `--data-color: ${StatusColors[record.name] ?? ""}; --data-width: ${
        /* TODO: Past sins come back to bite me as correct durations are saved on action events that own the buff and not on buff events */
        record.data.duration * rulerTick.clientWidth
      }px; --data-level: ${hLevel}px; transform: translate(${posX}px, ${posY}px);`,
    });

    const img = createElementEx("img", { src: imgSrc, title: tooltipText });
    div.appendChild(img);
    return div;
  }

  redrawSkillboard() {
    const rulerTick = this.divTimeRuler.firstChild;

    // "child" here is a div element, with an inner img element
    for (const child of this.divSkillBoard.childNodes) {
      const transform = new WebKitCSSMatrix(getComputedStyle(child).transform);
      const posX = child.getAttribute("data-timestamp") * rulerTick.clientWidth;
      const posY = transform.m42;

      // FIXME: Strange grid snapping causes unalignment with the ruler
      child.style.transform = `translate(${posX}px, ${posY}px)`;
      if (getComputedStyle(child).getPropertyValue("--data-width") !== "") {
        const newWidth = child.getAttribute("data-duration") * rulerTick.clientWidth;
        child.style.setProperty("--data-width", `${newWidth}px`);
      }
    }
  }
}

class DynamicRuler extends HTMLUListElement {
  static observedAttributes = ["data-count", "data-spacing"];

  constructor(count) {
    super();

    this.defCount = count ?? 100;
    this.classList.add("ruler");
  }

  connectedCallback() {
    this.addEventListener("wheel", this.#setSpacingAttr);
    this.setAttribute("data-count", this.defCount);
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === "data-count") {
      this.#setContent(newVal);
    }

    if (name === "data-spacing") {
      this.#setRulerSpacing(newVal);
    }
  }

  disconnectedCallback() {
    this.removeEventListener("wheel", this.#setSpacingAttr);
  }

  #setContent(count) {
    this.innerHTML = "";

    const item = createElementEx("li");
    for (let i = 0; i < count; i++) {
      const clone = item.cloneNode();
      clone.textContent = i + 1;
      this.append(clone);
    }
  }

  // TODO: Zooming in should align to the center instead of the left
  //       Prevent zooming out past all visible content (information from skillboard, leading to the next point of)
  //       Merging The ruler and skillboard into a singular element
  #setSpacingAttr(event) {
    if (!event.ctrlKey) {
      return;
    }
    event.preventDefault();
    const posX = event.pageX - this.offsetLeft;

    let spacing = parseFloat(this.dataset.spacing);
    if (isNaN(spacing)) {
      spacing = parseFloat(this.firstChild.offsetLeft);
    }

    const clamped = Math.max(0, Math.min(200, spacing - event.deltaY));
    this.scrollLeft = posX;
    this.dataset.spacing = clamped;
  }

  #setRulerSpacing(spacing) {
    this.dispatchEvent(new CustomEvent("spacing-changed", { bubbles: true, detail: spacing }));
    this.childNodes.forEach((child) => {
      child.style.paddingLeft = `${spacing}px`;
    });
  }
}

if (!customElements.get("sim-timeline-ruler")) customElements.define("sim-timeline-ruler", DynamicRuler, { extends: "ul" });
if (!customElements.get("sim-timeline")) customElements.define("sim-timeline", TimelineElement, { extends: "div" });
