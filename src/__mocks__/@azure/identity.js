module.exports = {
  DefaultAzureCredential: class DefaultAzureCredential {
    constructor() {
      this.getToken = jest.fn();
    }
  },
  ClientSecretCredential: class ClientSecretCredential {
    constructor() {
      this.getToken = jest.fn();
    }
  },
  InteractiveBrowserCredential: class InteractiveBrowserCredential {
    constructor() {
      this.getToken = jest.fn();
    }
  },
  TokenCredential: class TokenCredential {
    getToken() {
      return Promise.resolve({ token: 'mock-token', expiresOnTimestamp: Date.now() + 3600000 });
    }
  },
};