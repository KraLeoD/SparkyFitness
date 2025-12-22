# Adaptive TDEE Calculator - Implementation Documentation

## Overview

This implementation adds an adaptive TDEE (Total Daily Energy Expenditure) calculator to SparkyFitness, similar to nSuns TDEE calculator and MacroFactor. It calculates TDEE based on actual weight changes and calorie intake over time, providing more accurate estimates than formula-based calculators.

## Features

### 1. Backend Service (`SparkyFitnessServer/services/tdeeService.js`)

**Algorithm:**
- Uses linear regression to smooth weight trends and reduce noise from water weight fluctuations
- Calculates TDEE using the energy balance equation: `TDEE = Average Intake + (Weight Change × Energy Per Unit Weight / Days)`
- Energy conversion factors:
  - 1 lb = 3,500 kcal
  - 1 kg = 7,700 kcal

**Key Functions:**
- `calculateAdaptiveTDEE(userId, endDate, windowDays, weightUnit)` - Main calculation function
- `calculateWeightTrend(weightData)` - Linear regression for weight trend
- `calculateConfidence(...)` - Data quality confidence score (0-100)
- `getTDEERecommendations(tdee, goal, rate)` - Calorie targets for cutting/bulking/maintenance

**Parameters:**
- `windowDays`: Default 21 days (3 weeks), range 7-90 days
- `weightUnit`: 'lbs' or 'kg'
- `endDate`: Default today, format YYYY-MM-DD

**Assumptions:**
1. **Energy equivalents**: 1 lb fat/muscle tissue ≈ 3,500 kcal
2. **Water weight is noise**: Handled by linear regression smoothing
3. **Consistent logging**: Missing data is handled gracefully
4. **Rolling window**: 14-28 days balances responsiveness and stability
5. **Minimum data**: Requires at least 7 days of weight data

**Data Requirements:**
- Minimum 7 weight measurements
- Calorie intake data for the period
- Works with both individual food entries and logged meals (food_entry_meals)

### 2. API Endpoints (`SparkyFitnessServer/routes/tdeeRoutes.js`)

#### `GET /api/tdee/adaptive`
Calculate adaptive TDEE for authenticated user.

**Query Parameters:**
- `endDate` (optional): End date (YYYY-MM-DD), default: today
- `windowDays` (optional): Lookback period (7-90), default: 21
- `weightUnit` (optional): 'lbs' or 'kg', default: 'lbs'

**Response:**
```json
{
  "success": true,
  "tdee": 2450,
  "avgDailyCalories": 2150,
  "weightChange": {
    "total": -2.3,
    "rate": -0.11,
    "unit": "lbs"
  },
  "startWeight": 185.2,
  "endWeight": 182.9,
  "dataQuality": {
    "weightDataPoints": 18,
    "daysWithCalories": 20,
    "totalDays": 21,
    "calorieLoggingRate": 95.2,
    "confidence": 87,
    "r2": 0.923
  },
  "dateRange": {
    "start": "2025-12-01",
    "end": "2025-12-22",
    "days": 21
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "INSUFFICIENT_DATA",
  "message": "Need at least 7 days of weight data. Currently have 4 days.",
  "dataPoints": 4,
  "minRequired": 7
}
```

#### `GET /api/tdee/recommendations`
Get calorie recommendations based on TDEE.

**Query Parameters:**
- `tdee` (required): Calculated TDEE value
- `goal` (optional): 'cut', 'maintain', or 'bulk', default: 'maintain'
- `rate` (optional): 'slow', 'moderate', or 'aggressive', default: 'moderate'

**Response:**
```json
{
  "tdee": 2450,
  "goal": "cut",
  "rate": "moderate",
  "targetCalories": 1950,
  "deficit": -500,
  "estimatedWeeklyChange": -1.0,
  "description": "Cutting: 500 kcal/day deficit"
}
```

### 3. Frontend Service (`SparkyFitnessFrontend/src/services/tdeeService.ts`)

TypeScript service for API calls with proper type definitions.

### 4. UI Component (`SparkyFitnessFrontend/src/components/AdaptiveTDEEDisplay.tsx`)

**Features:**
- Compact card display in Daily Energy Goal section
- Confidence badge (High/Medium/Low) with tooltip
- Weight trend icon (up/down/stable)
- Expandable details panel
- Auto-refresh on date change
- Energy unit conversion (kcal/kJ)
- Handles insufficient data gracefully

**Display Elements:**
- Main TDEE value (large)
- Confidence badge with percentage
- Expandable section showing:
  - Average daily calorie intake
  - Total weight change
  - Weight range (start → end)
  - Time period
  - Data quality metrics
  - Refresh button
  - Educational tooltip

## Integration

The TDEE display is integrated into the `DailyProgress` component, appearing below the daily calorie tracking.

### Modified Files:
1. `SparkyFitnessServer/SparkyFitnessServer.js` - Added TDEE route registration
2. `SparkyFitnessFrontend/src/components/DailyProgress.tsx` - Added TDEE display

## Calculation Examples

### Example 1: Weight Loss
- Period: 21 days
- Start weight: 200 lbs → End weight: 198 lbs (lost 2 lbs)
- Average intake: 2000 kcal/day
- Calculation:
  - Weight change rate: -2 lbs / 21 days = -0.095 lbs/day
  - Energy deficit: -0.095 × 3500 = -333 kcal/day
  - TDEE: 2000 + 333 = 2333 kcal/day

### Example 2: Weight Gain
- Period: 21 days
- Start weight: 150 lbs → End weight: 151.5 lbs (gained 1.5 lbs)
- Average intake: 2800 kcal/day
- Calculation:
  - Weight change rate: +1.5 lbs / 21 days = +0.071 lbs/day
  - Energy surplus: +0.071 × 3500 = +250 kcal/day
  - TDEE: 2800 - 250 = 2550 kcal/day

### Example 3: Maintenance
- Period: 21 days
- Start weight: 175 lbs → End weight: 175.3 lbs (gained 0.3 lbs)
- Average intake: 2400 kcal/day
- Calculation:
  - Weight change rate: +0.3 lbs / 21 days = +0.014 lbs/day
  - Energy surplus: +0.014 × 3500 = +50 kcal/day
  - TDEE: 2400 - 50 = 2350 kcal/day

## Confidence Scoring

The confidence score (0-100) is calculated based on:

1. **Weight Data Completeness** (30 points max):
   - `(weightDataPoints / totalDays) × 30`
   - More frequent weigh-ins = higher score

2. **Calorie Logging Completeness** (30 points max):
   - `(daysWithCalories / totalDays) × 30`
   - Consistent tracking = higher score

3. **Time Period Coverage** (20 points max):
   - `(totalDays / 21) × 20`
   - Longer period = more reliable

4. **R² Goodness of Fit** (20 points max):
   - `r2 × 20`
   - Better linear fit = less noise

**Confidence Levels:**
- **High (80-100)**: Very reliable, consistent data
- **Medium (60-79)**: Fairly reliable, some gaps
- **Low (<60)**: Use with caution, inconsistent data

## Edge Cases Handled

1. **Insufficient Data**: Shows message with data requirements
2. **No Calorie Data**: Shows specific error message
3. **Missing Weight Entries**: Uses available data points
4. **Water Weight Fluctuations**: Smoothed by linear regression
5. **Inconsistent Logging**: Reflected in confidence score
6. **Zero Division**: Protected by Math.max(1, daysBetween)
7. **Invalid R²**: Clamped between 0 and 1

## Future Enhancements

Potential improvements for future versions:

1. **Moving Average TDEE**: Track TDEE changes over time
2. **Goal Integration**: Suggest TDEE-based calorie targets
3. **Historical Tracking**: Chart TDEE trends
4. **Smart Recommendations**: Auto-adjust goals based on TDEE changes
5. **Export Data**: CSV export of TDEE calculations
6. **Customizable Window**: User-configurable lookback period
7. **Weekly Breakdown**: Show TDEE by week
8. **Menstrual Cycle Adjustment**: For female users (account for water retention)
9. **Activity Level Changes**: Detect and highlight TDEE changes
10. **Integration with Meal Plans**: Suggest meal plans based on TDEE

## Testing Recommendations

1. **Unit Tests**:
   - Test linear regression calculation
   - Test confidence score calculation
   - Test edge cases (insufficient data, etc.)
   - Test energy conversion (lbs/kg)

2. **Integration Tests**:
   - Test API endpoints with real database
   - Test with various data quality scenarios
   - Test date range handling

3. **UI Tests**:
   - Test expandable panel
   - Test error states
   - Test loading states
   - Test refresh functionality

4. **Manual Testing**:
   - Test with 7 days of data (minimum)
   - Test with 21 days of data (optimal)
   - Test with missing weight entries
   - Test with missing calorie data
   - Test with perfect data (high confidence)
   - Test with spotty data (low confidence)

## Usage Instructions

1. **User Requirements**:
   - Log weight at least 7 times over a 3-week period
   - Log food intake consistently
   - More data = more accurate results

2. **Viewing TDEE**:
   - Navigate to Diary page
   - Scroll to Daily Energy Goal section
   - TDEE displays below calorie tracking
   - Click "More" to see detailed breakdown

3. **Interpreting Results**:
   - High confidence (80%+): Very reliable
   - Medium confidence (60-79%): Fairly reliable
   - Low confidence (<60%): Log more consistently
   - Check R² value: >0.9 is excellent, >0.7 is good

4. **Using TDEE**:
   - Use as baseline for calorie goals
   - Cut: TDEE - 250 to 750 kcal
   - Maintain: TDEE ± 100 kcal
   - Bulk: TDEE + 200 to 500 kcal

## Technical Notes

- All calorie values stored internally as kcal
- Frontend converts to user's preferred unit (kcal/kJ)
- Weight unit preference from user preferences
- Database queries use date ranges for efficiency
- Linear regression handles noisy weight data
- Food entry meals (logged meals) included in calculations
- RLS policies ensure users only see their own data

## Security

- Requires authentication (JWT token)
- RLS policies on database queries
- User can only calculate their own TDEE
- No sensitive data exposed
- Rate limiting on API endpoints (inherited from /auth limiter)
