import { assert, configure, describe, it, not } from "./test-framework.js";

configure({ logPerformance: true });

describe("Unit Testing the Unit Tester", () => {
  it("Triggers a negative (failed) test", () => {
    assert.condition(null);
  });

  it("Triggers a positive (successful) test", () => {
    assert.condition(1 + 1);
  });

  it("Should accept truthy/falsy values for Equals", () => {
    assert.equals(true, 1);
  });

  it("Shouldn't accept truthy/falsy values for DeepEquals", () => {
    not(assert.deepEquals, null, undefined);
  });

  // Just for fun, as an exercise
  it("Flips the success state multiple times when encapsulating `not`", () => {
    not(assert.condition, false);

    not(function () {
      not(assert.condition, true);
    });

    // True
    not(function () {
      // False
      not(function () {
        // True
        not(function () {
          // False
          not(assert.condition, true);
        });
      });
    });
  });
});
