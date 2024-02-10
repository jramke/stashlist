import Root from './button.svelte';
import { tv, type VariantProps } from 'tailwind-variants';
import type { Button as ButtonPrimitive } from 'bits-ui';

const buttonVariants = tv({
	base: 'inline-flex items-center justify-center rounded-md text-sm font-medium whitespace-nowrap ring-offset-background border-transparent transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
	variants: {
		variant: {
			default: 'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md hover:shadow-primary/20',
			destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-md hover:shadow-destructive/20',
			outline: 'border border-input bg-background hover:text-accent-foreground hover:border-primary',
			secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:shadow-md hover:shadow-secondary/20',
			ghost: 'border hover:text-accent-foreground hover:border-primary',
			link: 'text-primary underline-offset-4 hover:underline',
			nav: 'transition-colors text-foreground/60 hover:text-foreground/80 [&.active]:text-foreground [&.active]:font-bold'
		},
		size: {
			default: 'h-10 px-4 py-2',
			sm: 'h-9 rounded-md px-3',
			lg: 'h-11 rounded-md px-8',
			icon: 'h-10 w-10'
		}
	},
	defaultVariants: {
		variant: 'default',
		size: 'default'
	}
});

type Variant = VariantProps<typeof buttonVariants>['variant'];
type Size = VariantProps<typeof buttonVariants>['size'];

type Props = ButtonPrimitive.Props & {
	variant?: Variant;
	size?: Size;
};

type Events = ButtonPrimitive.Events;

export {
	Root,
	type Props,
	type Events,
	//
	Root as Button,
	type Props as ButtonProps,
	type Events as ButtonEvents,
	buttonVariants
};
