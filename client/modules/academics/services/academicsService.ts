import { apiGet } from "@/common/services/api";

export interface AcademicsOverview {
  total_classes: number;
  total_subjects: number;
}

export const academicsService = {
  getOverview: async (): Promise<AcademicsOverview> => {
    const res = await apiGet<AcademicsOverview>("/api/academics/overview");
    return {
      total_classes: res?.total_classes ?? 0,
      total_subjects: res?.total_subjects ?? 0,
    };
  },
};
