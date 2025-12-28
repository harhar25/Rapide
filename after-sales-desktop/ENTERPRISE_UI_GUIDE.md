# Enterprise UI Design System - Minimalist Approach

## Overview
Professional, clean, and modern UI design system for the After-Sales Management System.

## Design Principles

### 1. **Minimalism**
- Clean layouts with ample white space
- Remove unnecessary visual elements
- Focus on content and functionality

### 2. **Enterprise-Grade Polish**
- Subtle shadows and depth
- Smooth transitions and animations
- Professional color palette
- Consistent spacing and typography

### 3. **Accessibility**
- WCAG 2.1 AA compliant
- Keyboard navigation support
- Screen reader friendly
- High contrast ratios

### 4. **Responsiveness**
- Mobile-first approach
- Fluid layouts
- Touch-friendly controls

## Component Library

### Core Components
- **StatCard** - Metric display with hover effects
- **EnterpriseCard** - Content container with gradient accent
- **StatusBadge** - Status indicators with pulse animations
- **EnterpriseTabs** - Clean tab navigation
- **EnterpriseTable** - Data tables with hover states
- **FormGroup** - Form controls with validation
- **ActionBar** - Toolbar with actions
- **SearchBar** - Search input with icon
- **Modal** - Dialog overlays
- **Alert** - Notification messages
- **EmptyState** - No data placeholders
- **LoadingSpinner** - Loading indicators
- **ProgressBar** - Progress visualization

## Color System

### Primary Palette
- **Primary**: Blue (#3b82f6) - Main actions, links
- **Secondary**: Purple (#8b5cf6) - Accents, highlights

### Status Colors
- **Success**: Green (#22c55e) - Completed, paid, active
- **Warning**: Amber (#f59e0b) - Pending, attention needed
- **Error**: Red (#ef4444) - Failed, cancelled, errors
- **Info**: Cyan (#0ea5e9) - In-progress, information

### Neutral Colors
- **Gray Scale**: 50-900 - Backgrounds, borders, text

## Typography

### Font Family
- System font stack for optimal performance
- `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto'`

### Font Sizes
- **xs**: 12px - Labels, badges
- **sm**: 14px - Body text, table data
- **base**: 16px - Default
- **lg**: 18px - Subheadings
- **xl**: 20px - Card titles
- **2xl**: 24px - Section headers
- **3xl**: 30px - Page titles
- **4xl**: 36px - Stat values

### Font Weights
- **Normal**: 400 - Body text
- **Medium**: 500 - Labels
- **Semibold**: 600 - Headings
- **Bold**: 700 - Emphasis

## Spacing System

Based on 4px grid:
- **1**: 4px
- **2**: 8px
- **3**: 12px
- **4**: 16px
- **6**: 24px
- **8**: 32px
- **12**: 48px

## Shadows

- **sm**: Subtle elevation
- **md**: Standard cards
- **lg**: Hover states
- **xl**: Modals, popovers
- **2xl**: Maximum depth

## Border Radius

- **sm**: 6px - Small elements
- **base**: 8px - Standard
- **md**: 12px - Cards
- **lg**: 16px - Large cards
- **xl**: 24px - Modals
- **full**: 9999px - Pills, badges

## Implementation Guide

### 1. Import Styles
```jsx
import '../styles/enterprise-ui.css';
import '../styles/dashboard-common.css';
```

### 2. Use Components
```jsx
import { StatCard, EnterpriseCard, StatusBadge } from '../components/EnterpriseComponents';

<StatCard value="24" label="Total Orders" trend="positive" change="+12%" />
<EnterpriseCard title="Recent Activity">
  <StatusBadge status="in-progress">Processing</StatusBadge>
</EnterpriseCard>
```

### 3. Apply Classes
```jsx
<div className="dashboard-container">
  <div className="dashboard-header">
    <h1 className="dashboard-title">Dashboard</h1>
  </div>
  <div className="summary-grid">
    {/* Stat cards */}
  </div>
</div>
```

## Dashboard Structure

```
dashboard-container
├── dashboard-header
│   ├── dashboard-title
│   ├── dashboard-subtitle
│   └── dashboard-actions
├── summary-grid (metrics)
│   └── summary-card × N
├── filter-bar (optional)
├── content-section
│   ├── section-header
│   ├── section-body
│   │   └── enterprise-table
│   └── section-footer
└── pagination (if needed)
```

## Best Practices

### DO ✓
- Use design tokens (CSS variables)
- Maintain consistent spacing
- Add hover states to interactive elements
- Include loading states
- Show empty states
- Use semantic HTML
- Add transitions for smooth UX
- Test on mobile devices

### DON'T ✗
- Hardcode colors or sizes
- Overuse animations
- Ignore accessibility
- Mix different design patterns
- Use inline styles excessively
- Forget error states

## Currency Formatting

Always use Philippine Peso (PHP):
```javascript
const formatMoney = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '₱0.00';
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};
```

## Performance Considerations

- Use CSS transitions over JavaScript animations
- Lazy load heavy components
- Debounce search inputs
- Virtualize long lists
- Optimize images
- Minimize re-renders

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Files Created

1. `/styles/enterprise-ui.css` - Core component styles
2. `/styles/dashboard-common.css` - Shared dashboard styles
3. `/components/EnterpriseComponents.jsx` - React components
4. `/styles/design-tokens.css` - Design system variables (existing, enhanced)
5. `/styles/global.css` - Global styles (existing, enhanced)

## Migration Checklist

For each dashboard:
- [ ] Import enterprise styles
- [ ] Replace old card components with EnterpriseCard
- [ ] Update stat displays to use StatCard
- [ ] Convert tabs to EnterpriseTabs
- [ ] Wrap tables in EnterpriseTable
- [ ] Add StatusBadge for status fields
- [ ] Implement ActionBar for toolbars
- [ ] Add SearchBar where applicable
- [ ] Include loading states
- [ ] Add empty states
- [ ] Test responsiveness
- [ ] Verify accessibility

## Next Steps

1. Apply enterprise UI to all 13 dashboards
2. Test on different screen sizes
3. Validate accessibility
4. Gather user feedback
5. Iterate and refine
