import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CACHE_CONFIG, QUERY_KEYS } from "@/lib/cache/cache-config";

interface NetworkingStats {
  totalCycles: number;
  completedCycles: number;
  totalConversations: number;
  userConversations: number;
  lastCycleDate: string | null;
}

export const useNetworkingData = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEYS.networkingStats(user?.id || ""),
    queryFn: async (): Promise<NetworkingStats> => {
      if (!user) throw new Error("No authenticated user");

      // Get user's internal ID
      const { data: userData } = await supabase
        .from("users")
        .select("id")
        .eq("auth_user_id", user.id)
        .single();

      if (!userData) {
        throw new Error("User not found");
      }

      // Fetch networking cycles stats
      const cycles = [];

      // Fetch conversation logs stats
      const { data: allConversations, error: allConversationsError } =
        await supabase.from("agent_conversations").select("*");

      if (allConversationsError) throw allConversationsError;

      // Fetch user's conversations
      const { data: userConversations, error: userConversationsError } =
        await supabase
          .from("agent_conversations")
          .select("*")
          .or(
            `agent_a_user_id.eq.${userData.id},agent_b_user_id.eq.${userData.id}`
          );

      if (userConversationsError) throw userConversationsError;

      const completedCycles =
        cycles?.filter((c) => c.status === "completed") || [];
      const lastCycle = completedCycles.sort(
        (a, b) =>
          new Date(b.cycle_date).getTime() - new Date(a.cycle_date).getTime()
      )[0];

      return {
        totalCycles: cycles?.length || 0,
        completedCycles: completedCycles.length,
        totalConversations: allConversations?.length || 0,
        userConversations: userConversations?.length || 0,
        lastCycleDate: lastCycle?.cycle_date || null,
      };
    },
    enabled: !!user,
    staleTime: CACHE_CONFIG.networkingData.staleTime,
    gcTime: CACHE_CONFIG.networkingData.cacheTime,
  });

  // Invalidate networking data cache
  const invalidateNetworkingData = () => {
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.networkingStats(user?.id || ""),
    });
  };

  return {
    stats: query.data || {
      totalCycles: 0,
      completedCycles: 0,
      totalConversations: 0,
      userConversations: 0,
      lastCycleDate: null,
    },
    loading: query.isLoading,
    error: query.error?.message || null,
    refetch: query.refetch,
    invalidateNetworkingData,
  };
};
