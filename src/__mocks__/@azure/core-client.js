module.exports = {
  ServiceClient: class ServiceClient {
    constructor() {
      this.pipeline = {
        sendRequest: jest.fn(),
      };
    }
  },
  createClientLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
};