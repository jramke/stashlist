import { useFlashToast } from '@/hooks/use-flash-toast';
import { useTheme } from '@/hooks/use-theme';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

function Toaster({ ...props }: ToasterProps) {
    const [theme] = useTheme();
    useFlashToast();

    return (
        <Sonner
            theme={theme}
            className="toaster group"
            position="bottom-right"
            style={
                {
                    '--normal-bg': 'var(--popover)',
                    '--normal-text': 'var(--popover-foreground)',
                    '--normal-border': 'var(--border)',
                } as React.CSSProperties
            }
            {...props}
        />
    );
}

export { Toaster };
