export class TrackerBase {
  constructor() {
    this.eventType = "N/A";
    this.eventName = "Unknown Event";
    this.timer = 0;
    this.triggerCounter = 0; // TEMP: Not *that* useful to have. Should be replaced with more meaningful information
    this.active = true;
  }

  generateEvent() {
    this.triggerCounter++;
  }
}

export class TrackerArray extends Array {
  append(tracker) {
    super.push(tracker);
  }

  remove(tracker) {
    if ((index = super.indexOf(tracker)) !== -1) {
      super.splice(index, 1);
    }
  }

  getTrackerByName(name) {
    return super.find((e) => e.eventName === name);
  }

  getActiveTrackerByName(name) {
    return super.find((e) => e.eventName === name && e.active);
  }

  getTrackersByType(type) {
    return super.flatMap((e) => (e.eventType === type ? [e] : []));
  }

  getActiveTrackersByType(type) {
    return super.flatMap((e) => (e.eventType === type && e.active ? [e] : []));
  }

  getTracker(type, name) {
    return super.find((e) => e.eventType === type && e.eventName === name);
  }

  getActiveTracker(type, name) {
    return super.find((e) => e.eventType === type && e.eventName === name && e.active);
  }

  getActive() {
    return super.flatMap((tracker) => {
      if (tracker.active) {
        return [tracker];
      } else {
        return [];
      }
    });
  }
}
