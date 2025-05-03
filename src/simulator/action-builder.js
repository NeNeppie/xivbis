class ActionBuilder {
  CreateBase(name, potency) {
    return {
      name: name,
      potency: potency,

      setTimers(timers) {
        this.baseCastTime = timers.baseCastTime;
        this.baseRecastTime = timers.baseRecastTime;
        this.applicationTime = timers.applicationTime;
        this.animationLock = timers.animationLock;
        return this;
      },

      setComboAction(comboActions, comboPotency) {
        this.comboPotency = comboPotency;
        this.comboActions = comboActions;
        // Need to decide whether my input is the action object (use prev.name here), or its name directly
        this.applyCombo = (prev) => {
          return this.checkCombo(prev) ? this.comboPotency : this.potency;
        };
        this.checkCombo = (prev) => {
          return this.comboActions.includes(prev) ? true : false;
        };
        return this;
      },

      setCondition(callback) {
        this.condition = function () {
          const res = callback.call(this);
          return !res ? false : res;
        };
        return this;
      },

      addDamageOverTime(duration, potency, linkToCombo) {
        linkToCombo = this.comboActions ? linkToCombo : false;

        this.dots ??= [];

        this.dots.push({
          name: this.name,
          duration: duration,
          potency: potency,
          onSuccessfulCombo: linkToCombo,
        });
        return this;
      },

      // effect should probably be a callback function since there are many types of status effects
      // (damage up, crit up, DH up, action allowance, vulnerabiltiy [...])
      addStatusEffect(status, linkToCombo) {
        this.statuses ??= [];
        this.statuses.push({ ...status, onSuccessfulCombo: linkToCombo });
        return this;
      },
    };
  }

  CreateBaseGCD(name, potency) {
    let action = this.CreateBase(name, potency);
    action.isGCD = true;
    return action;
  }

  CreateBaseOGCD(name, potency) {
    let action = this.CreateBase(name, potency);
    action.isGCD = false;
    return action;
  }
}

export default new ActionBuilder();
