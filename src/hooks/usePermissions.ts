import { useAuth } from "./useAuth";

export function usePermissions() {
  const { role } = useAuth();

  const isClient = role === "user";
  const isAdmin = role === "admin";
  const isManager = role === "manager";

  return {
    role,
    isClient,
    isAdmin,
    isManager
  };
}

