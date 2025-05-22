module.exports = {
  plugins: {
    'tailwindcss/nesting': {}, // This is optional, include if you use Tailwind's nesting features
    '@tailwindcss/postcss': {}, // This is the important change
    'autoprefixer': {},
  },
};