module.exports = {
  ResourceManagementClient: class ResourceManagementClient {
    constructor() {
      this.resourceGroups = {
        get: jest.fn(),
        list: jest.fn(),
        createOrUpdate: jest.fn(),
        delete: jest.fn(),
      };
      this.resources = {
        get: jest.fn(),
        list: jest.fn(),
        createOrUpdate: jest.fn(),
        delete: jest.fn(),
      };
      this.deployments = {
        get: jest.fn(),
        list: jest.fn(),
        createOrUpdate: jest.fn(),
        validate: jest.fn(),
      };
    }
  },
};