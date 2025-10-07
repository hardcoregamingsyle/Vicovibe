import { api } from "@/convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";

import { useEffect, useState } from "react";

export function useAuth() {
  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth();
  const user = useQuery(api.users.currentUser);
  const { signIn, signOut } = useAuthActions();

  const [isLoading, setIsLoading] = useState(true);

  // This effect updates the loading state once auth is loaded and user data is available
  // It ensures we only show content when both authentication state and user data are ready
  useEffect(() => {
    // If auth is still loading, keep loading state true
    if (isAuthLoading) {
      setIsLoading(true);
      return;
    }
    
    // If not authenticated, we're done loading (user will be null)
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }
    
    // If authenticated, wait for user data to load
    if (user !== undefined) {
      setIsLoading(false);
    }
  }, [isAuthLoading, isAuthenticated, user]);

  return {
    isLoading,
    isAuthenticated,
    user: isAuthenticated ? user : null,
    signIn,
    signOut,
  };
}