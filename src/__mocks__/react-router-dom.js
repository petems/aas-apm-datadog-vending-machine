module.exports = {
  BrowserRouter: ({ children }) => children,
  Routes: ({ children }) => children,
  Route: ({ children }) => children,
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/' }),
  useParams: () => ({}),
  Link: ({ children, to }) => children,
  NavLink: ({ children, to }) => children,
  Outlet: () => null,
  Navigate: ({ to }) => null,
};