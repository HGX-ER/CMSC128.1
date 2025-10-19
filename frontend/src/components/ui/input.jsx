import * as React from "react";
import { cn } from "./utils";

function Input({ className, type, ...props }) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "placeholder:text-muted-foreground bg-gray-50 border border-gray-300 rounded-md w-full h-10 text-sm px-4 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 transition",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    />
  );
}

export { Input };
