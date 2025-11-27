import React from 'react';
import { View, Text } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import styles from '../screens/SettingsScreenStyles';

const SyncFrequency = ({ syncDuration, handleSyncDurationChange, fourHourSyncTime, handleFourHourSyncTimeChange, dailySyncTime, handleDailySyncTimeChange, colors = {}, isDarkMode = false }) => {
  const cardBg = colors.card || '#fff';
  const textColor = colors.text || '#333';
  const textSecondary = colors.textSecondary || '#555';
  const pickerItemColor = isDarkMode ? '#e0e0e0' : '#333';

  return (
    <View style={[styles.card, { backgroundColor: cardBg }]}>
      <Text style={[styles.sectionTitle, { color: textColor }]}>Sync Frequency</Text>
      <View style={styles.inputGroup}>
        <Picker
          selectedValue={syncDuration}
          style={[styles.picker, { color: textColor }]}
          dropdownIconColor={textColor}
          onValueChange={handleSyncDurationChange}
          itemStyle={styles.pickerItem}
        >
          <Picker.Item label="Hourly" value="1h" color={pickerItemColor} />
          <Picker.Item label="Every 4 Hours" value="4h" color={pickerItemColor} />
          <Picker.Item label="Daily" value="24h" color={pickerItemColor} />
        </Picker>
        <Text style={[styles.label, { color: textSecondary }]}>How often should your health data be synced automatically?</Text>
      </View>
      {syncDuration === '4h' && (
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: textSecondary }]}>Prompt Time (Every 4 Hours)</Text>
          <Picker
            selectedValue={fourHourSyncTime}
            style={[styles.picker, { color: textColor }]}
            dropdownIconColor={textColor}
            onValueChange={handleFourHourSyncTimeChange}
            itemStyle={styles.pickerItem}
          >
            {['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'].map(time => (
              <Picker.Item key={time} label={time} value={time} color={pickerItemColor} />
            ))}
          </Picker>
        </View>
      )}
      {syncDuration === '24h' && (
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: textSecondary }]}>Prompt Time (Daily)</Text>
          <Picker
            selectedValue={dailySyncTime}
            style={[styles.picker, { color: textColor }]}
            dropdownIconColor={textColor}
            onValueChange={handleDailySyncTimeChange}
            itemStyle={styles.pickerItem}
          >
            {Array.from({ length: 24 }, (_, i) => {
              const hour = i.toString().padStart(2, '0');
              return <Picker.Item key={hour} label={`${hour}:00`} value={`${hour}:00`} color={pickerItemColor} />;
            })}
          </Picker>
        </View>
      )}
    </View>
  );
};

export default SyncFrequency;