# Technology Stack

## Core Technologies
- HTML5 with semantic markup
- Tailwind CSS (CDN) with plugins: forms, container-queries
- Vanilla JavaScript (minimal, inline configuration)
- No build system or bundler required

## Fonts & Icons
- Google Fonts:
  - Tajawal (Arabic text)
  - DM Sans (English and Spanish text)
- Material Symbols Outlined (icons)

## Design System
- Color palette: 
  - Primary: #2d8659 (Modern Green)
  - Background: #f5f5f5 (Light Gray)
  - Card: #ffffff (White)
  - Text: #1f2937 (Dark Gray)
  - Muted: #6b7280 (Medium Gray)
  - Border: #e0e2e7 (Light Border)
  - Secondary: #eff5f2 (Light Green Tint)
- Custom Tailwind config embedded in each HTML file
- Modern clean aesthetic with subtle borders and rounded corners
- Card-based layout with shadow-md
- Rounded corners: 0.75rem (rounded-lg)

## Development
No build commands required. Files can be opened directly in browser or served via any static file server.

For local development:
```bash
# Python
python -m http.server 8000

# Node.js
npx serve .
```
