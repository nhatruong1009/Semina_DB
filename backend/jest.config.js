module.exports = {
  testEnvironment: "node",   // ensures Node.js APIs are available
  verbose: true,             // shows detailed test results
  setupFiles: ["./jest.setup.js"],
  testMatch: ["**/__tests__/**/*.js", "**/?(*.)+(spec|test).js"], 
  // looks for tests in __tests__ folders or files ending with .test.js/.spec.js
};
