module.exports = {
  WebSiteManagementClient: class WebSiteManagementClient {
    constructor() {
      this.webApps = {
        get: jest.fn(),
        update: jest.fn(),
        list: jest.fn(),
        getConfiguration: jest.fn(),
        updateConfiguration: jest.fn(),
        updateApplicationSettings: jest.fn(),
        getApplicationSettings: jest.fn(),
        listApplicationSettings: jest.fn(),
      };
      this.appServicePlans = {
        get: jest.fn(),
        list: jest.fn(),
      };
      this.resourceGroups = {
        get: jest.fn(),
        list: jest.fn(),
      };
    }
  },
};