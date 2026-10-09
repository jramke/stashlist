import { Button } from '@/components/ui/button';
import { useTheme, type Theme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';
import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';

const options: { value: Theme; label: string; icon: LucideIcon }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
];

export function ThemeToggle({ className }: { className?: string }) {
    const [theme, setTheme] = useTheme();

    return (
        <div
            role="group"
            aria-label="Theme"
            className={cn(
                'inline-flex gap-0.5 rounded-lg border bg-background p-0.5',
                className,
            )}
        >
            {options.map(({ value, label, icon: Icon }) => (
                <Button
                    key={value}
                    type="button"
                    variant={theme === value ? 'secondary' : 'ghost'}
                    size="icon-sm"
                    aria-label={label}
                    aria-pressed={theme === value}
                    onClick={() => setTheme(value)}
                >
                    <Icon />
                </Button>
            ))}
        </div>
    );
}
