var testConfig = {
  logPerformance: false,
  timeout: 5000,
};

export function configure(config) {
  testConfig.logPerformance = config.logPerformance ?? false;
  testConfig.timeout = config.timeout ?? 5000;
}

export function describe(description, func) {
  console.log(`\x1b[1;33m${description}\x1b[0m`);
  console.log(`Profiling: \x1b[38;5;214m${testConfig.logPerformance}\x1b[0m`);

  const startTime = performance.now();
  func.call(this);
  const endTime = performance.now();

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
  } catch {
    logFailure(description, start);
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

function logFailure(description, startTime) {
  const endTime = performance.now();
  let logMessage = `\x1b[1;38;5;88m\u2717\x1b[0m  ${description}`;
  if (testConfig?.logPerformance) {
    const elapsed = (endTime - startTime).toFixed(4);
    logMessage += ` \x1b[33m(${elapsed} ms)\x1b[0m`;
  }
  console.log(logMessage);
}

export const assert = {
  condition: function (value) {
    if (!value) {
      throw new Error();
    }
  },

  equals: function (expected, value) {
    if (expected != value) {
      throw new Error();
    }
  },

  deepEquals: function (expected, value) {
    if (expected !== value) {
      throw new Error();
    }
  },
};
