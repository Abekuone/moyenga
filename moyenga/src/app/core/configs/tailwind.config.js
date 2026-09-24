/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--orange)',
          hover: 'var(--orange-hover)',
          active: 'var(--orange-active)',
          focus: 'var(--orange-focus)',
        },
        secondary: {
          DEFAULT: 'var(--blue-primary)',
          dark: 'var(--blue-dark)',
          darker: 'var(--blue-darker)',
        },
        ink: 'var(--gray-900)',
        muted: 'var(--gray-500)',
        line: 'var(--gray-200)',
        surface: 'var(--gray-50)',
      },
      fontFamily: {
        display: ['Sora', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      maxWidth: {
        content: '1200px',
      },
    },
  },
  plugins: [],
};
