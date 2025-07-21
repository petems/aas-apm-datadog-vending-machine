// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock fetch globally
global.fetch = jest.fn();

// Suppress console errors in tests
const originalError = console.error;
console.error = (...args: any[]) => {
  // Suppress specific error messages that are expected in tests
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
      args[0].includes('Warning: useLayoutEffect does nothing on the server') ||
      args[0].includes('Warning: An invalid form control') ||
      args[0].includes('Warning: validateDOMNesting') ||
      args[0].includes('Warning: Each child in a list should have a unique "key" prop') ||
      args[0].includes('Warning: componentWillReceiveProps has been renamed') ||
      args[0].includes('Warning: componentWillUpdate has been renamed') ||
      args[0].includes('Warning: componentWillMount has been renamed') ||
      args[0].includes('Warning: Failed prop type') ||
      args[0].includes('Warning: Invalid DOM property') ||
      args[0].includes('Warning: Unknown event handler property') ||
      args[0].includes('Warning: React does not recognize the') ||
      args[0].includes('Warning: validateDOMNesting') ||
      args[0].includes('Warning: findDOMNode is deprecated'))
  ) {
    return;
  }
  originalError.call(console, ...args);
};
