/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', '-apple-system', 'sans-serif'],
        heading: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      colors: {
        // Surfaces
        background: "var(--background-app)",
        surface: "var(--surface)",
        "surface-warm": "var(--surface-warm)",
        "surface-muted": "var(--surface-muted)",
        border: "var(--color-border)",
        "border-strong": "var(--color-border-strong)",
        
        // Text
        "text-primary": "var(--text-main)",
        "text-secondary": "var(--text-body)",
        "text-muted": "var(--text-muted)",
        "text-subtle": "var(--text-subtle)",

        // Accents
        primary: "var(--color-primary)",
        // the panel's brand colour with opacity support (bg-brand/10) – orange, violet inside .theme-violet
        brand: "rgb(var(--brand-rgb) / <alpha-value>)",
        "primary-hover": "var(--color-primary-hover)",
        "primary-light": "var(--color-primary-light)",
        "primary-deep": "var(--color-primary-deep)",
        
        // Status
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        error: "var(--color-error)",
        info: "var(--color-info)",
        
        // Shadcn UI mappings
        input: "var(--color-border)",
        ring: "var(--color-primary-glow)",
        foreground: "var(--text-main)",
        muted: "var(--surface-muted)",
        "muted-foreground": "var(--text-muted)",
        popover: "var(--surface)",
        "popover-foreground": "var(--text-main)",
        card: "var(--surface)",
        "card-foreground": "var(--text-main)",
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
        'gradient-page-top': 'linear-gradient(180deg, #FFF7F2 0%, #F8F9FC 100%)',
        'gradient-table-header': 'linear-gradient(180deg, #FAFBFE 0%, #F1F5F9 100%)',
      },
      borderRadius: {
        lg: "var(--radius-card)",
        md: "var(--radius-btn)",
        sm: "var(--radius-badge)",
      },
      boxShadow: {
        'xs': 'var(--shadow-xs)',
        'card': 'var(--shadow-sm)',
        'card-hover': 'var(--shadow-xl)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
        'glow': 'var(--shadow-glow)',
      },
      transitionTimingFunction: {
        'premium': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      animation: {
        "fade-in": "fadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
        "pulse-slow": "pulse-slow 3s ease-in-out infinite",
        "sweep": "sweep 2s ease-in-out infinite",
        "marquee": "marquee 25s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-slow": {
          '0%, 100%': {
            transform: 'translateX(-100%)',
          },
          '50%': {
            transform: 'translateX(100%)',
          },
        },
        sweep: {
          '0%': { transform: 'translateX(-100%) skewX(-20deg)' },
          '100%': { transform: 'translateX(200%) skewX(-20deg)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
      },
    },
  },
  plugins: [],
};
