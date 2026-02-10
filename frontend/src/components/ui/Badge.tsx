import { cn } from '@/lib/utils'

interface BadgeProps {
    children: React.ReactNode
    variant?: 'default' | 'success' | 'danger' | 'warning' | 'outline'
    className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
    const variants = {
        default: 'bg-primary/20 text-primary border-primary/30',
        success: 'bg-success/20 text-success border-success/30',
        danger: 'bg-danger/20 text-danger border-danger/30',
        warning: 'bg-warning/20 text-warning border-warning/30',
        outline: 'bg-transparent text-gray-400 border-dark-700',
    }

    return (
        <span
            className={cn(
                'inline-flex items-center px-2 py-1 rounded text-xs font-semibold border',
                variants[variant],
                className
            )}
        >
            {children}
        </span>
    )
}
