import * as React from "react"
import { Progress } from "./progress"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface EnhancedProgressProps {
  value: number
  max?: number
  label?: string
  sublabel?: string
  showPercentage?: boolean
  estimatedTime?: string
  steps?: {
    current: number
    total: number
  }
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'success' | 'warning' | 'danger'
  loading?: boolean
  className?: string
}

export const EnhancedProgress = React.forwardRef<
  HTMLDivElement,
  EnhancedProgressProps
>(({
  value,
  max = 100,
  label,
  sublabel,
  showPercentage = true,
  estimatedTime,
  steps,
  size = 'md',
  variant = 'default',
  loading = false,
  className,
}, ref) => {
  const percentage = Math.round((value / max) * 100)
  
  const sizeClasses = {
    sm: 'h-2',
    md: 'h-4',
    lg: 'h-6'
  }
  
  const variantClasses = {
    default: '',
    success: '[&>div]:bg-terminal-green',
    warning: '[&>div]:bg-terminal-yellow',
    danger: '[&>div]:bg-red-400'
  }

  return (
    <div ref={ref} className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-sm">
        <div className="space-y-1">
          {label && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-terminal-text">{label}</span>
              {loading && <Loader2 className="w-3 h-3 text-terminal-cyan animate-spin" />}
            </div>
          )}
          {sublabel && (
            <span className="text-xs text-terminal-text-muted">{sublabel}</span>
          )}
        </div>
        
        <div className="flex items-center gap-3 text-terminal-text-muted">
          {steps && (
            <span className="text-xs font-mono">
              Step {steps.current} of {steps.total}
            </span>
          )}
          {showPercentage && (
            <span className="text-xs font-mono text-terminal-cyan">
              {percentage}%
            </span>
          )}
          {estimatedTime && (
            <span className="text-xs">
              ~{estimatedTime}
            </span>
          )}
        </div>
      </div>
      
      <Progress 
        value={value} 
        max={max}
        className={cn(
          sizeClasses[size],
          variantClasses[variant]
        )}
      />
    </div>
  )
})

EnhancedProgress.displayName = "EnhancedProgress"

// Step-based progress component
interface StepProgressProps {
  steps: {
    id: string
    label: string
    status: 'pending' | 'current' | 'completed'
  }[]
  className?: string
}

export const StepProgress: React.FC<StepProgressProps> = ({ steps, className }) => {
  const currentIndex = steps.findIndex(step => step.status === 'current')
  const completedCount = steps.filter(step => step.status === 'completed').length
  const percentage = (completedCount / steps.length) * 100

  return (
    <div className={cn("space-y-4", className)}>
      <Progress value={percentage} className="h-2" />
      
      <div className="flex justify-between relative">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              "flex flex-col items-center flex-1",
              index < steps.length - 1 && "relative"
            )}
          >
            <div
              className={cn(
                "w-8 h-8 rounded-full border-2 flex items-center justify-center font-mono text-sm transition-all",
                step.status === 'completed' && "bg-terminal-green border-terminal-green text-terminal-bg",
                step.status === 'current' && "bg-terminal-cyan border-terminal-cyan text-terminal-bg animate-pulse",
                step.status === 'pending' && "bg-terminal-bg border-terminal-text/30 text-terminal-text-muted"
              )}
            >
              {index + 1}
            </div>
            <span className={cn(
              "text-xs mt-2 text-center max-w-[100px]",
              step.status === 'completed' && "text-terminal-green",
              step.status === 'current' && "text-terminal-cyan",
              step.status === 'pending' && "text-terminal-text-muted"
            )}>
              {step.label}
            </span>
            
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "absolute top-4 left-1/2 w-full h-0.5 -translate-y-1/2",
                  step.status === 'completed' ? "bg-terminal-green" : "bg-terminal-text/30"
                )}
                style={{ width: 'calc(100% - 2rem)', left: 'calc(50% + 1rem)' }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}