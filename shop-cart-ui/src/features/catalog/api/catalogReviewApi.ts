import { apiClient } from '@/shared/lib/apiClient';
import type { ReviewInput, ReviewResult } from '../models/catalogReview';

export const catalogReviewApi = {
  async review(body: ReviewInput): Promise<ReviewResult> {
    const response = await apiClient.post<ReviewResult>('/catalogo/revision', body);
    return response.data;
  },
};
