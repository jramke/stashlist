import { fontFamily } from 'tailwindcss/defaultTheme';
import type { Config } from 'tailwindcss';

const config: Omit<Config, "content"> = {
	darkMode: ['class'],
	// content: [
	// 	'./src/**/*.{html,js,svelte,ts}',
	//  "../../packages/ui/src/**/*.{html,js,svelte,ts}",
	// ],
	plugins: [
		require('@tailwindcss/typography'),
		// ...
	],
	safelist: ['dark'],
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border) / <alpha-value>)',
				input: 'hsl(var(--input) / <alpha-value>)',
				ring: 'hsl(var(--ring) / <alpha-value>)',
				background: 'hsl(var(--background) / <alpha-value>)',
				foreground: 'hsl(var(--foreground) / <alpha-value>)',
				primary: {
					DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
					foreground: 'hsl(var(--primary-foreground) / <alpha-value>)'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary) / <alpha-value>)',
					foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
					foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
					foreground: 'hsl(var(--muted-foreground) / <alpha-value>)'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
					foreground: 'hsl(var(--accent-foreground) / <alpha-value>)'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover) / <alpha-value>)',
					foreground: 'hsl(var(--popover-foreground) / <alpha-value>)'
				},
				card: {
					DEFAULT: 'hsl(var(--card) / <alpha-value>)',
					foreground: 'hsl(var(--card-foreground) / <alpha-value>)'
				}
			},
			borderRadius: {
				lg: 'calc(var(--radius) + 2px)',
				md: 'var(--radius)',
				sm: 'calc(var(--radius) - 4px)'
			},
			fontFamily: {
				sans: ['Plus Jakarta Sans Variable', ...fontFamily.sans]
			},
			aspectRatio: {
				og: '1.91 / 1'
			},
			keyframes: {
				wiggle: {
					'0%, 100%': { transform: 'rotate(-6deg)' },
					'50%': { transform: 'rotate(6deg)' },
				}
			},
			animation: {
				wiggle: 'wiggle .3s ease-in-out infinite',
			},
			zIndex: {
				'infinity': 'calc(infinity)',
			},
			typography: (theme: any) => ({
				neutral: {
					css: {
						'--tw-prose-body': theme('colors.foreground'),
						'--tw-prose-headings': theme('colors.primary.DEFAULT'),
						'--tw-prose-lead': theme('colors.secondary.DEFAULT'),
						'--tw-prose-links': theme('colors.primary.DEFAULT'),
						'--tw-prose-bold': theme('colors.primary.DEFAULT'),
						'--tw-prose-counters': theme('colors.secondary.DEFAULT'),
						'--tw-prose-bullets': theme('colors.secondary.DEFAULT'),
						'--tw-prose-hr': theme('colors.secondary.DEFAULT'),
						'--tw-prose-quotes': theme('colors.primary.DEFAULT'),
						'--tw-prose-quote-borders': theme('colors.secondary.DEFAULT'),
						'--tw-prose-captions': theme('colors.secondary.DEFAULT'),
						'--tw-prose-code': theme('colors.primary.DEFAULT'),
						'--tw-prose-pre-code': theme('colors.primary.DEFAULT'),
						'--tw-prose-pre-bg': theme('colors.secondary.DEFAULT'),
						'--tw-prose-th-borders': theme('colors.secondary.DEFAULT'),
						'--tw-prose-td-borders': theme('colors.secondary.DEFAULT'),
						'--tw-prose-invert-body': theme('colors.foreground'),
						'--tw-prose-invert-headings': theme('colors.primary.foreground'),
						'--tw-prose-invert-lead': theme('colors.secondary.foreground'),
						'--tw-prose-invert-links': theme('colors.primary.foreground'),
						'--tw-prose-invert-bold': theme('colors.primary.foreground'),
						'--tw-prose-invert-counters': theme('colors.secondary.foreground'),
						'--tw-prose-invert-bullets': theme('colors.secondary.foreground'),
						'--tw-prose-invert-hr': theme('colors.secondary.foreground'),
						'--tw-prose-invert-quotes': theme('colors.primary.foreground'),
						'--tw-prose-invert-quote-borders': theme('colors.secondary.foreground'),
						'--tw-prose-invert-captions': theme('colors.secondary.foreground'),
						'--tw-prose-invert-code': theme('colors.primary.foreground'),
						'--tw-prose-invert-pre-code': theme('colors.primary.foreground'),
						'--tw-prose-invert-pre-bg': theme('colors.secondary.foreground'),
						'--tw-prose-invert-th-borders': theme('colors.secondary.foreground'),
						'--tw-prose-invert-td-borders': theme('colors.secondary.foreground'),
						maxWidth: '70ch'
					},
				}
			}),
		}
	}
};
export default config;
