// prettier-ignore
const paramConvertMap = {
  "Vitality":         {code: "VIT", key: "vitality"},
  "Strength":         {code: "STR", key: "strength"},
  "Dexterity":        {code: "DEX", key: "dexterity"},
  "Intelligence":     {code: "INT", key: "intelligence"},
  "Mind":             {code: "MND", key: "mind"},
  "Determination":    {code: "DET", key: "determination"},
  "Tenacity":         {code: "TNC", key: "tenacity"},
  "Piety":            {code: "PIE", key: "piety"},
  "Critical Hit":     {code: "CRT", key: "crit"},
  "Direct Hit Rate":  {code: "DH",  key: "directHit"},
  "Skill Speed":      {code: "SKS", key: "spdSkill"},
  "Spell Speed":      {code: "SPS", key: "spdSpell"},
  "Physical Damage":  {code: "WD",  key: "wdPhys"},
  "Magical Damage":     {code: "WD",  key: "wdMag"},
  "Attack Delay":     {code: "AA",  key: "delay"},
  "Defense":          {code: "DEF", key: "defPhys"},
  "Magic Defense":    {code: "DEF", key: "defMag"},
  "Block Rate":       {code: "unk", key: "blockRate"},
  "Block Strength":   {code: "unk", key: "blockStr"},
};

export function convertParamsToAbbr(obj) {
  let translated = {};

  for (const [key, value] of Object.entries(obj)) {
    // Keep the higher value, in case of stats which share an abbreviation
    translated[paramConvertMap[key].code] =
      translated[paramConvertMap[key].code] > value ? translated[paramConvertMap[key].code] : value;
  }
  return translated;
}

export function exdConvertToKeys(obj) {
  let translated = {};

  for (let [param, value] of Object.entries(obj)) {
    // regex to insert spaces before capital letters
    param = param.replace(/([A-Z])/g, " $1").trim();
    translated[paramConvertMap[param].key] = value;
  }
  return translated;
}

export function convertParamToAbbr(paramKey) {
  return paramConvertMap[paramKey].code;
}

/** Supports items that split their nq and hq stats */
export function convertStatKeys(stats, statsHQ) {
  let translated = {};

  for (const [key, value] of Object.entries(paramConvertMap)) {
    translated[value.key] = stats[key] ?? 0;
  }

  // Passing HQ stats treats the item as its HQ variant.
  if (statsHQ !== undefined) {
    for (const [key, value] of Object.entries(statsHQ)) {
      translated[paramConvertMap[key].key] += value;
    }
  }
  return translated;
}
