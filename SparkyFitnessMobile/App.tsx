import React, { useEffect } from 'react';
import { StatusBar, StyleSheet, useColorScheme } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import MainScreen from './src/screens/MainScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import LogScreen from './src/screens/LogScreen';
import { configureBackgroundSync } from './src/services/backgroundSyncService';

const Stack = createStackNavigator();

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    // Reset the auto-open flag on every app start
    const initializeApp = async () => {
      // Remove the flag so the dashboard will auto-open on first MainScreen visit
      await AsyncStorage.removeItem('@HealthConnect:hasAutoOpenedDashboard');
      await configureBackgroundSync();
    };
    
    initializeApp();
  }, []);

  return (
    <NavigationContainer>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={MainScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Logs" component={LogScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  // No specific styles needed here as screens will define their own
});

export default App;
