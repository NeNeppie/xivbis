import { jobs } from "./constants/job-consts.js";
import { jobModifiers, levelModifiers, tribalStats } from "./constants/modifiers.js";
import { cel, flr, sumObjectsByKey } from "./utils/math-utils.js";

function calcBaseAttribute(lv, job, tribe, stat) {
  const tribeStat = tribalStats[tribe][stat];
  const attribute = levelModifiers[lv].main * jobModifiers[job][stat];
  return flr(attribute) + tribeStat;
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

function getWeaponDamageMultiplier(lv, job, weaponDamage, isAuto = false) {
  const attribute = isAuto ? jobs[job].autoStat : jobs[job].mainStat;
  const statModifier = jobModifiers[job][attribute];
  return flr((levelModifiers[lv].main * statModifier) / 10 + weaponDamage);
}

function getAutoAttackModifier(lv, job, weaponDamage, delay) {
  return flr(getWeaponDamageMultiplier(lv, job, weaponDamage, true) * (delay / 3));
}

function getAttackPower(lv, job, attribute) {
  const coefficient = jobs[job].role === "tank" ? levelModifiers[lv].mapTank : levelModifiers[lv].mapNormal;
  const baseMult = (coefficient * (attribute - levelModifiers[lv].main)) / levelModifiers[lv].main;
  return ((100 + baseMult) | 0) / 100;
}

function getDeterminationMultiplier(lv, statDET) {
  return (1000 + getMainstatModifier(lv, statDET, 140)) / 1000;
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

/** `cooldown` is in seconds. Simplified version */
function getGlobalCoolDown(lv, statSpeed, baseGCD) {
  // getSubstatMultiplier() but Ceiled instead of Floored.
  const speed = cel((130 * (statSpeed - levelModifiers[lv].sub)) / levelModifiers[lv].div);
  return flr((baseGCD * (1000 + speed)) / 1000);
}

/**
 * Basic function for base damage calculation. Does not factor in Critical Hit and Direct Hit.
 */
export function calculateBaseDamage(level, job, stats, potency, isAuto = false, isDot = false, buffDmg = 0) {
  const attribute = isAuto ? stats[jobs[job].autoStat] : stats[jobs[job].mainStat];
  const speedStat = isAuto /* || attackType === Weaponskill */ ? stats.spdSkill : stats.spdSpell;

  const multiplierSPD = isAuto || isDot ? getSpeedMultiplier(level, speedStat) : 1.0;
  const multiplierAP = getAttackPower(level, job, attribute);
  const multiplierDET = getDeterminationMultiplier(level, stats.determination);
  const multiplierTNC = getTenacityMultiplier(level, job, stats.tenacity);
  // TODO: Distinguish between Physical (Weaponskill) & Magical (Spell). Magic uses a slightly different formula
  //       Calculations while under the effect of a Crit Direct Hit Guarantee buff.
  const multiplierWD = isAuto
    ? getAutoAttackModifier(level, job, stats.wdPhys, stats.delay)
    : getWeaponDamageMultiplier(level, job, stats.wdPhys);

  let damage = flr((potency / 100) * multiplierWD * flr(multiplierAP * multiplierDET, 2)) * multiplierTNC * multiplierSPD;
  // console.log(
  //   `DMG = (${potency}p * ${multiplierWD}wd * (${multiplierAP}ap * ${multiplierDET}det)) * ${multiplierTNC}tnc (* ${multiplierSPD}spd)`
  // );

  const trait = jobs[job].traitBonus;
  if (typeof trait !== "undefined") {
    damage *= trait;
  }
  if (potency < 100) {
    damage += 1;
  }

  // TODO: Research standard deviation / uniform distribution
  //return D2 * (getRandomInt(95, 105) / 100) /* * getBuffs() calculate afterwards */;
  damage += damage * buffDmg;
  return flr(damage, 2);
}

/**
 * Applies Crit and Direct Hit stats unto base damage. Result is floored down to the hundredth.
 */
export function applyCritDh(level, baseDamage, stats, buffCrit = 0, buffDirect = 0) {
  const multiplierCrit = getCritMultiplier(level, stats.crit);
  const probabilityCrit = getCritHitRate(level, stats.crit) / 100;
  const probabilityDirect = getDirectHitRate(level, stats.directHit) / 100;

  //console.log(`critRate: ${probabilityCrit}, directRate: ${probabilityDirect}, critMult: ${multiplierCrit}`);

  const directHit = 1 + (probabilityDirect + buffDirect) * 0.25;
  const criticalHit = 1 + (probabilityCrit + buffCrit) * (multiplierCrit - 1);
  return flr(baseDamage * directHit * criticalHit, 2);
}

/**
 * Performs action damage calculation. Returns computed damage with and without Crit/Direct Hit applied
 */
export function calculateDamage(level, job, stats, potency, isAuto = false, isDot = false, buffs = {}) {
  const dmgBase = calculateBaseDamage(level, job, stats, potency, isAuto, isDot, buffs.damage);
  const dmgExpected = applyCritDh(level, dmgBase, stats, buffs.crit, buffs.direct);

  return { base: dmgBase, expected: dmgExpected };
}
