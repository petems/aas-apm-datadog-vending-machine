/* eslint-disable */
module.exports = {
  createPipelineFromOptions: jest.fn(() => ({
    addPolicy: jest.fn(),
    sendRequest: jest.fn(),
  })),
  createHttpHeaders: jest.fn(() => ({})),
  createPipelineRequest: jest.fn(() => ({})),
  RestError: class RestError extends Error {
    constructor(message, statusCode) {
      super(message);
      this.statusCode = statusCode;
    }
  },
};