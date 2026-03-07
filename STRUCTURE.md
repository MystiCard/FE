# Project Structure - SWD_Myscard v2.0

## 📁 Folder Organization

### Root Level
```
SWD_Myscard_v2/
├── public/          # Static assets (images, icons, etc.)
├── src/             # Source code
├── index.html       # HTML entry point
├── package.json     # Dependencies and scripts
├── tsconfig.json    # TypeScript configuration
├── vite.config.ts   # Vite build configuration
├── tailwind.config.js  # Tailwind CSS configuration
├── postcss.config.js   # PostCSS configuration
├── .gitignore       # Git ignore rules
└── README.md        # Project documentation
```

### Source Directory (`src/`)

#### Components (`src/components/`)
Organized by feature and purpose:

- **`ui/`** - Reusable UI components from Radix UI
  - button.tsx, card.tsx, dialog.tsx, input.tsx, etc.
  - Base components used throughout the app

- **`layout/`** - Layout components
  - Header.tsx - Top navigation with dropdowns
  - Sidebar.tsx - Side navigation
  - Footer.tsx - Footer with links and social

- **`home/`** - Home page specific components
  - HeroSection.tsx - Hero banner with CTA
  - Features.tsx - Feature showcase
  - NewArrivals.tsx - New products section

- **`shop/`** - Shop related components
  - Products.tsx, BoosterBoxes.tsx, etc.

- **`user/`** - User management components
  - Login.tsx, Register.tsx, Profile.tsx, etc.

- **`portfolio/`** - Portfolio components
  - Portfolio.tsx, Trends.tsx, etc.

- **`admin/`** - Admin panel components
  - AdminDashboard.tsx, AdminHeader.tsx, etc.

- **`shared/`** - Shared/common components
  - Breadcrumb.tsx, Modals, FloatingWidgets, etc.

#### Pages (`src/pages/`)
Full page components that combine multiple components:
- HomePage.tsx
- ShopPage.tsx
- MarketplacePage.tsx
- etc.

#### Layouts (`src/layouts/`)
Layout wrappers for different sections:
- MainLayout.tsx - Main app layout
- AdminLayout.tsx - Admin panel layout

#### Hooks (`src/hooks/`)
Custom React hooks:
- useAuth.ts - Authentication logic
- useCart.ts - Shopping cart logic
- useTheme.ts - Theme management

#### Utils (`src/utils/`)
Utility functions and helpers:
- helpers.ts - General helper functions
- constants.ts - App constants

#### Styles (`src/styles/`)
Global styles:
- index.css - Main stylesheet with Tailwind, glassmorphism, animations

#### Types (`src/types/`)
TypeScript type definitions:
- index.ts - Shared types and interfaces

## 🎯 Naming Conventions

### Files
- **Components**: PascalCase (e.g., `HeroSection.tsx`)
- **Utilities**: camelCase (e.g., `helpers.ts`)
- **Styles**: kebab-case (e.g., `index.css`)

### Components
- Use functional components with TypeScript
- Export as named exports for better tree-shaking
- Use `React.FC` type for component definitions

### Styling
- Use Tailwind utility classes
- Custom classes in global CSS for reusable patterns
- Use `cn()` helper for conditional classes

## 🔄 Import Paths

Use the `@/` alias for clean imports:
```typescript
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/helpers'
import { MainLayout } from '@/layouts/MainLayout'
```

## 📦 Component Structure

Each component should follow this pattern:
```typescript
import React from 'react';
import { /* dependencies */ } from '...';

interface ComponentProps {
  // Props definition
}

export const ComponentName: React.FC<ComponentProps> = ({ props }) => {
  // Component logic
  
  return (
    // JSX
  );
};
```

## 🎨 Styling Guidelines

1. **Glassmorphism**: Use `.glass-card` or `.glass-card-strong`
2. **Animations**: Use `.animate-*` utilities or custom animations
3. **Hover Effects**: Use `.hover-lift` for consistent hover states
4. **Premium Styles**: Use `.btn-premium`, `.pokemon-card`, etc.

## 📝 Best Practices

1. **Keep components small and focused**
2. **Use TypeScript for type safety**
3. **Leverage Tailwind utilities first**
4. **Create custom CSS classes for repeated patterns**
5. **Use semantic HTML elements**
6. **Ensure accessibility (ARIA labels, keyboard navigation)**
7. **Optimize images and assets**
8. **Use lazy loading for routes and heavy components**
