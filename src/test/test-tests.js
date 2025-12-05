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

  it("Shouldn't accept truthy/falsy values for strictEquals", () => {
    not(assert.strictEquals, null, undefined);
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

  it("Correctly compares objects with depth", () => {
    assert.deepEquals({ a: 1, b: { c: 3 } }, { a: 1, b: { c: 3 } });
    not(assert.deepEquals, ({ a: 1, b: { c: 3 } }, { a: 1, b: { d: 4 } }));
  });

  it("Correctly compares a select portion of an object", () => {
    assert.partialDeepEquals({ a: 1, b: 2, c: { e: 5, d: 4 } }, { a: 1, c: { d: 4 } });
  });
});

configure({ logPerformance: false });
describe("[0] Testing `describe` indentation", () => {
  describe("[1]", () => {
    describe("[2]", () => {
      describe("[3]", () => {});
    });

    describe("[2] Hello", () => {});
  });

  describe("[1]", () => {
    describe("[2]", () => {});
  });
});

describe("[0] World", () => {
  describe("[1]", () => {});
});
