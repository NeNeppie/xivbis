var testConfig = {
  logPerformance: false,
  timeout: 5000,
  describeIndent: 0,
};

export function configure(config) {
  testConfig.logPerformance = config.logPerformance ?? false;
  testConfig.timeout = config.timeout ?? 5000;
}

export function describe(description, func) {
  console.log(`${" ".repeat(testConfig.describeIndent * 2)}\x1b[1;33m${description}\x1b[0m`);
  //console.log(`Profiling: \x1b[38;5;214m${testConfig.logPerformance}\x1b[0m`);

  testConfig.describeIndent++;
  const startTime = performance.now();
  func.call(this);
  const endTime = performance.now();
  testConfig.describeIndent--;

  if (testConfig?.logPerformance) {
    console.log(`Time elapsed: ${(endTime - startTime).toFixed(4)} ms`);
  }
}

export function it(description, func) {
  const start = performance.now();
  try {
    func();
    logSuccess(description, start);
    return true;
  } catch (e) {
    logFailure(description, start, e);
    return false;
  }
}

export function not(func, ...args) {
  try {
    func.apply(this, args);
    throw new Error("not");
  } catch (e) {
    if (e.message === "not") {
      e.message = "";
      throw e;
    }
  }
}

function logSuccess(description, startTime) {
  const endTime = performance.now();
  let logMessage = `\x1b[1;38;5;72m\u2713\x1b[0m  ${description}`;
  if (testConfig?.logPerformance) {
    const elapsed = (endTime - startTime).toFixed(4);
    logMessage += ` \x1b[33m(${elapsed} ms)\x1b[0m`;
  }
  console.log(logMessage);
}

function logFailure(description, startTime, error) {
  const endTime = performance.now();
  let logMessage = `\x1b[1;38;5;88m\u2717\x1b[0m  ${description}`;
  if (testConfig?.logPerformance) {
    const elapsed = (endTime - startTime).toFixed(4);
    logMessage += ` \x1b[33m(${elapsed} ms)\x1b[0m`;
  }
  console.log(logMessage);
  console.error(error);
}

export const assert = {
  condition: function (value) {
    if (!value) {
      throw new Error();
    }
  },

  equals: function (actual, expected) {
    if (expected != actual) {
      throw new Error();
    }
  },

  strictEquals: function (actual, expected) {
    if (expected !== actual) {
      throw new Error();
    }
  },

  deepEquals: function (actual, expected) {
    const jsonExpected = JSON.stringify(expected);
    const jsonActual = JSON.stringify(actual);

    if (jsonExpected !== jsonActual) {
      throw new Error();
    }
  },

  partialDeepEquals: function (actual, expected) {
    const deepLoopKeys = (obj1, obj2) => {
      let result = {};
      for (const k in obj1) {
        if (typeof obj1[k] === "object") {
          result[k] = deepLoopKeys(obj1[k], obj2[k]);
        } else if (obj2.hasOwnProperty(k)) {
          result[k] = obj2[k];
        }
      }
      return result;
    };

    const stripped = deepLoopKeys(expected, actual);
    this.deepEquals(expected, stripped);
  },
};
