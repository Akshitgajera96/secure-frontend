import React from 'react';
import { Plus, Trash2, Sparkles } from 'lucide-react';

export const Sidebar = () => {
  return (
    <div className="w-56 bg-card border-r border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Ticket Editor
        </h2>
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Series Slot</div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-9 rounded-md px-3 bg-primary text-primary-foreground hover:bg-primary/90 w-full"
            >
              <Plus className="h-4 w-4" />
              Add Series Slot
            </button>

            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-9 rounded-md px-3 bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full"
            >
              <Trash2 className="h-4 w-4" />
              Remove Selected Slot
            </button>
          </div>

          <p className="text-[10px] text-muted-foreground">Place series number on your ticket (you can add multiple boxes)</p>
        </div>

        <div className="shrink-0 bg-border h-[1px] w-full" />

        <div className="space-y-3">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Series Config</div>

          <div className="space-y-1.5">
            <div className="text-xs text-foreground">Starting Series</div>
            <input
              defaultValue="A001"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm h-8 text-sm bg-background font-mono"
            />
            <p className="text-[10px] text-muted-foreground">Supports spaces (e.g., A 001, B 0001)</p>
          </div>

          <div className="space-y-1.5">
            <div className="text-xs text-foreground">Total Pages</div>
            <input
              type="number"
              defaultValue={5}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm h-8 text-sm bg-background"
            />
            <p className="text-[10px] text-primary font-medium">20 tickets total (4 per page)</p>
          </div>

          <div className="p-2 bg-muted/50 rounded border border-border">
            <p className="text-[10px] text-muted-foreground mb-1">Series Range</p>
            <p className="text-xs font-mono font-medium text-foreground">A001 → A020</p>
          </div>
        </div>

        <div className="shrink-0 bg-border h-[1px] w-full" />

        <div className="space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Output</div>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-9 rounded-md px-3 bg-primary text-primary-foreground hover:bg-primary/90 w-full"
          >
            Generate Output
          </button>
        </div>
      </div>

      <div className="p-3 border-t border-border bg-muted/30">
        <div className="text-[10px] text-muted-foreground text-center space-y-1">
          <p>1. Position series slot on A4</p>
          <p>2. Set starting series & pages</p>
          <p>3. Generate → View A4 output</p>
        </div>
      </div>
    </div>
  );
};
