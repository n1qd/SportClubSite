import { useAuth } from "./useAuth";

export function usePermissions() {
  const { role } = useAuth();

  const isClient = role === "CLIENT";
  const isAdmin = role === "ADMIN";
  const isManager = role === "MANAGER";

  return {
    role,
    isClient,
    isAdmin,
    isManager
  };
}

