/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#162B7A',
                    50: '#E8EBFA',
                    100: '#D1D7F5',
                    200: '#A3AFEB',
                    300: '#7587E1',
                    400: '#4759D7',
                    500: '#162B7A',
                    600: '#122368',
                    700: '#0E1A4E',
                    800: '#091234',
                    900: '#05091A',
                },
                accent: {
                    DEFAULT: '#F5C542',
                    50: '#FEF9E7',
                    100: '#FDF3CF',
                    200: '#FBE79F',
                    300: '#F9DB6F',
                    400: '#F7D03F',
                    500: '#F5C542',
                    600: '#C49E35',
                    700: '#937728',
                    800: '#624F1A',
                    900: '#31280D',
                },
                secondary: {
                    DEFAULT: '#7B3FE4',
                    50: '#F3EBFD',
                    100: '#E7D7FB',
                    200: '#CFAFF7',
                    300: '#B787F3',
                    400: '#9F5FEF',
                    500: '#7B3FE4',
                    600: '#6232B6',
                    700: '#4A2689',
                    800: '#31195B',
                    900: '#190D2E',
                },
            },
            fontFamily: {
                serif: ['Cormorant Garamond', 'serif'],
                sans: ['Open Sans', 'sans-serif'],
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out',
                'slide-up': 'slideUp 0.5s ease-out',
                'slide-down': 'slideDown 0.3s ease-out',
                'slide-right': 'slideRight 0.4s ease-out',
                'scale-in': 'scaleIn 0.3s ease-out',
                'shimmer': 'shimmer 2s infinite',
                'float': 'float 3s ease-in-out infinite',
                'glow': 'glow 2s ease-in-out infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                slideDown: {
                    '0%': { transform: 'translateY(-10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                slideRight: {
                    '0%': { transform: 'translateX(-100%)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' },
                },
                scaleIn: {
                    '0%': { transform: 'scale(0.9)', opacity: '0' },
                    '100%': { transform: 'scale(1)', opacity: '1' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-1000px 0' },
                    '100%': { backgroundPosition: '1000px 0' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-20px)' },
                },
                glow: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.5' },
                },
            },
        },
    },
    plugins: [],
}
