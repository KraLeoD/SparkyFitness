const { getClient } = require('../db/poolManager');
const { log } = require('../config/logging');
const { getCheckInMeasurementsByDateRange } = require('../models/measurementRepository');
const { getFoodEntriesByDateRange } = require('../models/foodEntry');

/**
 * Adaptive TDEE Calculator
 * 
 * This service calculates a user's Total Daily Energy Expenditure (TDEE) based on
 * actual weight changes and caloric intake over time, similar to nSuns TDEE calculator
 * and MacroFactor's approach.
 * 
 * Algorithm:
 * 1. Collect weight data and calorie intake over a rolling window (default: 14-28 days)
 * 2. Calculate the rate of weight change (lbs/day or kg/day)
 * 3. Calculate average daily calorie intake
 * 4. Use the energy balance equation: TDEE = Average Intake + (Weight Change × Energy Per Unit Weight / Days)
 *    - For pounds: 3500 kcal per pound
 *    - For kg: 7700 kcal per kg
 * 5. Apply smoothing to reduce noise from water weight fluctuations
 * 
 * Assumptions:
 * - 1 lb of fat/muscle tissue = ~3500 kcal
 * - 1 kg of fat/muscle tissue = ~7700 kcal
 * - Weight fluctuations due to water retention are noise (handled by averaging)
 * - User logs consistently (missing data is handled gracefully)
 * - Rolling window of 14-28 days provides balance between responsiveness and stability
 */

const CALORIES_PER_POUND = 3500;
const CALORIES_PER_KG = 7700;
const DEFAULT_WINDOW_DAYS = 21; // 3 weeks - good balance
const MIN_DATA_POINTS = 7; // Minimum 7 days of data for calculation

/**
 * Calculate adaptive TDEE for a user
 * @param {string} userId - User ID
 * @param {string} endDate - End date (typically today, YYYY-MM-DD format)
 * @param {number} windowDays - Number of days to look back (default: 21)
 * @param {string} weightUnit - User's weight unit preference ('lbs' or 'kg')
 * @returns {Object} TDEE calculation results
 */
async function calculateAdaptiveTDEE(userId, endDate = null, windowDays = DEFAULT_WINDOW_DAYS, weightUnit = 'lbs') {
  log('info', `[tdeeService] Calculating adaptive TDEE for user ${userId}, endDate: ${endDate}, windowDays: ${windowDays}, weightUnit: ${weightUnit}`);
  
  const client = await getClient(userId);
  try {
    // Default to today if no end date provided
    const end = endDate || new Date().toISOString().split('T')[0];
    const endDateObj = new Date(end);
    const startDateObj = new Date(endDateObj);
    startDateObj.setDate(startDateObj.getDate() - windowDays);
    const start = startDateObj.toISOString().split('T')[0];

    log('debug', `[tdeeService] Fetching data from ${start} to ${end}`);

    // Fetch weight measurements
    const weightData = await getCheckInMeasurementsByDateRange(userId, start, end);
    
    // Fetch food entries for calorie calculation
    const foodEntries = await getFoodEntriesByDateRange(userId, start, end);

    // Also fetch food entry meals to include their calories
    const foodEntryMealsQuery = await client.query(
      `SELECT fem.*, fem.entry_date::TEXT
       FROM food_entry_meals fem
       WHERE fem.user_id = $1 AND fem.entry_date BETWEEN $2 AND $3
       ORDER BY fem.entry_date`,
      [userId, start, end]
    );
    const foodEntryMeals = foodEntryMealsQuery.rows;

    log('debug', `[tdeeService] Found ${weightData.length} weight measurements, ${foodEntries.length} food entries, ${foodEntryMeals.length} food entry meals`);

    // Filter and prepare weight data
    const validWeights = weightData
      .filter(m => m.weight !== null && m.weight !== undefined)
      .map(m => ({
        date: m.entry_date,
        weight: parseFloat(m.weight)
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (validWeights.length < MIN_DATA_POINTS) {
      log('warn', `[tdeeService] Insufficient weight data: ${validWeights.length} points (minimum ${MIN_DATA_POINTS} required)`);
      return {
        success: false,
        error: 'INSUFFICIENT_DATA',
        message: `Need at least ${MIN_DATA_POINTS} days of weight data. Currently have ${validWeights.length} days.`,
        dataPoints: validWeights.length,
        minRequired: MIN_DATA_POINTS
      };
    }

    // Calculate daily calorie totals (including food entries and food entry meals)
    const dailyCalories = {};
    
    // Process regular food entries
    foodEntries.forEach(entry => {
      const date = entry.entry_date;
      if (!dailyCalories[date]) {
        dailyCalories[date] = 0;
      }
      const calories = parseFloat(entry.calories) || 0;
      const quantity = parseFloat(entry.quantity) || 1;
      dailyCalories[date] += (calories * quantity);
    });

    // Process food entry meals (logged meals)
    foodEntryMeals.forEach(meal => {
      const date = meal.entry_date;
      if (!dailyCalories[date]) {
        dailyCalories[date] = 0;
      }
      // Food entry meals store total calories already calculated
      const calories = parseFloat(meal.total_calories) || 0;
      const quantity = parseFloat(meal.quantity) || 1;
      dailyCalories[date] += (calories * quantity);
    });

    // Calculate average daily calorie intake
    const calorieValues = Object.values(dailyCalories);
    const daysWithCalories = calorieValues.length;
    
    if (daysWithCalories === 0) {
      log('warn', `[tdeeService] No calorie data found in date range`);
      return {
        success: false,
        error: 'NO_CALORIE_DATA',
        message: 'No calorie tracking data found in the specified time period.',
        dataPoints: validWeights.length
      };
    }

    const avgDailyCalories = calorieValues.reduce((sum, val) => sum + val, 0) / daysWithCalories;

    // Calculate weight change using linear regression for better smoothing
    const weightChange = calculateWeightTrend(validWeights);
    
    // Calculate time span in days
    const firstDate = new Date(validWeights[0].date);
    const lastDate = new Date(validWeights[validWeights.length - 1].date);
    const daysBetween = Math.max(1, (lastDate - firstDate) / (1000 * 60 * 60 * 24));

    // Calculate weight change rate (units per day)
    const weightChangeRate = weightChange.trend / daysBetween;

    // Convert to calories based on unit
    const caloriesPerUnit = weightUnit === 'kg' ? CALORIES_PER_KG : CALORIES_PER_POUND;
    const dailyEnergyDelta = weightChangeRate * caloriesPerUnit;

    // Calculate TDEE: Average intake + energy deficit/surplus
    // If losing weight (negative change), TDEE = intake + deficit
    // If gaining weight (positive change), TDEE = intake - surplus
    const tdee = Math.round(avgDailyCalories - dailyEnergyDelta);

    // Calculate confidence based on data quality
    const confidence = calculateConfidence(validWeights.length, daysWithCalories, daysBetween, weightChange.r2);

    log('info', `[tdeeService] TDEE calculation complete: ${tdee} kcal/day (confidence: ${confidence})`);

    return {
      success: true,
      tdee: tdee,
      avgDailyCalories: Math.round(avgDailyCalories),
      weightChange: {
        total: parseFloat(weightChange.trend.toFixed(2)),
        rate: parseFloat(weightChangeRate.toFixed(3)),
        unit: weightUnit
      },
      startWeight: validWeights[0].weight,
      endWeight: validWeights[validWeights.length - 1].weight,
      dataQuality: {
        weightDataPoints: validWeights.length,
        daysWithCalories: daysWithCalories,
        totalDays: daysBetween,
        calorieLoggingRate: parseFloat((daysWithCalories / daysBetween * 100).toFixed(1)),
        confidence: confidence,
        r2: parseFloat(weightChange.r2.toFixed(3))
      },
      dateRange: {
        start: start,
        end: end,
        days: windowDays
      }
    };

  } finally {
    client.release();
  }
}

/**
 * Calculate weight trend using linear regression
 * This smooths out daily fluctuations to get the true trend
 */
function calculateWeightTrend(weightData) {
  const n = weightData.length;
  
  // Convert dates to day numbers (0, 1, 2, ...)
  const startDate = new Date(weightData[0].date);
  const dataPoints = weightData.map((point, index) => {
    const date = new Date(point.date);
    const dayNumber = (date - startDate) / (1000 * 60 * 60 * 24);
    return { x: dayNumber, y: point.weight };
  });

  // Calculate linear regression: y = mx + b
  const sumX = dataPoints.reduce((sum, p) => sum + p.x, 0);
  const sumY = dataPoints.reduce((sum, p) => sum + p.y, 0);
  const sumXY = dataPoints.reduce((sum, p) => sum + (p.x * p.y), 0);
  const sumX2 = dataPoints.reduce((sum, p) => sum + (p.x * p.x), 0);
  const sumY2 = dataPoints.reduce((sum, p) => sum + (p.y * p.y), 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R² (coefficient of determination) for goodness of fit
  const yMean = sumY / n;
  const ssRes = dataPoints.reduce((sum, p) => {
    const predicted = slope * p.x + intercept;
    return sum + Math.pow(p.y - predicted, 2);
  }, 0);
  const ssTot = dataPoints.reduce((sum, p) => sum + Math.pow(p.y - yMean, 2), 0);
  const r2 = ssTot === 0 ? 1 : 1 - (ssRes / ssTot);

  // Calculate total weight change based on trend line
  const firstX = dataPoints[0].x;
  const lastX = dataPoints[dataPoints.length - 1].x;
  const trendChange = slope * (lastX - firstX);

  return {
    slope: slope,  // Weight change per day
    intercept: intercept,
    trend: trendChange,  // Total weight change over period
    r2: Math.max(0, Math.min(1, r2))  // Clamp between 0 and 1
  };
}

/**
 * Calculate confidence score (0-100)
 * Based on:
 * - Number of weight data points
 * - Calorie logging consistency
 * - Time period coverage
 * - R² value from weight trend
 */
function calculateConfidence(weightPoints, calorieLogDays, totalDays, r2) {
  // Weight data completeness (0-30 points)
  const weightScore = Math.min(30, (weightPoints / totalDays) * 30);
  
  // Calorie logging completeness (0-30 points)
  const calorieScore = Math.min(30, (calorieLogDays / totalDays) * 30);
  
  // Time period coverage (0-20 points)
  const timeScore = Math.min(20, (totalDays / DEFAULT_WINDOW_DAYS) * 20);
  
  // R² goodness of fit (0-20 points)
  const r2Score = r2 * 20;

  const total = weightScore + calorieScore + timeScore + r2Score;
  return Math.round(Math.max(0, Math.min(100, total)));
}

/**
 * Get TDEE recommendations based on user goals
 * @param {number} tdee - Calculated TDEE
 * @param {string} goal - User goal: 'cut', 'maintain', or 'bulk'
 * @param {string} rate - Goal rate: 'slow', 'moderate', or 'aggressive'
 * @returns {Object} Recommended calorie targets
 */
function getTDEERecommendations(tdee, goal = 'maintain', rate = 'moderate') {
  const deficits = {
    slow: { cut: 250, bulk: 200 },
    moderate: { cut: 500, bulk: 300 },
    aggressive: { cut: 750, bulk: 500 }
  };

  let recommendation = {
    tdee: tdee,
    goal: goal,
    rate: rate,
    targetCalories: tdee,
    deficit: 0,
    estimatedWeeklyChange: 0,
    description: ''
  };

  if (goal === 'cut') {
    const deficit = deficits[rate].cut;
    recommendation.targetCalories = tdee - deficit;
    recommendation.deficit = -deficit;
    recommendation.estimatedWeeklyChange = -(deficit * 7) / CALORIES_PER_POUND;
    recommendation.description = `Cutting: ${deficit} kcal/day deficit`;
  } else if (goal === 'bulk') {
    const surplus = deficits[rate].bulk;
    recommendation.targetCalories = tdee + surplus;
    recommendation.deficit = surplus;
    recommendation.estimatedWeeklyChange = (surplus * 7) / CALORIES_PER_POUND;
    recommendation.description = `Bulking: ${surplus} kcal/day surplus`;
  } else {
    recommendation.description = 'Maintenance: eating at TDEE';
  }

  return recommendation;
}

module.exports = {
  calculateAdaptiveTDEE,
  getTDEERecommendations,
  CALORIES_PER_POUND,
  CALORIES_PER_KG,
  DEFAULT_WINDOW_DAYS,
  MIN_DATA_POINTS
};
