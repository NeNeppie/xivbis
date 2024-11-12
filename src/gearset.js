import { jobs } from "./constants/jobstats.js";
import { getBaseStats } from "./ffxivmath.js";
import { sumObjectsByKey } from "./utils/mathutils.js";

// TODO: split into datamanager.js and gearset.js

const XIVAPI_URL = "https://beta.xivapi.com/api/1/";
const RESULTS_PER_PAGE = 250;

// TODO:  Move to separate file
export const GearpieceStatDistribution = {
  1: { name: "Mainhand", id: "weapon", percentage: 100 }, // Mainhand (PLD Sword, One-handed WHM and BLM wands)
  2: { name: "Offhand", id: "offhand", percentage: 40 }, // Offhand (PLD Shield (Certain ARR shields are multiclass))
  3: { name: "Head", id: "head", percentage: 85 },
  4: { name: "Body", id: "body", percentage: 135 },
  5: { name: "Hands", id: "hands", percentage: 85 },
  7: { name: "Legs", id: "legs", percentage: 135 },
  8: { name: "Feet", id: "feet", percentage: 85 },
  9: { name: "Ears", id: "ears", percentage: 67 },
  10: { name: "Neck", id: "neck", percentage: 67 },
  11: { name: "Wrists", id: "wrists", percentage: 67 },
  12: { name: "Ring", id: "ring", percentage: 67 },
  13: { name: "Mainhand", id: "weapon", percentage: 140 }, // Mainhand && !Offhand (All jobs)
  15: { name: "Head + Body", id: "body", percentage: 220 }, // Head + Body (e.g. Eureka Caster Robe)
  16: { name: "Suit", id: "body", percentage: 440 }, // All but Head (ARR Suits, Mogstation pieces)
  18: { name: "Legs + Feet", id: "legs", percentage: 220 }, // Legs + Feet (VERY few exist)
};

// prettier-ignore
const paramToStatKey = {
  "Strength": "strength",
  "Dexterity": "dexterity",
  "Intelligence": "intelligence",
  "Mind": "mind",
  "Vitality": "vitality",
  "Determination": "determination",
  "Tenacity": "tenacity",
  "Critical Hit": "crit",
  "Direct Hit Rate": "directHit",
  "Physical Damage": "wdPhys",
  "Magic Damage": "wdMag",
  "Attack Delay": "delay",
  // Block Rate
  // Block Strength
  // Defense -> defPhys
  // Magic Defense -> defMag
  "Skill Speed": "spdSkill",
  "Spell Speed": "spdSpell",
  "Piety": "piety",
};

export function convertStatKeys(stats, statsHQ) {
  let translated = {};

  for (const [key, value] of Object.entries(paramToStatKey)) {
    translated[value] = stats[key] ?? 0;
  }

  // Passing HQ stats treats the item as its HQ variant.
  if (statsHQ !== undefined) {
    for (const [key, value] of Object.entries(statsHQ)) {
      translated[paramToStatKey[key]] += value;
    }
  }
  return translated;
}

export class Gearset {
  weapon = null;
  offhand = null;
  head = null;
  body = null;
  hands = null;
  legs = null;
  feet = null;
  ears = null;
  neck = null;
  wrists = null;
  leftring = null;
  rightring = null;

  /**@param {number} level @param {string} job*/
  constructor(level, job) {
    this.level = level;
    this.job = job;
  }

  get stats() {
    let stats = {};
    let slots = Object.getOwnPropertyNames(this);
    for (const slot of slots) {
      if (slot === "job" || slot === "level" || slot === "tribe") {
        continue;
      }

      const item = this[slot];
      if (item === null) {
        continue;
      }
      stats = sumObjectsByKey(stats, item.stats, item.statsHQ);
    }
    return sumObjectsByKey(stats, getBaseStats(this.level, this.job, this.tribe ?? "default"));
  }
}

class GearItem {
  constructor(item) {
    const equipmentID = item.EquipSlotCategory.value;
    // Soulstone filter
    if (equipmentID === 17) {
      throw Error(
        `Couldn't create GearItem from xivapi entry '${item.Name}: Item is a Soulstone. EquipSlotCategory=${equipmentID}`
      );
    }
    this.internalID = item.ID;
    this.name = item.Name;
    this.iconPath = item.Icon.path_hr1;
    this.equipLevel = item.LevelEquip;
    this.itemLevel = item.LevelItem.value;

    this.materiaSlots = item.MateriaSlotCount;
    this.canBePentamelded = item.IsAdvancedMeldingPermitted;
    this.canBeHQ = item.CanBeHq;
    this.isUnique = item.IsUnique;
    this.gearTypeName = GearpieceStatDistribution[equipmentID].name;
    this.gearTypeID = GearpieceStatDistribution[equipmentID].id;
    this.gearJob = item.ClassJobCategory.fields.Name.split(" ");

    ({ stats: this.stats, statsHQ: this.statsHQ } = GearItem.#assignStats(item));

    console.log(`Created new GearItem from xivapi entry '${item.Name}'`);
  }

  static #assignStats(item) {
    let stats = {};
    let statsHQ = {};
    for (let i = 0; i < 5; i++) {
      const param = item.BaseParam[i];
      const paramValue = item.BaseParamValue[i];

      if (param.fields.Name) {
        stats[param.fields.Name] = paramValue;
      }
    }

    switch (item.EquipSlotCategory.value) {
      case 1:
      case 13:
        stats["Physical Damage"] = item.DamagePhys;
        stats["Magic Damage"] = item.DamageMag;
        stats["Attack Delay"] = item.Delayms;
        break;
      case 2:
        stats["Block Strength"] = item.Block;
        stats["Block Rate"] = item.BlockRate;
        break;
      default:
        stats["Defense"] = item.DefensePhys;
        stats["Magic Defense"] = item.DefenseMag;
        break;
    }

    if (item.CanBeHq) {
      for (let i = 0; i < 6; i++) {
        const paramSpecial = item.BaseParamSpecial[i];
        const paramValueSpecial = item.BaseParamValueSpecial[i];

        if (paramSpecial !== undefined && paramSpecial.row_id !== undefined) {
          statsHQ[paramSpecial.fields.Name] = paramValueSpecial;
        }
      }
      return { stats: stats, statsHQ: statsHQ };
    }
    return { stats };
  }
}

async function xivapiFetch(url, tries = 5) {
  console.log(`Fetching '${url}' ...`);
  while (true) {
    tries--;

    const res = await fetch(url);
    if (res.status === 429 && tries > 0) {
      console.log(`Too Many Requests. Retrying...`);
      await new Promise((r) => setTimeout(r, 1000 + Math.random * 500));
      continue;
    } else if (!res.ok || tries <= 0) {
      const resJSON = JSON.stringify(await res.json());
      console.error(`Xivapi fetch error '${res.status}': ${res.statusText}`, resJSON);
      throw Error(`Xivapi fetch error '${res.status}': ${res.statusText} - ${resJSON}`);
    }
    return res;
  }
}

// Relevant - ilvl>=290. Current - ilvl>=690. Expansion/Custom - 50/60/70>=elvl>60/70/80

function mapToGearItem(list) {
  return list.flatMap((item) => {
    try {
      return new GearItem(item);
    } catch (e) {
      console.warn(e.message);
      return [];
    }
  });
}

export async function fetchItemsGearRelevant(job) {
  return fetchItemsGear({
    filters: ["LevelItem>=290", `ClassJobCategory.${job}=1`, "EquipSlotCategory>0"],
    pages: 5,
  }).then(mapToGearItem);
}

export async function fetchItemsGearCurrent(job) {
  return fetchItemsGear({
    filters: ["LevelItem>=690", `ClassJobCategory.${job}=1`, "EquipSlotCategory>0"],
    pages: 2,
  }).then(mapToGearItem);
}

export async function fetchItemsGearDebug() {
  return fetchItemsGear({
    filters: ["LevelItem=30", `ClassJobCategory.BLM=1`, "EquipSlotCategory>0"],
    pages: 1,
    limit: 250,
  }).then(mapToGearItem);
}

async function fetchItemsGear(params) {
  // prettier-ignore
  const columns = [
    'ID', 'Icon', 'Name',
    'LevelItem.null', 'LevelEquip',
    'ClassJobCategory.Name', 'EquipSlotCategory',
    'Rarity','IsUnique','CanBeHq','MateriaSlotCount','IsAdvancedMeldingPermitted',
    'DamagePhys','DamageMag','Delayms',
    'BlockRate','Block','DefensePhys','DefenseMag',
    'BaseParam[]','BaseParamValue[]','BaseParamSpecial[]','BaseParamValueSpecial[]'
  ].toString();

  const filters = params.filters ?? [];

  const url = XIVAPI_URL + `search?sheets=Item&fields=${columns}&limit=${params.limit ?? RESULTS_PER_PAGE}`;
  const query = filters.map((filter) => encodeURIComponent("+" + filter)).join(" ");
  let firstQuery = url + `&query=${query}`;

  let remainingPages = params.pages ?? 16; // maximum pages for lv70-100 / lv50-59 / lv60-69
  let nextCursor = null;
  let data = [];

  while (remainingPages-- > 0) {
    let pageQuery = "";

    if (nextCursor === null) {
      pageQuery = firstQuery;
    } else {
      pageQuery = url + `&cursor=${nextCursor}`;
    }

    const response = await xivapiFetch(pageQuery).then((res) => res.json());
    const results = response.results;
    data.push(...results);
    nextCursor = response.next;
    if (nextCursor === undefined) {
      break;
    }
  }

  return data.map((entry) => {
    entry.fields.ID = entry.row_id;
    return entry.fields;
  });
}

export async function fetchItemLevel() {
  // Future-proofing for 7.5 (max ilvl 795)
  const data = await xivapiFetchList({ sheet: "ItemLevel", limit: 200, pages: 4, columns: ["Strength", "Tenacity"] });
  return Object.assign(
    {},
    ...data.map((entry) => ({
      [entry.row_id]: { mainstat: entry.fields.Strength, substat: entry.fields.Tenacity },
    }))
  );
}

async function xivapiFetchList(params) {
  const limit = params.limit ?? RESULTS_PER_PAGE;
  const url = XIVAPI_URL + `sheet/${params.sheet}?fields=${params.columns}&limit=${limit}`;
  let remainingPages = params.pages ?? 4;

  let nextRow = 0;
  let data = [];

  while (remainingPages-- > 0) {
    const response = await xivapiFetch(url + `&after=${nextRow}`).then((res) => res.json());
    const responseData = response.rows;

    data.push(...responseData.filter((obj) => Object.keys(obj.fields).length > 0));
    if (responseData.length === 0 || responseData.length < limit) {
      break;
    }
    nextRow += limit;
  }
  return data;
}

// const statbaseValues = await fetchItemLevel();
// const items = await fetchItemsGearDebug();
// const lastEntry = items[items.length - 1];

// const ilvl = lastEntry.LevelItem.value;
// const distributionPercentage = GearpieceStatDistribution[lastEntry.EquipSlotCategory.value].percentage;
// const mainstatMax = Math.round(statbaseValues[ilvl].mainstat * 0.001 * distributionPercentage);
// const substatMax = Math.round(statbaseValues[ilvl].substat * 0.001 * distributionPercentage);
// const substatMin = Math.round(substatMax * 0.7);

// console.log(mainstatMax, substatMax, substatMin);
// const item = new GearItem(lastEntry);
// console.log(item);

// elvl to ilvl conversion sheet:
//  50 <-> 50
//  60 <-> 150
//  70 <-> 290
//  80 <-> 430
//  90 <-> 560
//  100 <-> 690
