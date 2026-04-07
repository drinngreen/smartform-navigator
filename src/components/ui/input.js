import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
export const Input = React.forwardRef((props, ref) => (_jsx("input", { ref: ref, ...props, className: `px-3 py-2 rounded-md bg-slate-900/60 border border-slate-800 ${props.className ?? ''}` })));
Input.displayName = 'Input';
