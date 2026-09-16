import React from 'react'

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ children, className, ...props }, ref) => (
  <label ref={ref} className={`text-sm text-slate-300 ${className ?? ''}`} {...props}>
    {children}
  </label>
));

Label.displayName = "Label";
