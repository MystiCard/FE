# MystiCard - Frontend

A modern, premium Pokemon trading card game platform built with React, TypeScript, and Vite.

## Features

- **Pokemon Card Trading**: Browse, buy, and sell Pokemon cards
- **Portfolio Management**: Track your card collection and value
- **Mystery Boxes**: Purchase mystery boxes with random cards
- **Marketplace**: User-to-user trading marketplace
- **Admin Dashboard**: Product and user management
- **Authentication**: Google OAuth integration
- **Modern UI/UX**: Glassmorphism effects, smooth animations, and premium design
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Type-Safe**: Built with TypeScript for better development experience
- **Fast Performance**: Powered by Vite for lightning-fast builds

## Tech Stack

- **Frontend**: React 18.3.1
- **Language**: TypeScript
- **Build Tool**: Vite 6.3.5
- **Styling**: Tailwind CSS v4
- **UI Components**: Radix UI
- **Icons**: Lucide React
- **Routing**: React Router DOM v7
- **Charts**: Recharts

## Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
MystiCard-FE/
├── src/
│   ├── components/
│   │   ├── ui/           # Radix UI components
│   │   ├── layout/       # Header, Sidebar, Footer
│   │   ├── home/         # Home page components
│   │   ├── shop/         # Shop & marketplace components
│   │   ├── user/         # Login, Register, Profile
│   │   ├── portfolio/    # Portfolio & card management
│   │   ├── admin/        # Admin dashboard
│   │   ├── about/        # About page
│   │   └── shared/       # Shared components (Cart, Wishlist, etc)
│   ├── pages/            # Page components
│   ├── layouts/          # MainLayout, AdminLayout
│   ├── contexts/         # AuthContext
│   ├── hooks/            # useCart, useWishlist
│   ├── utils/            # API utilities, helpers
│   ├── styles/           # Global styles
│   ├── types/            # TypeScript type definitions
│   ├── lib/              # Utility functions
│   ├── App.tsx           # Main app component with routing
│   └── main.tsx          # Entry point
├── public/               # Static assets (logo, images)
├── index.html            # HTML template
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
├── vite.config.ts        # Vite config
├── tailwind.config.js    # Tailwind config
└── postcss.config.js     # PostCSS config
```

## Key Features

### Pages

- **Home**: Hero section, features showcase, new arrivals
- **Shop**: Products, Booster Boxes, Mystery Boxes
- **Marketplace**: User-to-user trading platform
- **Portfolio**: Card collection management
- **Comparison**: Compare card values
- **Profile**: User profile and settings
- **Admin**: Product and user management dashboard

### Design System

- Multi-layer gradient backgrounds
- Glassmorphism effects (frosted glass UI)
- Custom animations (fadeIn, slideUp, float, glow)
- Premium card styles with hover effects
- Custom scrollbar with gradient
- Staggered entrance animations

### Components

- **Layout**: Header with dropdown menus, Sidebar, Footer, Mobile Menu
- **Shop**: Products, Marketplace, Mystery Box, Booster Boxes, Create Listing
- **Shared**: Cart Drawer, Wishlist Drawer, Floating Widgets, Card Comparison
- **Portfolio**: Portfolio view, Set Detail, Card Detail Modal
- **Admin**: Dashboard, Product Management, User Management
- **UI Library**: Button, Card, Dialog, Input, Dropdown, Toast, Tooltip, Progress, and more

### Animations

- Smooth transitions (300-500ms)
- Hover lift effects
- Floating decorative elements
- Staggered reveals

## Design Highlights

- **Color Palette**:
  - Primary: Blue (#3D7DCA)
  - Accent: Gold (#FFCB05)
- **Typography**:
  - Serif: Cormorant Garamond
  - Sans: Open Sans
- **Effects**: Glassmorphism, gradients, shadows, blur

## Development

The project uses:

- **ESLint** for code linting
- **TypeScript** for type checking
- **Vite** for fast development and building
- **Tailwind CSS** for styling

## Configuration

- Path alias `@/` points to `src/` directory
- Custom Tailwind theme with extended colors and animations
- Optimized build with code splitting

## License

Copyright © 2025 MystiCard. All rights reserved.

## Contributing

This is a private project. For questions or support, contact the development team.
