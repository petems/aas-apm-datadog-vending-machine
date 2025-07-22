/* eslint-disable */
module.exports = {
  createClientLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
  setLogLevel: jest.fn(),
  LogLevel: {
    VERBOSE: 0,
    INFO: 1,
    WARNING: 2,
    ERROR: 3,
  },
};