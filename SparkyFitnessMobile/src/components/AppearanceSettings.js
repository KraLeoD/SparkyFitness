import React from 'react';
import { View, Text, Image } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import styles from '../screens/SettingsScreenStyles';

const AppearanceSettings = ({ appTheme, handleThemeChange, colors = {}, isDarkMode = false }) => {
  // Default colors if not provided
  const cardBg = colors.card || '#fff';
  const textColor = colors.text || '#333';
  const pickerColor = colors.text || '#333';

  return (
    <View style={[styles.card, { backgroundColor: cardBg }]}>
      <Text style={[styles.sectionTitle, { color: textColor }]}>Appearance</Text>
      <View style={styles.settingItem}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Image source={require('../../assets/icons/settings.png')} style={styles.icon} />
          <Text style={[styles.settingLabel, { marginLeft: 8, color: textColor }]}>Theme</Text>
        </View>
        <Picker
          selectedValue={appTheme}
          style={[styles.picker, { color: pickerColor }]}
          dropdownIconColor={pickerColor}
          onValueChange={handleThemeChange}
          itemStyle={styles.pickerItem}
        >
          <Picker.Item label="Light" value="Light" color={isDarkMode ? '#e0e0e0' : '#333'} />
          <Picker.Item label="Dark" value="Dark" color={isDarkMode ? '#e0e0e0' : '#333'} />
          <Picker.Item label="AMOLED" value="Amoled" color={isDarkMode ? '#e0e0e0' : '#333'} />
          <Picker.Item label="System" value="System" color={isDarkMode ? '#e0e0e0' : '#333'} />
        </Picker>
      </View>
    </View>
  );
};

export default AppearanceSettings;