export const useAuth = () => ({
  isAuthenticated: false,
  accessToken: null as string | null,
  isLoading: false,
  error: null as string | null,
  login: async () => {},
  logout: () => {},
  clearError: () => {},
  refreshToken: async () => {},
});
