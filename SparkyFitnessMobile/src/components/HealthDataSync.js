import React from 'react';
import { View, Text, Switch, Image, Alert } from 'react-native';
import styles from '../screens/SettingsScreenStyles';
import { HEALTH_METRICS } from '../constants/HealthMetrics';

const HealthDataSync = ({ healthMetricStates, handleToggleHealthMetric, isAllMetricsEnabled, handleToggleAllMetrics, colors = {}, isDarkMode = false }) => {
  const cardBg = colors.card || '#fff';
  const textColor = colors.text || '#333';

  return (
    <View style={[styles.card, { backgroundColor: cardBg }]}>
      <Text style={[styles.sectionTitle, { color: textColor }]}>Health Data to Sync</Text>
      <View style={styles.settingItem}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[styles.settingLabel, { fontWeight: 'bold', color: textColor }]}>Enable All Health Metrics</Text>
        </View>
        <Switch
          onValueChange={handleToggleAllMetrics}
          value={isAllMetricsEnabled}
        />
      </View>
      {HEALTH_METRICS.map((metric) => (
        <View key={metric.id} style={styles.settingItem}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Image source={metric.icon} style={[styles.icon, { tintColor: textColor }]} />
            <Text style={[styles.settingLabel, { marginLeft: 8, color: textColor }]}>{metric.label}</Text>
          </View>
          <Switch
            onValueChange={(newValue) => handleToggleHealthMetric(metric, newValue)}
            value={healthMetricStates[metric.stateKey]}
          />
        </View>
      ))}
    </View>
  );
};

export default HealthDataSync;