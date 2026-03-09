import { useQuery } from "@tanstack/react-query";
import { academicsService } from "../services/academicsService";

const KEYS = ["academics", "overview"] as const;

export function useAcademicsOverview(enabled = true) {
  return useQuery({
    queryKey: KEYS,
    queryFn: () => academicsService.getOverview(),
    staleTime: 60_000, // 1 minute - overview doesn't change frequently
    enabled,
  });
}
