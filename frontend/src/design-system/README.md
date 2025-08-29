# Personal Finance Tracker - Design System

A comprehensive design system built with Tailwind CSS for creating consistent, accessible, and professional financial applications.

## 🎯 Overview

This design system provides a complete foundation for building financial applications with:

- **Professional color palette** optimized for financial data display
- **Accessibility-first approach** with WCAG 2.1 AA compliance
- **Mobile-responsive design** with mobile-first principles
- **Typography system** optimized for readability and data presentation
- **Component library** with financial-specific variants
- **Design tokens** for consistent spacing, colors, and typography

## 🚀 Quick Start

```tsx
import { Button, Card, Input } from '@/design-system';

function MyComponent() {
  return (
    <Card>
      <Input label="Amount" type="number" />
      <Button variant="primary">Submit</Button>
    </Card>
  );
}
```

## 📁 Structure

```
src/design-system/
├── tokens/           # Design tokens (colors, typography, spacing)
├── components/       # Reusable UI components
├── utils/           # Utility functions and helpers
├── README.md        # This documentation
└── index.ts         # Main export file
```

## 🎨 Design Tokens

### Colors

Our color system is specifically designed for financial applications:

#### Primary Colors
- Professional blues for primary actions and branding
- `primary-500`: #3b82f6 (Main primary color)
- Full scale from `primary-50` to `primary-950`

#### Semantic Colors
- **Success (Green)**: For positive financial values, completed transactions
- **Danger (Red)**: For negative values, errors, losses
- **Warning (Yellow)**: For alerts, pending states
- **Info (Blue)**: For informational content

#### Financial-Specific Colors
```css
.financial-positive { color: #22c55e; } /* Green for profits */
.financial-negative { color: #ef4444; } /* Red for losses */
.financial-neutral { color: #6b7280; } /* Gray for neutral */
```

### Typography

Based on Inter font family for optimal readability:

#### Font Families
- **Sans**: Inter (UI text)
- **Mono**: JetBrains Mono (Financial data, numbers)
- **Display**: Inter (Headings)

#### Typography Scale
- **Display**: Large headings (h1-h3)
- **Body**: Regular content (paragraphs, labels)
- **Financial**: Monospace for numbers and currency

#### Usage Examples
```tsx
<h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
<p className="text-base text-gray-700">Account balance</p>
<span className="font-mono text-lg text-success-600">$1,234.56</span>
```

### Spacing

8px base unit system for consistent layouts:

```css
/* Component spacing */
.space-y-4 > * + * { margin-top: 1rem; } /* 16px */
.p-6 { padding: 1.5rem; } /* 24px */

/* Semantic spacing */
.gap-form { gap: 1rem; } /* 16px between form fields */
.gap-section { gap: 2rem; } /* 32px between sections */
```

### Breakpoints

Mobile-first responsive design:

- **xs**: 475px (Small phones)
- **sm**: 640px (Large phones)  
- **md**: 768px (Tablets)
- **lg**: 1024px (Laptops)
- **xl**: 1280px (Desktops)
- **2xl**: 1536px (Large screens)

## 🧩 Components

### Button

Versatile button component with multiple variants:

```tsx
import { Button } from '@/design-system';

// Basic usage
<Button variant="primary" size="md">
  Submit Transaction
</Button>

// With icons and loading state
<Button 
  variant="success" 
  leftIcon={<PlusIcon />}
  loading={isSubmitting}
>
  Add Income
</Button>
```

#### Variants
- `primary`: Main actions
- `secondary`: Supporting actions  
- `outline`: Subtle actions
- `ghost`: Minimal actions
- `success`: Positive actions
- `danger`: Destructive actions
- `warning`: Cautionary actions

#### Sizes
- `xs`, `sm`, `md`, `lg`, `xl`

### Card

Flexible container for displaying content:

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/design-system';

<Card variant="elevated">
  <CardHeader>
    <CardTitle>Account Summary</CardTitle>
  </CardHeader>
  <CardContent>
    <MetricCard 
      title="Total Balance"
      value="$12,345.67"
      change={{ value: "+5.2%", type: "positive" }}
    />
  </CardContent>
</Card>
```

#### Variants
- `default`: Standard card
- `elevated`: More prominent shadow
- `interactive`: Clickable with hover effects
- `outlined`: Emphasized border
- `success/danger/warning`: Semantic variants

### Input

Comprehensive input component with validation:

```tsx
import { Input, CurrencyInput, SearchInput } from '@/design-system';

// Basic input
<Input 
  label="Transaction Description"
  placeholder="Enter description"
  helperText="Brief description of the transaction"
/>

// Currency input
<CurrencyInput
  label="Amount"
  currency="$"
  error={validationError}
/>

// Search input
<SearchInput
  placeholder="Search transactions"
  value={searchQuery}
  onClear={() => setSearchQuery('')}
/>
```

### Badge

Status and categorization component:

```tsx
import { Badge, StatusBadge, TransactionTypeBadge } from '@/design-system';

<StatusBadge status="completed" />
<TransactionTypeBadge type="income" />
<Badge variant="success" size="sm">Active</Badge>
```

## ♿ Accessibility

Our design system follows WCAG 2.1 AA guidelines:

### Focus Management
- Visible focus indicators on all interactive elements
- Logical tab order throughout the interface
- Focus trapping in modals and dropdowns

### Color Contrast
- Minimum 4.5:1 contrast ratio for normal text
- Minimum 3:1 contrast ratio for large text
- Color is not the only means of conveying information

### Screen Reader Support
- Semantic HTML structure
- Proper ARIA labels and roles
- Live regions for dynamic content updates

### Keyboard Navigation
- Full keyboard accessibility
- Standard keyboard shortcuts
- Skip links for main content

### Usage Examples

```tsx
import { accessibility } from '@/design-system';

// Check color contrast
const { passes, ratio } = accessibility.checkContrastCompliance(
  '#3b82f6', // foreground
  '#ffffff'  // background
);

// Screen reader announcements
accessibility.liveRegionUtils.announce('Transaction saved successfully');

// Focus management
const cleanupFocus = accessibility.focusUtils.trapFocus(modalElement);
```

## 📱 Responsive Design

Mobile-first approach with progressive enhancement:

### Layout Patterns
- **Mobile**: Single column, bottom navigation
- **Tablet**: Two columns, side drawer navigation  
- **Desktop**: Multi-column, persistent sidebar

### Component Behavior
```tsx
// Responsive button sizes
<Button className="text-sm md:text-base lg:text-lg">
  Responsive Button
</Button>

// Responsive spacing
<div className="p-4 md:p-6 lg:p-8">
  Responsive padding
</div>

// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Cards will adapt to screen size */}
</div>
```

## 🔧 Customization

### Extending the Theme

Add custom colors to `tailwind.config.js`:

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        'brand-primary': '#your-color',
        'custom-success': '#your-green',
      }
    }
  }
}
```

### Custom Components

Create new components following our patterns:

```tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/design-system/utils/cn';

const customVariants = cva(
  // base styles
  'base-classes',
  {
    variants: {
      variant: {
        primary: 'variant-specific-classes',
      },
      size: {
        sm: 'size-specific-classes',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'sm',
    },
  }
);
```

## 🛠️ Development

### Prerequisites
- React 18+
- TypeScript 5+
- Tailwind CSS 3+

### Installation
```bash
npm install clsx tailwind-merge class-variance-authority
```

### Building Components
1. Create component file in `/components`
2. Use CVA for variant management
3. Follow accessibility guidelines
4. Add to index exports
5. Update documentation

### Testing
```bash
# Type checking
npm run type-check

# Linting  
npm run lint

# Formatting
npm run format
```

## 📊 Financial-Specific Features

### Number Formatting
```css
.financial-number {
  font-family: 'JetBrains Mono';
  font-variant-numeric: tabular-nums;
}
```

### Currency Display
```tsx
<span className="currency">1234.56</span> // Renders: $1,234.56
<span className="percentage">5.2</span>    // Renders: 5.2%
```

### Status Indicators
- Green for positive values/completed states
- Red for negative values/error states  
- Yellow for pending/warning states
- Blue for informational states

## 🤝 Contributing

1. Follow existing component patterns
2. Ensure accessibility compliance
3. Add comprehensive documentation
4. Test across different devices
5. Consider financial application context

## 📈 Roadmap

- [ ] Dark mode support
- [ ] Advanced chart components
- [ ] Data table components
- [ ] Animation system
- [ ] More financial-specific components

## 📄 License

This design system is part of the Personal Finance Tracker application.

---

For questions or contributions, please refer to the main project documentation.