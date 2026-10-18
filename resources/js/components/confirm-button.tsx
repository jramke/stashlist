import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState, type ComponentProps } from 'react';

/** How long the button waits for the second press before it forgets the first. */
const ARMED_FOR = 3000;

/**
 * A button for something that cannot be taken back. The first press changes the label to a question, the second
 * one does it. No dialog, and the question is on the button the finger is already on.
 */
export function ConfirmButton({
    onConfirm,
    confirmLabel = 'Sure?',
    children,
    ...props
}: Omit<ComponentProps<typeof Button>, 'onClick'> & {
    onConfirm: () => void;
    confirmLabel?: string;
}) {
    const [armed, setArmed] = useState(false);
    const timer = useRef<number>(undefined);

    useEffect(() => () => clearTimeout(timer.current), []);

    return (
        <Button
            {...props}
            type="button"
            variant={armed ? 'destructive' : props.variant}
            onBlur={() => setArmed(false)}
            onClick={() => {
                clearTimeout(timer.current);

                if (armed) {
                    setArmed(false);
                    onConfirm();
                } else {
                    setArmed(true);
                    timer.current = window.setTimeout(
                        () => setArmed(false),
                        ARMED_FOR,
                    );
                }
            }}
        >
            {armed ? confirmLabel : children}
        </Button>
    );
}
