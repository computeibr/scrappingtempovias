/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Identidade visual Prefeitura Rio / Tempovias
        navy: {
          900: '#13335A',
          800: '#15335A',
          700: '#1C3056',
          DEFAULT: '#004A80',
          600: '#2C678C',
          500: '#2B658E',
        },
        sky: {
          DEFAULT: '#00C0F3',
          400: '#42B9EB',
          300: '#53B8E9',
        },
        brand: {
          orange: '#E95F3E',
          red: '#E51B23',
          yellow: '#F9C600',
          green: '#34973B',
          gray: '#F0F0F0',
          'gray-mid': '#ECEDED',
          dark: '#1D1D1B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
