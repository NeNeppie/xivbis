class ActionBuilder {
  CreateBase(name, potency) {
    return {
      name: name,
      potency: potency,

      /**
       * Sets the action's timers: Cast Time, Cooldown, Application and Animation.
       * @param {object} timers
       */
      setTimers(timers) {
        this.baseCastTime = timers.baseCastTime;
        this.baseRecastTime = timers.baseRecastTime;
        this.applicationTime = timers.applicationTime;
        this.animationLock = timers.animationLock;
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
       * Sets a callback function which determines if the action is allowed to be executed.
       * @param {function} callback
       */
      setCondition(callback) {
        this.condition = function () {
          const res = callback.call(this);
          return !res ? false : res;
        };
        return this;
      },

      /**
       * Appends a Damage over Time object to the action.
       * @param {number} duration DoT Duration
       * @param {number} potency DoT Potency
       * @param {boolean} linkToCombo Whether the effect should only trigger on successful combo execution
       */
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

      /**
       * Appends a Status Effect to the action.
       * @param {object} status Status Effect object
       * @param {boolean} linkToCombo Whether the effect should only trigger on successful combo execution
       */
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
