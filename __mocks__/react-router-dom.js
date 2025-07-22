module.exports = {
  HashRouter: ({ children }) => children,
  Routes: ({ children }) => children,
  Route: () => null,
  Link: ({ children }) => children,
  useLocation: () => ({ pathname: '/' }),
};
