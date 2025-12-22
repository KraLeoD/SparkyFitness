const express = require('express');
const router = express.Router();
const tdeeService = require('../services/tdeeService');
const { log } = require('../config/logging');

/**
 * GET /api/tdee/adaptive
 * Calculate adaptive TDEE for the authenticated user
 * 
 * Query parameters:
 * - endDate: End date for calculation (default: today, format: YYYY-MM-DD)
 * - windowDays: Number of days to look back (default: 21, range: 7-90)
 * - weightUnit: Weight unit preference (default: 'lbs', options: 'lbs' or 'kg')
 */
router.get('/adaptive', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { endDate, windowDays, weightUnit } = req.query;
    
    // Validate windowDays
    let validWindowDays = parseInt(windowDays) || tdeeService.DEFAULT_WINDOW_DAYS;
    validWindowDays = Math.max(7, Math.min(90, validWindowDays)); // Clamp between 7 and 90 days

    // Validate weightUnit
    const validWeightUnit = weightUnit === 'kg' ? 'kg' : 'lbs';

    log('info', `[tdeeRoutes] GET /api/tdee/adaptive - userId: ${userId}, endDate: ${endDate}, windowDays: ${validWindowDays}, weightUnit: ${validWeightUnit}`);

    const result = await tdeeService.calculateAdaptiveTDEE(
      userId,
      endDate || null,
      validWindowDays,
      validWeightUnit
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    log('error', `[tdeeRoutes] Error calculating adaptive TDEE:`, error);
    res.status(500).json({ 
      error: 'CALCULATION_ERROR', 
      message: 'Failed to calculate adaptive TDEE',
      details: error.message 
    });
  }
});

/**
 * GET /api/tdee/recommendations
 * Get TDEE-based calorie recommendations
 * 
 * Query parameters:
 * - tdee: Calculated TDEE (required)
 * - goal: User goal (default: 'maintain', options: 'cut', 'maintain', 'bulk')
 * - rate: Goal rate (default: 'moderate', options: 'slow', 'moderate', 'aggressive')
 */
router.get('/recommendations', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { tdee, goal, rate } = req.query;

    if (!tdee || isNaN(parseFloat(tdee))) {
      return res.status(400).json({ 
        error: 'INVALID_PARAMETER', 
        message: 'TDEE parameter is required and must be a number' 
      });
    }

    const validGoals = ['cut', 'maintain', 'bulk'];
    const validRates = ['slow', 'moderate', 'aggressive'];

    const validGoal = validGoals.includes(goal) ? goal : 'maintain';
    const validRate = validRates.includes(rate) ? rate : 'moderate';

    log('info', `[tdeeRoutes] GET /api/tdee/recommendations - userId: ${userId}, tdee: ${tdee}, goal: ${validGoal}, rate: ${validRate}`);

    const recommendations = tdeeService.getTDEERecommendations(
      parseFloat(tdee),
      validGoal,
      validRate
    );

    res.status(200).json(recommendations);
  } catch (error) {
    log('error', `[tdeeRoutes] Error getting TDEE recommendations:`, error);
    res.status(500).json({ 
      error: 'CALCULATION_ERROR', 
      message: 'Failed to get TDEE recommendations',
      details: error.message 
    });
  }
});

module.exports = router;
