/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ['class'],
    content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
  ],

  theme: {
  	extend: {
  		colors: {
  			primary: 'rgb(var(--primary) / <alpha-value>)',
  			'primary-foreground': 'rgb(var(--primary-foreground) / <alpha-value>)',
  			destructive: 'rgb(var(--destructive) / <alpha-value>)',
  			'destructive-foreground': 'rgb(var(--destructive-foreground) / <alpha-value>)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },

  plugins: [require('tailwindcss-animate')],
};
