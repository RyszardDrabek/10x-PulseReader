import * as React from "react"
import { X } from "lucide-react"

interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode
}

const Dialog: React.FC<DialogProps> = ({ open = false, onOpenChange, children }) => {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange?.(false)}
      />

      {/* Dialog */}
      {children}
    </div>
  )
}

const DialogContent: React.FC<DialogContentProps> = ({
  className = "",
  children,
  ...props
}) => (
  <div
    className={`relative bg-background border rounded-lg shadow-lg max-w-lg w-full mx-4 ${className}`}
    {...props}
  >
    {children}
  </div>
)

const DialogHeader: React.FC<DialogHeaderProps> = ({
  className = "",
  children,
  ...props
}) => (
  <div
    className={`flex flex-col space-y-1.5 p-6 ${className}`}
    {...props}
  >
    {children}
  </div>
)

const DialogTitle: React.FC<DialogTitleProps> = ({
  className = "",
  children,
  ...props
}) => (
  <h2
    className={`text-lg font-semibold leading-none tracking-tight ${className}`}
    {...props}
  >
    {children}
  </h2>
)

export { Dialog, DialogContent, DialogHeader, DialogTitle }
