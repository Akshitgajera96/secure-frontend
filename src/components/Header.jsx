import React from 'react';
import { ArrowLeft, Shield, Printer } from 'lucide-react';

export const Header = () => {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50 flex-shrink-0">
      <button
        type="button"
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back</span>
      </button>

      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end">
          <span className="text-xs text-muted-foreground truncate max-w-[220px]">car.svg</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-primary">
            <Shield className="h-4 w-4" />
            <span className="text-xs font-medium">Protected</span>
          </div>

          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-9 rounded-md px-3 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
        </div>
      </div>
    </div>
  );
};
