import { Toaster as Sonner } from 'sonner'

function Toaster(props) {
  return (
    <Sonner
      richColors
      position="top-right"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: 'group-[.toaster]:border-border group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:shadow-soft',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
