import { cn } from '@/lib/utils'

interface SkeletonCardProps {
  className?: string
}

export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div className={cn('bg-card rounded-3xl p-6 animate-shimmer', className)}>
      <div className="space-y-3">
        <SkeletonText width="40%" />
        <SkeletonText width="60%" height="h-8" />
        <div className="flex gap-4 pt-2">
          <SkeletonCircle />
          <SkeletonText width="30%" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonText({
  width = '100%',
  height = 'h-4',
  className,
}: {
  width?: string
  height?: string
  className?: string
}) {
  return (
    <div
      className={cn('rounded-lg bg-muted animate-pulse', height, className)}
      style={{ width }}
    />
  )
}

export function SkeletonCircle({
  size = 40,
  className,
}: {
  size?: number
  className?: string
}) {
  return (
    <div
      className={cn('rounded-full bg-muted animate-pulse shrink-0', className)}
      style={{ width: size, height: size }}
    />
  )
}
