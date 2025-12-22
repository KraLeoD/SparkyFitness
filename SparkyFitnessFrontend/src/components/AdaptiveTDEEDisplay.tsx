import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Info, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import { calculateAdaptiveTDEE, AdaptiveTDEEResult } from '@/services/tdeeService';
import { usePreferences } from '@/contexts/PreferencesContext';
import { debug, warn, error } from '@/utils/logging';
import { toast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AdaptiveTDEEDisplayProps {
  selectedDate: string;
  userId: string;
}

const AdaptiveTDEEDisplay = ({ selectedDate, userId }: AdaptiveTDEEDisplayProps) => {
  const { t } = useTranslation();
  const { loggingLevel, weightUnit, convertEnergy, energyUnit } = usePreferences();
  const [tdeeData, setTdeeData] = useState<AdaptiveTDEEResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const loadTDEE = async () => {
    setIsLoading(true);
    try {
      debug(loggingLevel, '[AdaptiveTDEE] Calculating TDEE for date:', selectedDate);
      const result = await calculateAdaptiveTDEE(selectedDate, 21, weightUnit as 'lbs' | 'kg');
      debug(loggingLevel, '[AdaptiveTDEE] TDEE result:', result);
      setTdeeData(result);

      if (!result.success) {
        if (result.error === 'INSUFFICIENT_DATA') {
          debug(loggingLevel, '[AdaptiveTDEE] Insufficient data:', result.message);
        } else if (result.error === 'NO_CALORIE_DATA') {
          debug(loggingLevel, '[AdaptiveTDEE] No calorie data found');
        }
      }
    } catch (err) {
      error(loggingLevel, '[AdaptiveTDEE] Error calculating TDEE:', err);
      toast({
        title: t('error.generic', 'Error'),
        description: t('tdee.error.calculation', 'Failed to calculate adaptive TDEE'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTDEE();
  }, [selectedDate, userId, weightUnit]);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            {t('tdee.calculating', 'Calculating Adaptive TDEE...')}
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!tdeeData || !tdeeData.success) {
    const errorMessage = tdeeData?.message || t('tdee.noData', 'Not enough data to calculate TDEE');
    const minRequired = tdeeData?.minRequired || 7;
    const dataPoints = tdeeData?.dataPoints || 0;

    return (
      <Card className="w-full border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            {t('tdee.title', 'Adaptive TDEE')}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>{errorMessage}</p>
          {tdeeData?.error === 'INSUFFICIENT_DATA' && (
            <p className="mt-2 text-xs">
              {t('tdee.needMoreData', {
                current: dataPoints,
                required: minRequired,
                defaultValue: `Need ${minRequired} days of weight data (currently have ${dataPoints} days)`,
              })}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  const { tdee, avgDailyCalories, weightChange, dataQuality, startWeight, endWeight } = tdeeData;

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 80) return { text: t('tdee.highConfidence', 'High'), variant: 'default' as const };
    if (confidence >= 60) return { text: t('tdee.mediumConfidence', 'Medium'), variant: 'secondary' as const };
    return { text: t('tdee.lowConfidence', 'Low'), variant: 'outline' as const };
  };

  const getWeightTrendIcon = () => {
    if (!weightChange) return <Minus className="h-4 w-4" />;
    if (Math.abs(weightChange.total) < 0.5) return <Minus className="h-4 w-4 text-yellow-500" />;
    if (weightChange.total > 0) return <TrendingUp className="h-4 w-4 text-red-500" />;
    return <TrendingDown className="h-4 w-4 text-green-500" />;
  };

  const confidenceBadge = dataQuality ? getConfidenceBadge(dataQuality.confidence) : null;

  // Convert TDEE to user's preferred energy unit
  const displayTdee = convertEnergy ? convertEnergy(tdee || 0, 'kcal', energyUnit) : tdee;
  const displayAvgCalories = convertEnergy ? convertEnergy(avgDailyCalories || 0, 'kcal', energyUnit) : avgDailyCalories;
  const energyUnitLabel = energyUnit === 'kJ' ? 'kJ' : 'kcal';

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {getWeightTrendIcon()}
            {t('tdee.title', 'Adaptive TDEE')}
          </CardTitle>
          <div className="flex items-center gap-2">
            {confidenceBadge && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant={confidenceBadge.variant} className="text-xs">
                      {confidenceBadge.text} {dataQuality?.confidence}%
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs space-y-1">
                      <p>{t('tdee.confidenceTooltip', 'Confidence based on:')}</p>
                      <p>• {t('tdee.weightDataPoints', 'Weight entries')}: {dataQuality?.weightDataPoints}</p>
                      <p>• {t('tdee.calorieLogging', 'Calorie logging')}: {dataQuality?.calorieLoggingRate}%</p>
                      <p>• {t('tdee.trendQuality', 'Trend quality (R²)')}: {dataQuality?.r2}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-6 px-2 text-xs"
            >
              {isExpanded ? t('common.less', 'Less') : t('common.more', 'More')}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{Math.round(displayTdee || 0)}</span>
          <span className="text-sm text-muted-foreground">{energyUnitLabel}/day</span>
        </div>

        {isExpanded && (
          <div className="space-y-2 text-sm pt-2 border-t">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('tdee.avgIntake', 'Average intake')}:</span>
              <span className="font-medium">{Math.round(displayAvgCalories || 0)} {energyUnitLabel}/day</span>
            </div>
            
            {weightChange && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('tdee.weightChange', 'Weight change')}:</span>
                  <span className="font-medium">
                    {weightChange.total > 0 ? '+' : ''}{weightChange.total.toFixed(1)} {weightChange.unit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('tdee.weightRange', 'Weight range')}:</span>
                  <span className="font-medium">
                    {startWeight?.toFixed(1)} → {endWeight?.toFixed(1)} {weightChange.unit}
                  </span>
                </div>
              </>
            )}

            {dataQuality && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('tdee.timeframe', 'Timeframe')}:</span>
                  <span className="font-medium">{dataQuality.totalDays} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('tdee.dataQuality', 'Data quality')}:</span>
                  <span className="font-medium">
                    {dataQuality.weightDataPoints} weights, {dataQuality.daysWithCalories} calorie logs
                  </span>
                </div>
              </>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={loadTDEE}
              className="w-full mt-2"
            >
              <RefreshCw className="h-3 w-3 mr-2" />
              {t('tdee.refresh', 'Refresh TDEE')}
            </Button>

            <p className="text-xs text-muted-foreground pt-2 border-t">
              {t('tdee.explanation', 'Your adaptive TDEE is calculated from your actual weight changes and calorie intake over the past 3 weeks, providing a more accurate estimate than formula-based calculators.')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdaptiveTDEEDisplay;
