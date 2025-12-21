// prettier-ignore
const exdStringToParamKey = {
  "Vitality":        "vitality",
  "Strength":        "strength",
  "Dexterity":       "dexterity",
  "Intelligence":    "intelligence",
  "Mind":            "mind",
  "Determination":   "determination",
  "Tenacity":        "tenacity",
  "Piety":           "piety",
  "Critical Hit":    "crit",
  "Direct Hit Rate": "directHit",
  "Skill Speed":     "spdSkill",
  "Spell Speed":     "spdSpell",
  "Physical Damage": "wdPhys",
  "Magical Damage":  "wdMag",
  "Attack Delay":    "delay",
  "Defense":         "defPhys",
  "Magic Defense":   "defMag",
  "Block Rate":      "blockRate",
  "Block Strength":  "blockStr",
};

const exdIdToParamKey = {
  1: "strength",
  2: "dexterity",
  3: "vitality",
  4: "intelligence",
  5: "mind",
  6: "piety",
  12: "wdPhys",
  13: "wdMag",
  14: "delay",
  17: "blockRate",
  18: "blockStr",
  19: "tenacity",
  21: "defPhys",
  22: "directHit",
  24: "defMag",
  27: "crit",
  44: "determination",
  45: "spdSkill",
  46: "spdSpell",
  47: undefined, // haste, todo.
};

// prettier-ignore
const paramConvertMap = {
  "vitality":       {code: "VIT", display: "Vitality"},
  "strength":       {code: "STR", display: "Strength"},
  "dexterity":      {code: "DEX", display: "Dexterity"},
  "intelligence":   {code: "INT", display: "Intelligence"},
  "mind":           {code: "MND", display: "Mind"},
  "piety":          {code: "PIE", display: "Piety"},
  "tenacity":       {code: "TNC", display: "Tenacity"},
  "directHit":      {code: "DH",  display: "Direct Hit Rate"},
  "crit":           {code: "CRT", display: "Critical Hit"},
  "determination":  {code: "DET", display: "Determination"},
  "spdSkill":       {code: "SKS", display: "Skill Speed"},
  "spdSpell":       {code: "SPS", display: "Spell Speed"},
  "delay":          {code: "AA",  display: "Attack Delay"},
  "wdPhys":         {code: "WD",  display: "Physical Damage"},
  "wdMag":          {code: "WD",  display: "Magical Damage"},
  "defPhys":        {code: "DEF", display: "Physical Defense"},
  "defMag":         {code: "DEF", display: "Magical Defense"},
  "blockRate":      {code: "unk", display: "Block Rate"},
  "blockStr":       {code: "unk", display: "Block Strength"},
}

export function convertParamsToAbbr(obj) {
  let translated = {};

  for (const [key, value] of Object.entries(obj)) {
    // Keep the higher value, in case of stats which share an abbreviation
    translated[paramConvertMap[key].code] =
      translated[paramConvertMap[key].code] > value ? translated[paramConvertMap[key].code] : value;
  }
  return translated;
}

export function convertParamToAbbr(paramKey) {
  return paramConvertMap[paramKey].code;
}

export function exdIdToKey(paramId) {
  return exdIdToParamKey[paramId];
}

export function exdStatsByIds(obj) {
  let translated = {};

  for (const [id, value] of Object.entries(obj)) {
    const param = exdIdToParamKey[id];
    if (!param) continue;
    translated[param] = value;
  }
  return translated;
}

export function exdStatsByString(obj) {
  let translated = {};

  for (let [param, value] of Object.entries(obj)) {
    // regex to insert spaces before capital letters
    param = param.replace(/([a-z])([A-Z])/g, "$1 $2").trim();
    translated[exdStringToParamKey[param]] = value;
  }
  return translated;
}
