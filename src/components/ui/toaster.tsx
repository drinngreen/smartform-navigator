import { useToast } from "@/hooks/use-toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <div className="fixed top-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:flex-col md:max-w-[420px]">
      {toasts.map(({ id, title, description, ...props }) => (
        <div key={id} className="mb-2 rounded-lg border border-border bg-card p-4 shadow-lg">
          {title && <div className="text-sm font-semibold text-foreground">{title}</div>}
          {description && <div className="text-sm text-muted-foreground">{description}</div>}
        </div>
      ))}
    </div>
  );
}
