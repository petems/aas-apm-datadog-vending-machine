# 🧪 Testing Guide

## Testing Stack

### Core Testing Libraries
- **Jest** - Test runner and assertion library
- **React Testing Library** - Component testing utilities
- **@testing-library/jest-dom** - Custom Jest matchers
- **ts-jest** - TypeScript support for Jest
- **MSW** - API mocking for integration tests

### Additional Tools
- **@testing-library/user-event** - User interaction simulation
- **jest-environment-jsdom** - Browser-like environment for tests

## Test Structure

```
src/
├── __tests__/
│   └── test-utils.tsx          # Testing utilities & providers
├── components/
│   └── __tests__/
│       ├── LoadingSpinner.test.tsx
│       └── ErrorAlert.test.tsx
├── hooks/
│   └── __tests__/
│       ├── useAuth.test.ts
│       └── useAzureApi.test.ts
├── services/
│   └── __tests__/
│       └── azureService.test.ts
└── setupTests.ts               # Global test configuration
```

## Running Tests

### Local Development
```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test --watch

# Run tests with coverage
yarn test:coverage

# Run specific test file
yarn test LoadingSpinner.test.tsx

# Run tests matching pattern
yarn test --testNamePattern="should render"
```

### CI/CD Pipeline
Tests run automatically on:
- Every push to `master`/`main`
- Every pull request
- Manual workflow dispatch

## Test Categories

### 1. Unit Tests
**What we test:**
- Individual functions and methods
- Custom hooks in isolation
- Component rendering and behavior
- Service layer API calls

**Example:**
```typescript
// src/services/__tests__/azureService.test.ts
describe('AzureService', () => {
  it('should fetch subscriptions successfully', async () => {
    const mockData = { value: [mockSubscription] };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    } as Response);

    const result = await service.getSubscriptions();
    expect(result).toEqual([mockSubscription]);
  });
});
```

### 2. Integration Tests
**What we test:**
- Component + hook interactions
- API calls with React Query
- Authentication flows
- Error handling across layers

**Example:**
```typescript
// src/hooks/__tests__/useAzureApi.test.ts
describe('useSubscriptions', () => {
  it('should fetch subscriptions successfully', async () => {
    const { result } = renderHook(
      () => useSubscriptions(mockAccessToken),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});
```

### 3. Component Tests
**What we test:**
- Component rendering
- User interactions
- Accessibility compliance
- Props handling

**Example:**
```typescript
// src/components/__tests__/LoadingSpinner.test.tsx
describe('LoadingSpinner', () => {
  it('should have proper accessibility attributes', () => {
    render(<LoadingSpinner message="Please wait" />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveAttribute('aria-label', 'Loading');
    expect(spinner).toHaveAttribute('aria-live', 'polite');
  });
});
```

## Mocking Strategy

### 1. Azure MSAL
```typescript
// Mocked in setupTests.ts
jest.mock('@azure/msal-browser', () => ({
  PublicClientApplication: jest.fn().mockImplementation(() => ({
    acquireTokenSilent: jest.fn(),
    acquireTokenPopup: jest.fn(),
    loginPopup: jest.fn(),
    logoutPopup: jest.fn(),
  })),
}));
```

### 2. Fetch API
```typescript
// Global fetch mock
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

beforeEach(() => {
  mockFetch.mockClear();
});
```

### 3. React Query
```typescript
// Custom test wrapper with QueryClient
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <MsalProvider instance={mockMsalInstance}>
        {children}
      </MsalProvider>
    </QueryClientProvider>
  );
};
```

## Coverage Requirements

### Current Thresholds
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

### Coverage Reports
```bash
# Generate coverage report
yarn test:coverage

# View HTML report
open coverage/lcov-report/index.html
```

### Files Excluded from Coverage
- `src/index.tsx` - Application entry point
- `src/reportWebVitals.ts` - Performance monitoring
- `src/**/*.d.ts` - Type definitions
- `src/**/__tests__/**` - Test files themselves
- `src/**/*.stories.{ts,tsx}` - Storybook files

## Test Data & Utilities

### Mock Data
```typescript
// src/__tests__/test-utils.tsx
export const mockSubscription = {
  subscriptionId: 'test-sub-id',
  displayName: 'Test Subscription',
  state: 'Enabled',
  tenantId: 'test-tenant-id',
};

export const mockAppService = {
  id: '/subscriptions/test-sub-id/resourceGroups/test-rg/providers/Microsoft.Web/sites/test-app',
  name: 'test-app',
  resourceGroup: 'test-rg',
  location: 'East US',
  kind: 'app',
  properties: {
    hostNames: ['test-app.azurewebsites.net'],
    state: 'Running',
    siteConfig: {},
  },
};
```

### Custom Render Function
```typescript
// Enhanced render with all providers
export const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });
```

## Best Practices

### 1. Test Organization
- **Group related tests** with `describe` blocks
- **Use descriptive test names** that explain the expected behavior
- **Follow AAA pattern**: Arrange, Act, Assert

### 2. Mocking Guidelines
- **Mock external dependencies** (APIs, third-party libraries)
- **Don't mock what you're testing** (the component/hook under test)
- **Reset mocks** between tests with `jest.clearAllMocks()`

### 3. Async Testing
- **Use `waitFor`** for async operations
- **Prefer `findBy*` queries** for elements that appear asynchronously
- **Test loading and error states** as well as success states

### 4. Accessibility Testing
- **Test with screen readers in mind** using `getByRole`
- **Verify ARIA attributes** are correctly set
- **Check keyboard navigation** with `userEvent`

## Debugging Tests

### 1. Debug Individual Tests
```bash
# Run with verbose output
yarn test --verbose

# Debug specific test
yarn test --testNamePattern="should fetch subscriptions" --verbose
```

### 2. Visual Debugging
```typescript
// In your test file
import { screen } from '@testing-library/react';

// Debug rendered output
screen.debug();

// Debug specific element
screen.debug(screen.getByRole('button'));
```

### 3. VS Code Integration
```json
// .vscode/launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Jest Tests",
  "program": "${workspaceFolder}/node_modules/.bin/react-scripts",
  "args": ["test", "--runInBand", "--no-cache", "--watchAll=false"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## CI/CD Integration

### GitHub Actions Workflow
The test workflow includes:

1. **Code Quality Checks**
   - TypeScript type checking
   - ESLint linting
   - Prettier formatting

2. **Unit Test Execution**
   - Test execution with coverage
   - Coverage upload to Codecov

3. **Build Verification**
   - Production build test
   - Bundle size reporting

4. **Matrix Testing**
   - Multiple Node.js versions (16, 18, 20)
   - Only on pull requests

5. **Security Auditing**
   - yarn audit for vulnerabilities
   - audit-ci for CI-specific checks

### Coverage Integration
- **Codecov** integration for coverage tracking
- **Coverage thresholds** enforced in CI
- **Coverage reports** in pull request comments

## Performance Testing

### Bundle Size Monitoring
```bash
# Analyze bundle size
yarn build
du -sh build/static/js/*.js
```

### Test Performance
```typescript
// Measure test execution time
jest.setTimeout(10000); // 10 second timeout

// Profile slow tests
yarn test --detectSlowTests
```

## Future Enhancements

### Potential Additions
1. **E2E Testing** with Playwright
2. **Visual Regression Testing** with Chromatic
3. **Performance Testing** with Lighthouse CI
4. **API Contract Testing** with Pact
5. **Mutation Testing** with Stryker

### Test Infrastructure
1. **Parallel test execution** for faster CI
2. **Test result caching** for repeated runs
3. **Flaky test detection** and reporting
4. **Test analytics** and reporting dashboards

This comprehensive testing setup ensures high code quality, prevents regressions, and provides confidence in deployments! 🚀 