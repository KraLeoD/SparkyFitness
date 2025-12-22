import { api } from './api';

export interface AdaptiveTDEEResult {
  success: boolean;
  tdee?: number;
  avgDailyCalories?: number;
  weightChange?: {
    total: number;
    rate: number;
    unit: string;
  };
  startWeight?: number;
  endWeight?: number;
  dataQuality?: {
    weightDataPoints: number;
    daysWithCalories: number;
    totalDays: number;
    calorieLoggingRate: number;
    confidence: number;
    r2: number;
  };
  dateRange?: {
    start: string;
    end: string;
    days: number;
  };
  error?: string;
  message?: string;
  dataPoints?: number;
  minRequired?: number;
}

export interface TDEERecommendation {
  tdee: number;
  goal: string;
  rate: string;
  targetCalories: number;
  deficit: number;
  estimatedWeeklyChange: number;
  description: string;
}

/**
 * Calculate adaptive TDEE for the current user
 * @param endDate - End date for calculation (format: YYYY-MM-DD)
 * @param windowDays - Number of days to look back (default: 21)
 * @param weightUnit - Weight unit preference ('lbs' or 'kg')
 * @returns Promise with TDEE calculation results
 */
export const calculateAdaptiveTDEE = async (
  endDate?: string,
  windowDays: number = 21,
  weightUnit: 'lbs' | 'kg' = 'lbs'
): Promise<AdaptiveTDEEResult> => {
  const params = new URLSearchParams();
  if (endDate) params.append('endDate', endDate);
  params.append('windowDays', windowDays.toString());
  params.append('weightUnit', weightUnit);

  const response = await api.get(`/api/tdee/adaptive?${params.toString()}`);
  return response.data;
};

/**
 * Get TDEE-based calorie recommendations
 * @param tdee - Calculated TDEE
 * @param goal - User goal ('cut', 'maintain', or 'bulk')
 * @param rate - Goal rate ('slow', 'moderate', or 'aggressive')
 * @returns Promise with recommended calorie targets
 */
export const getTDEERecommendations = async (
  tdee: number,
  goal: 'cut' | 'maintain' | 'bulk' = 'maintain',
  rate: 'slow' | 'moderate' | 'aggressive' = 'moderate'
): Promise<TDEERecommendation> => {
  const params = new URLSearchParams();
  params.append('tdee', tdee.toString());
  params.append('goal', goal);
  params.append('rate', rate);

  const response = await api.get(`/api/tdee/recommendations?${params.toString()}`);
  return response.data;
};
