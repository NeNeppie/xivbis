import { GearItem } from "./gearset.js";

const XIVAPI_URL = "https://beta.xivapi.com/api/1/";
const RESULTS_PER_PAGE = 250;

export default class DataManager {
  #_itemLevel = null;
  #_itemsGear = null;
  // #_itemsFood = null;
  // #_materia = null;

  constructor(job) {
    this.job = job;
  }

  async fetchData() {
    const itemsTask = fetchItemsGearCurrent(this.job).then((data) => {
      console.log(`Fetched ${data.length} items.`);
      this.#_itemsGear = data;
      return data;
    });

    const itemLevelTask = fetchItemLevel().then((data) => {
      this.#_itemLevel = data;
      return data;
    });

    await Promise.all([itemsTask, itemLevelTask]);
  }

  get itemsGear() {
    return this.#_itemsGear;
  }

  get itemLevel() {
    return this.#_itemLevel;
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

async function fetchItemsGearCurrent(job) {
  return fetchItemsGear({
    filters: ["LevelItem>=690", `ClassJobCategory.${job}=1`, "EquipSlotCategory>0"],
    pages: 2,
  }).then(mapToGearItem);
}

async function fetchItemLevel() {
  // Future-proofing for 7.5 (max ilvl 795)
  const data = await xivapiFetchList({ sheet: "ItemLevel", limit: 200, pages: 4, columns: ["Strength", "Tenacity"] });
  return Object.assign(
    {},
    ...data.map((entry) => ({
      [entry.row_id]: { mainstat: entry.fields.Strength, substat: entry.fields.Tenacity },
    }))
  );
}

// Relevant - ilvl>=290. Current - ilvl>=690. Expansion/Custom - 50/60/70>=elvl>60/70/80

// elvl to ilvl conversion sheet:
//  50 <-> 50
//  60 <-> 150
//  70 <-> 290
//  80 <-> 430
//  90 <-> 560
//  100 <-> 690
