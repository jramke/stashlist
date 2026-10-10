import type {
    ButtonHTMLAttributes,
    InputHTMLAttributes,
    ReactNode,
} from 'react';

const field =
    'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
    return <input {...props} className={`${field} ${props.className ?? ''}`} />;
}

export function Button({
    variant = 'primary',
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'outline';
}) {
    const look =
        variant === 'primary'
            ? 'bg-primary text-primary-foreground hover:opacity-90'
            : 'border border-input hover:bg-muted';

    return (
        <button
            {...props}
            className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium disabled:pointer-events-none disabled:opacity-50 ${look} ${props.className ?? ''}`}
        />
    );
}

export function Label({
    children,
    htmlFor,
}: {
    children: ReactNode;
    htmlFor?: string;
}) {
    return (
        <label
            htmlFor={htmlFor}
            className="text-xs font-medium text-muted-foreground"
        >
            {children}
        </label>
    );
}

export function Note({
    tone = 'muted',
    children,
}: {
    tone?: 'muted' | 'error';
    children: ReactNode;
}) {
    return (
        <p
            role={tone === 'error' ? 'alert' : 'status'}
            className={
                tone === 'error'
                    ? 'text-sm text-destructive'
                    : 'text-sm text-muted-foreground'
            }
        >
            {children}
        </p>
    );
}
