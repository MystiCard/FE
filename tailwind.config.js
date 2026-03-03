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

        },
    },
    plugins: [],
}
