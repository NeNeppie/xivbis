const DEFAULT_ANIMATION_LOCK = 0.6;

class ActionBuilder {
  CreateBase(name, potency) {
    return {
      name: name,
      potency: potency,

      /**
       * Sets the action's timers.
       * @param {object} timers Respects the following keys:
       *  baseCastTime, baseRecastTime, cooldown, applicationTime, animationLock, charges
       */
      // Some GCDs have a long cooldown but don't affect the recast time e.g. SMN summons
      // Some GCDs have longer/shorter than usual recast timers e.g. Picto
      // So I need a separate `cooldown` property
      setTimers(timers) {
        this.baseCastTime = timers.baseCastTime ?? 0;
        this.baseRecastTime = timers.baseRecastTime ?? 0.6;
        this.cooldown = timers.cooldown ?? 0;
        this.applicationTime = timers.applicationTime ?? 0;
        this.animationLock = timers.animationLock ?? DEFAULT_ANIMATION_LOCK;
        this.charges = timers.charges ?? 1;
        return this;
      },

      /**
       * Sets combo action(s) to the target action.
       * @param {Array} comboActions Valid combo actions preceding the target action
       * @param {number} comboPotency Target action potency when a combo is executed
       */
      setComboAction(comboActions, comboPotency) {
        this.comboPotency = comboPotency;
        this.comboActions = comboActions;
        // Need to decide whether my input is the action object (use prev.name here), or its name directly
        this.applyCombo = (prev, prevState) => {
          return this.checkCombo(prev, prevState) ? this.comboPotency : this.potency;
        };
        this.checkCombo = (prev, prevState) => {
          return this.comboActions.includes(prev) && prevState ? true : false;
        };
        return this;
      },

      /**
       * Sets a Condition property that defines certain rules for an action to be executed.
       *
       * Implemented conditions:
       *
       * hasStatus - status-name. Supports an array.
       *
       * hasResource - { resource-name: { trait } }
       * @param {Object} conditions
       */
      setCondition(conditions) {
        this.condition = conditions;
        return this;
      },

      /**
       * Appends a Damage over Time object to the action.
       * @param {number} duration DoT Duration
       * @param {number} potency DoT Potency
       * @param {boolean} requireCombo Whether the effect should only trigger on successful combo execution
       */
      addDamageOverTime(duration, potency, dmgType, requireCombo) {
        requireCombo = this.comboActions ? requireCombo : false;

        this.dotInfo ??= [];
        this.dotInfo.push({
          name: this.name,
          // TODO: Ground DoTs (Salted Earth, Doton, etc.) gain an additional damage tick on application (provided the enemy is in range at the time)
          duration: duration,
          potency: potency,
          type: dmgType,
          requireCombo: requireCombo,
        });
        return this;
      },

      /**
       * Appends a Status Effect to the action.
       * @param {object} status Status Effect object
       * @param {boolean} requireCombo Whether the effect should only trigger on successful combo execution
       */
      addStatusEffect(status, requireCombo = true) {
        this.statusInfo ??= [];
        this.statusInfo.push({ ...status, requireCombo: requireCombo });
        return this;
      },

      /**
       * Appends instructions to manipluate job gauges, on action use, to the action.
       * @param {string} gaugeName
       * @param {object} rules Indicates how should the gauge be manipulated:
       * { `changeCount`: number `setTime`: number `reset`: bool } , all opt.
       */
      addGaugeInfo(gaugeName, ruleset) {
        this.gaugeInfo ??= [];
        this.gaugeInfo.push({
          name: gaugeName,
          changeCount: ruleset.changeCount ?? 0,
          setTime: ruleset.setTime ?? NaN,
          shouldResetGauge: ruleset.reset ?? false,
        });
        return this;
      },
    };
  }

  CreateWeaponskill(name, potency, dmgType = "physical") {
    let action = this.CreateBase(name, potency);
    action.isGCD = true;
    action.type = "weaponskill";
    action.damageType = dmgType;
    return action;
  }

  CreateSpell(name, potency, dmgType = "magic") {
    let action = this.CreateBase(name, potency);
    action.isGCD = true;
    action.type = "spell";
    action.damageType = dmgType;
    return action;
  }

  CreateBaseOGCD(name, potency, dmgType) {
    let action = this.CreateBase(name, potency);
    action.isGCD = false;
    action.type = "ability";
    action.damageType = dmgType;
    return action;
  }

  CreateOGCDMagic(name, potency) {
    return this.CreateBaseOGCD(name, potency, "magic");
  }

  CreateOGCDPhysical(name, potency) {
    return this.CreateBaseOGCD(name, potency, "physical");
  }
}

export default new ActionBuilder();
