# Project Structure

## File Organization
The project uses a flat, numbered file structure for easy navigation:

- `1-splash.html` - Animated splash screen with brand identity
- `2-home.html` - Main archive listing with search and category filters
- `3-detail_view.html` - Individual proverb detail view with full translations
- `4-add_edit.html` - Form for adding/editing proverb entries (curator access)
- `5-login.html` - Curator authentication page
- `6-offline_banner.html` - Offline mode indicator component

## Page Flow
```
Splash → Home (Archive) ⇄ Detail View
                ↓
         Login → Add/Edit Form
```

## Common Patterns

### Layout Structure
- Sticky header with navigation
- Scrollable main content area
- Fixed bottom navigation or action bar
- Max-width containers (typically max-w-2xl or max-w-4xl)

### Component Patterns
- Modern borders: `border-bookplate` class with 1px solid border (#e0e2e7) and rounded corners (0.75rem)
- Card design: White cards (bg-card) with shadow-md on light background
- Card hover effects: shadow transitions (shadow-md to shadow-lg)
- RTL support for Arabic text: `dir="rtl"` attribute
- Material icons with semantic meaning
- Compact spacing: p-4 for cards, gap-2 to gap-4 for elements

### Styling Conventions
- Tailwind config embedded in `<script id="tailwind-config">` tag
- Custom CSS in `<style>` blocks for specialized effects
- Consistent color variables across all pages:
  - primary: #2d8659
  - background: #f5f5f5
  - card: #ffffff
  - ink: #1f2937
  - muted: #6b7280
  - border: #e0e2e7
- Mobile-first responsive design with md: breakpoints
- Clean, minimal aesthetic with generous white space
