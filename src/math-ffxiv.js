import { jobs } from "./constants/job-consts.js";
import { jobModifiers, levelModifiers, tribalStats } from "./constants/modifiers.js";
import { cel, flr } from "./utils/math-utils.js";

function calcBaseAttribute(lv, job, tribe, stat) {
  const tribeStat = tribalStats[tribe][stat];
  const attribute = levelModifiers[lv].main * jobModifiers[job][stat];
  return flr(attribute) + tribeStat;
}

// yeah I don't know
export function getBaseSubstat(lv) {
  return levelModifiers[lv].sub;
}

export function getBaseStats(lv, job, tribe = "default") {
  // prettier-ignore
  return {
    "Strength": calcBaseAttribute(lv, job, tribe, "strength"),
    "Dexterity": calcBaseAttribute(lv, job, tribe, "dexterity"),
    "Intelligence": calcBaseAttribute(lv, job, tribe, "intelligence"),
    "Mind": calcBaseAttribute(lv, job, tribe, "mind"),
    "Vitality": calcBaseAttribute(lv, job, tribe, "vitality"),
    "Determination": levelModifiers[lv].main,
    "Tenacity": levelModifiers[lv].sub,
    "Critical Hit": levelModifiers[lv].sub,
    "Direct Hit Rate": levelModifiers[lv].sub,
    "Skill Speed": levelModifiers[lv].sub,
    "Spell Speed": levelModifiers[lv].sub,
    "Piety": levelModifiers[lv].sub,
  };
}

function calcHealth(job, lv, statVIT) {
  const healthModifier = jobModifiers[job].health;
  const baseHealth = levelModifiers[lv].HP * healthModifier;
  let vitalityParam = statVIT - levelModifiers[lv].main;

  vitalityParam *= jobs[job].role === "tank" ? levelModifiers[lv].mhpTank : levelModifiers[lv].mhpNormal;

  return flr(baseHealth + vitalityParam);
}

/**
 * Calculates the modifier for a given main stat.
 * @param {number} lv Supported character level
 * @param {number} stat Desired main stat
 * @param {number} coefficient Main Stat coefficient. Differs per stat formula.
 * @returns
 */
function getMainstatModifier(lv, stat, coefficient) {
  return flr((coefficient * (stat - levelModifiers[lv].main)) / levelModifiers[lv].div);
}

/**
 * Calculates the modifier for a given substat.
 * @param {number} lv Supported character level
 * @param {number} substat Desired substat
 * @param {number} coefficient Substat coefficient. Differs per substat formula.
 * @returns
 */
function getSubstatModifier(lv, substat, coefficient) {
  return flr((coefficient * (substat - levelModifiers[lv].sub)) / levelModifiers[lv].div);
}

function getDirectHitRate(lv, statDirect) {
  return getSubstatModifier(lv, statDirect, 550) / 10;
}

function getCritHitRate(lv, statCrit) {
  return (50 + getSubstatModifier(lv, statCrit, 200)) / 10;
}

function getCritMultiplier(lv, statCrit) {
  return (1400 + getSubstatModifier(lv, statCrit, 200)) / 1000;
}

function getWeaponDamageMultiplier(lv, job, weaponDamage) {
  const attribute = jobs[job].mainStat;
  const statModifier = jobModifiers[job][attribute];
  return flr((levelModifiers[lv].main * statModifier) / 10 + weaponDamage) / 100;
}

function getAutoAttackModifier(lv, job, weaponDamage, delay) {
  const attribute = jobs[job].autoStat;
  const statModifier = jobModifiers[job][attribute];
  return flr(flr((levelModifiers[lv].main * statModifier) / 10 + weaponDamage) * (delay / 3000)) / 100;
}

function getAttackPower(lv, job, attribute) {
  const coefficient = jobs[job].role === "tank" ? levelModifiers[lv].mapTank : levelModifiers[lv].mapNormal;
  const baseMult = (coefficient * (attribute - levelModifiers[lv].main)) / levelModifiers[lv].main;
  return ((100 + baseMult) | 0) / 100;
}

function getDeterminationMultiplier(lv, statDET) {
  return (1000 + getMainstatModifier(lv, statDET, 140)) / 1000;
}

function getAutoDirectHitMultiplier(lv, statDH) {
  return getSubstatModifier(lv, statDH, 140) / 10;
}

function getSpeedMultiplier(lv, statSpeed) {
  return (1000 + getSubstatModifier(lv, statSpeed, 130)) / 1000;
}

function getTenacityMultiplier(lv, job, statTNC) {
  if (jobs[job].role === "tank") {
    return (1000 + getSubstatModifier(lv, statTNC, 112)) / 1000;
  }
  return 1;
}

/** `baseGCD` is in seconds. Simplified version */
export function getGlobalCoolDown(lv, statSpeed, baseGCD) {
  // getSubstatMultiplier() but Ceiled instead of Floored, and negative
  const speed = cel((130 * (levelModifiers[lv].sub - statSpeed)) / levelModifiers[lv].div);
  return flr((baseGCD * (1000 + speed)) / 1000);
}

/** returns the minimum and maximum stat points needed to reach a given GCD breakpoint. Arguments are in seconds */
export function getSpeedStatForGCD(lv, targetGCD, baseGCD = 2.5) {
  (targetGCD *= 1000), (baseGCD *= 1000);

  const gcdDiff = (baseGCD - targetGCD) / 10;
  if (gcdDiff === 0) {
    return { min: levelModifiers[lv].sub, max: levelModifiers[lv].sub };
  }
  const baseGCDMult = flr(baseGCD / 10000, 4);
  const tierStep = 1 / baseGCDMult;
  const tierPoints = levelModifiers[lv].div / 130;

  // tierStep decimal matters, floored *after* calculation
  // minimum tier is lower by one than the actual minimum to simplify point calculation
  const validTiers = [flr(tierStep * (gcdDiff - 1)), flr(tierStep * gcdDiff)];
  const pointRange = validTiers.map((tier) => {
    return flr(tier * tierPoints) + levelModifiers[lv].sub;
  });
  return { min: pointRange[0] + 1, max: pointRange[1] };
}

/**
 * Basic function for base damage calculation. Does not factor in Critical Hit and Direct Hit.
 * @param {Number} level Supported character level
 * @param {String} job Abbreviated Job name e.g. "DRG"
 * @param {Gearset.stats} stats Character stats
 * @param {Number} potency Action potency
 * @param {String} actionType Determines which Speed stat is used.
 */
export function calculateRawDamage(level, job, stats, potency, actionType, isAuto = false, isDot = false, buffs) {
  const attribute = isAuto ? stats[jobs[job].autoStat] : stats[jobs[job].mainStat];
  const speedStat = isAuto || actionType === "physical" || actionType === "weaponskill" ? stats.spdSkill : stats.spdSpell;

  const multiplierSPD = isAuto || isDot ? getSpeedMultiplier(level, speedStat) : 1.0;
  const multiplierAP = getAttackPower(level, job, attribute);
  const multiplierDET = getDeterminationMultiplier(level, stats.determination);
  // FIXME: something doesn't add up here
  const multiplierAutoDH = getAutoDirectHitMultiplier(level, stats.directHit);
  const multiplierTNC = getTenacityMultiplier(level, job, stats.tenacity);

  if (buffs.autodirect) {
    // flr((det + dh - 1) * 1000) / 1000
    multiplierDET = multiplierDET + multiplierAutoDH - 1;
  }

  const multiplierWD = isAuto
    ? getAutoAttackModifier(level, job, stats.wdPhys, stats.delay)
    : getWeaponDamageMultiplier(level, job, stats.wdPhys);

  // NOTE: BLU has an action that uses the non-caster formula despite being a caster job
  if ((jobs[job].role === "caster" || jobs[job].role === "healer") && !isAuto) {
    var damage = 0;
    console.warn("Implement Caster Formula!!");
    // TODO: Caster formula for magical jobs.
    // Damage type actually has nothing to do with the damage formula; it only affects the speed stat used in calculations
  } else {
    var damage = flr(flr(flr(flr(potency * multiplierAP * multiplierDET) * multiplierTNC) * multiplierSPD) * multiplierWD);
  }

  damage *= jobs[job].traitBonus ?? 1;
  if (potency < 100) {
    damage += 1;
  }

  //damage *= (getRandomInt(95, 105) / 100);
  damage += damage * (buffs.damage ?? 0);
  return flr(damage, 2);
}

function multAutoCrit(level, statCrit, bonusCritRate = 0) {
  const multiplierCrit = getCritMultiplier(level, statCrit);
  const criticalHitBonus = 1 + bonusCritRate * (multiplierCrit - 1);

  return multiplierCrit * criticalHitBonus;
}

function multCritHit(level, statCrit, bonusCritRate = 0) {
  const multiplierCrit = getCritMultiplier(level, statCrit);
  const probabilityCrit = getCritHitRate(level, statCrit) / 100;

  return 1 + (probabilityCrit + bonusCritRate) * (multiplierCrit - 1);
}

function multAutoDirect(bonusDirectRate = 0) {
  const directHitBonus = 1 + bonusDirectRate * 0.25;

  return 1.25 * directHitBonus;
}

function multDirectHit(level, statDH, bonusDirectRate = 0) {
  const probabilityDirect = getDirectHitRate(level, statDH) / 100;

  return 1 + (probabilityDirect + bonusDirectRate) * 0.25;
}

/**
 * Applies Crit and Direct Hit stats unto base damage. Result is floored down to the hundredth.
 */
export function applyCritDh(level, baseDamage, stats, buffCrit = 0, buffDirect = 0) {
  const multiplierCrit = getCritMultiplier(level, stats.crit);
  const probabilityCrit = getCritHitRate(level, stats.crit) / 100;
  const probabilityDirect = getDirectHitRate(level, stats.directHit) / 100;

  const directHit = 1 + (probabilityDirect + buffDirect) * 0.25;
  const criticalHit = 1 + (probabilityCrit + buffCrit) * (multiplierCrit - 1);
  return flr(baseDamage * directHit * criticalHit, 2);
}

/**
 * Performs action damage calculation. Returns computed damage with and without Crit/Direct Hit applied
 */
export function calculateDamage(level, job, stats, potency, dmgType, isAuto = false, isDot = false, buffs = {}) {
  const rawDamage = calculateRawDamage(level, job, stats, potency, dmgType, isAuto, isDot, buffs);

  const multiplierCritDamage = buffs.autocrit
    ? multAutoCrit(level, stats.crit, buffs.crit)
    : multCritHit(level, stats.crit, buffs.crit);
  const multiplierDhDamage = buffs.autodirect
    ? multAutoDirect(buffs.direct)
    : multDirectHit(level, stats.directHit, buffs.direct);
  const expectedDamage = flr(rawDamage * multiplierCritDamage * multiplierDhDamage, 2);

  return { raw: rawDamage, expected: expectedDamage };
}
