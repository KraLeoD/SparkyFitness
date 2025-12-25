# Custom Tabs Integration - Setup Guide

## ✅ Was wurde implementiert

Die Android-App kann jetzt die SparkyFitness Web-Oberfläche über Android Custom Tabs öffnen.

### Neue Features:
- 🌐 **"Open Web Dashboard" Button** im Hauptbildschirm
- 🎨 Custom Toolbar mit App-Branding (blau)
- ↩️ Nahtlose Navigation mit Back-Button
- 🔐 Automatische Authentifizierung über Browser-Cookies
- 📱 Native Android-Animationen

## 📦 Installation

### 1. Dependencies installieren

```bash
cd SparkyFitnessMobile
npm install
```

### 2. Android neu bauen

Da native Dependencies hinzugefügt wurden, muss die App neu gebaut werden:

```bash
# Clean build
cd android
./gradlew clean
cd ..

# Neu bauen und installieren
npm run android
```

## 🚀 Verwendung

1. **Server konfigurieren** (falls noch nicht geschehen):
   - App öffnen → Settings
   - Server URL eingeben (z.B. `https://fitness.example.com`)
   - API Key eingeben

2. **Web Dashboard öffnen**:
   - Zurück zum Hauptbildschirm
   - Auf den grünen **"Open Web Dashboard"** Button tippen
   - Custom Tab öffnet sich mit der Website
   - Im Browser einloggen (Login wird gespeichert)
   - Fertig! 🎉

## 🔧 Technische Details

### Hinzugefügte Dependencies:
- `react-native-custom-tabs`: ^0.1.8
- `androidx.browser:browser`: 1.5.0 (Android)

### Geänderte Dateien:
1. `package.json` - Neue Dependency
2. `android/app/build.gradle` - AndroidX Browser Library
3. `src/screens/MainScreen.js` - Button + Handler

### Fallback-Mechanismus:
Wenn Custom Tabs nicht verfügbar ist (sehr selten), öffnet sich automatisch der Standard-Browser.

## 🎨 Customization

Die Custom Tab Farben und Optionen können in `MainScreen.js` angepasst werden:

```javascript
await CustomTabs.openURL(serverUrl, {
  toolbarColor: '#007bff',        // Toolbar-Farbe
  showPageTitle: true,            // Seitentitel anzeigen
  enableDefaultShare: true,       // Share-Button
  enableUrlBarHiding: true,       // URL-Bar beim Scrollen verstecken
  animations: {
    startEnter: 'slide_in_right', // Öffnen-Animation
    startExit: 'slide_out_left',
    endEnter: 'slide_in_left',    // Schließen-Animation
    endExit: 'slide_out_right'
  }
});
```

## ❓ Troubleshooting

**Problem**: "No Server Configured" Meldung
- **Lösung**: Settings öffnen und Server-URL eintragen

**Problem**: Custom Tab öffnet sich nicht
- **Lösung**: App neu bauen mit `npm run android`
- Die App nutzt automatisch Fallback zum Standard-Browser

**Problem**: Login-Session wird nicht gespeichert
- **Lösung**: Das ist normal beim ersten Mal. Nach dem Login im Custom Tab wird die Session automatisch gespeichert und bei jedem weiteren Öffnen wiederverwendet.

## 🔮 Zukünftige Erweiterungen (optional)

- Deep Links für direkte Navigation zu bestimmten Seiten (Food Log, Exercise, Reports)
- Bottom Sheet mit Quick Actions
- URL Pre-loading für schnellere Ladezeiten
- Custom Toolbar-Buttons für häufige Aktionen
