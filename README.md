# Refranario - Trilingual Proverb Archive

A modern, clean web application for browsing and managing proverbs across Spanish, Arabic, and English.

## Features

- 🌍 **Trilingual Support**: Spanish origin, Arabic equivalent, English translation
- 🔍 **Smart Search**: Search by phrase, word, or meaning
- 🏷️ **Category Filtering**: Wisdom, Nature, Family, Time, Honor, Prudence
- 📱 **Responsive Design**: Works on mobile, tablet, and desktop
- 💾 **Offline Support**: Cached content for offline access
- 📲 **PWA Support**: Install as a native app on mobile and desktop
- ✏️ **Curator Access**: Add, edit, and manage proverb entries
- 🎨 **Modern Clean Design**: Professional card-based interface

## PWA Installation

Refranario is a Progressive Web App (PWA) that can be installed on your device for a native app experience.

### Mobile (iOS/Android)
1. Open the app in Safari (iOS) or Chrome (Android)
2. Tap the "Install App" button that appears, or:
   - **iOS**: Tap the Share button → "Add to Home Screen"
   - **Android**: Tap the menu (⋮) → "Install app" or "Add to Home Screen"
3. The app will be added to your home screen

### Desktop (Chrome/Edge)
1. Open the app in Chrome or Edge
2. Click the install icon (⊕) in the address bar, or:
   - Click the menu (⋮) → "Install Refranario"
3. The app will open in its own window

### PWA Features
- ✅ Works offline with cached content
- ✅ Fast loading with service worker
- ✅ Install prompt for easy access
- ✅ Automatic updates when online
- ✅ Native app-like experience

## Design System

### Colors
- **Primary**: #2d8659 (Modern Green)
- **Background**: #f5f5f5 (Light Gray)
- **Card**: #ffffff (White)
- **Text**: #1f2937 (Dark Gray)
- **Muted**: #6b7280 (Medium Gray)
- **Border**: #e0e2e7 (Light Border)

### Typography
- **Display**: Cinzel Decorative (headers)
- **Body**: Crimson Pro (serif text)
- **Arabic**: Amiri (Arabic script)
- **UI**: Libre Franklin (interface elements)
- **English**: Newsreader (translations)

## File Structure

```
├── 1-splash.html          # Animated splash screen
├── 2-home.html            # Main archive listing
├── 3-detail_view.html     # Individual proverb view
├── 4-add_edit.html        # Add/edit form
├── 5-login.html           # Curator login
├── 6-offline_banner.html  # Offline indicator
├── app.js                 # Core JavaScript logic
├── pwa.js                 # PWA registration & handlers
├── sw.js                  # Service Worker
├── manifest.json          # PWA manifest
├── icons/                 # App icons
│   ├── icon.svg
│   ├── generate-placeholders.html
│   └── README.md
└── .kiro/
    └── steering/          # Project documentation
        ├── product.md
        ├── tech.md
        └── structure.md
```

## Getting Started

No build process required! Simply open the files in a browser or serve via a static server:

### Python
```bash
python -m http.server 8000
```

### Node.js
```bash
npx serve .
```

Then open http://localhost:8000 in your browser.

## Technology Stack

- **HTML5**: Semantic markup
- **Tailwind CSS**: Utility-first CSS (CDN)
- **Vanilla JavaScript**: No frameworks
- **Google Fonts**: Typography
- **Material Symbols**: Icons

## Recent Updates

### PWA Support (Latest)
- ✅ Progressive Web App implementation
- ✅ Service Worker for offline caching
- ✅ Install prompt and app shortcuts
- ✅ Automatic update notifications
- ✅ Online/offline status detection
- ✅ Native app-like experience

### Design Refresh
- ✅ Modern, clean card-based interface
- ✅ Improved color palette and contrast
- ✅ Better spacing and typography
- ✅ Enhanced mobile responsiveness
- ✅ Simplified navigation
- ✅ Professional aesthetic

See [DESIGN_UPDATE.md](DESIGN_UPDATE.md) for detailed changes.

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

This is a prototype application for demonstration purposes.
