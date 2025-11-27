import React from 'react';
import { View, TextInput, Button, Text, TouchableOpacity, Image, Alert } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import styles from '../screens/SettingsScreenStyles'; // Assuming styles are shared

const ServerConfig = ({ url, setUrl, apiKey, setApiKey, handleSaveConfig, serverConfigs, activeConfigId, handleSetActiveConfig, handleDeleteConfig, handleEditConfig, handleAddNewConfig, isConnected, checkServerConnection, colors = {}, isDarkMode = false }) => {
  const cardBg = colors.card || '#fff';
  const textColor = colors.text || '#333';
  const textSecondary = colors.textSecondary || '#555';
  const borderColor = colors.border || '#ddd';
  const inputBg = colors.inputBackground || '#fff';

  return (
    <>
      {/* Server Configuration */}
      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>Server Configuration</Text>
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: textSecondary }]}>Server URL</Text>
          <View style={[styles.inputWithIcon, { borderColor: borderColor, backgroundColor: inputBg }]}>
            <TextInput
              style={[styles.input, { flex: 1, borderWidth: 0, color: textColor }]}
              placeholder="https://your-server-url.com"
              placeholderTextColor={colors.textMuted || '#999'}
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
            <TouchableOpacity style={styles.iconButton} onPress={async () => setUrl(await Clipboard.getStringAsync())}>
              <Image source={require('../../assets/icons/paste.png')} style={styles.icon} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: textSecondary }]}>API Key</Text>
          <View style={[styles.inputWithIcon, { borderColor: borderColor, backgroundColor: inputBg }]}>
            <TextInput
              style={[styles.input, { flex: 1, borderWidth: 0, color: textColor }]}
              placeholder="Enter your API key"
              placeholderTextColor={colors.textMuted || '#999'}
              value={apiKey}
              onChangeText={setApiKey}
              secureTextEntry
            />
            <TouchableOpacity style={styles.iconButton} onPress={async () => setApiKey(await Clipboard.getStringAsync())}>
              <Image source={require('../../assets/icons/paste.png')} style={styles.icon} />
            </TouchableOpacity>
          </View>
        </View>
        <Button title="Save Current Config" onPress={handleSaveConfig} />
      </View>

      {/* Display existing configurations */}
      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>Manage Configurations</Text>
        {serverConfigs.map((item) => (
          <View key={item.id} style={styles.serverConfigItem}>
            <Text style={[styles.serverConfigText, { color: textColor }]}>
              {item.url} {item.id === activeConfigId ? '(Active)' : ''}
            </Text>
            <View style={styles.serverConfigActions}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#007bff' }]}
                onPress={() => handleSetActiveConfig(item.id)}
              >
                <Text style={styles.actionButtonText}>Set Active</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#ffc107' }]}
                onPress={() => handleEditConfig(item)}
              >
                <Text style={styles.actionButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#dc3545' }]}
                onPress={() => handleDeleteConfig(item.id)}
              >
                <Text style={styles.actionButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        <TouchableOpacity style={styles.addConfigButton} onPress={handleAddNewConfig}>
          <Text style={styles.addConfigButtonText}>Add New Configuration</Text>
        </TouchableOpacity>
      </View>

      {/* Configuration required status */}
      {!activeConfigId && (
        <View style={styles.configRequiredContainer}>
          <View style={[styles.dot, { backgroundColor: '#ffc107' }]}></View>
          <Text style={styles.configRequiredText}>Configuration required</Text>
        </View>
      )}

      {/* Connected to server status */}
      {activeConfigId && (
        <TouchableOpacity style={styles.connectedStatusContainer} onPress={checkServerConnection}>
          <View style={[styles.dot, { backgroundColor: isConnected ? '#28a745' : '#dc3545' }]}></View>
          <Text style={[styles.connectedStatusText, { color: isConnected ? '#28a745' : '#dc3545' }]}>
            {isConnected ? 'Connected to server' : 'Connection failed'}
          </Text>
        </TouchableOpacity>
      )}
    </>
  );
};

export default ServerConfig;