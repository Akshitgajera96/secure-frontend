import React from 'react';

export const Toolbar = () => {
  return (
    <div className="w-80 bg-card border-l border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Slot Properties</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Style your series slot</p>
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        <div className="flex gap-2">
          <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background md:text-sm items-center gap-3">
            <div className="w-10 h-6 rounded" style={{ background: '#10b981' }} />
            <div className="text-xs font-mono text-foreground">#10b981</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <div className="text-[10px] text-muted-foreground">Border Width</div>
            <input
              type="number"
              defaultValue={0}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background md:text-sm h-7 text-xs"
            />
          </div>
          <div className="space-y-1">
            <div className="text-[10px] text-muted-foreground">Border Radius</div>
            <input
              type="number"
              defaultValue={4}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background md:text-sm h-7 text-xs"
            />
          </div>
        </div>

        <div className="shrink-0 bg-border h-[1px] w-full" />

        <div className="space-y-3">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Padding (px)</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <div className="text-[10px] text-muted-foreground">Top</div>
              <input
                type="number"
                defaultValue={4}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background md:text-sm h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <div className="text-[10px] text-muted-foreground">Bottom</div>
              <input
                type="number"
                defaultValue={4}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background md:text-sm h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <div className="text-[10px] text-muted-foreground">Left</div>
              <input
                type="number"
                defaultValue={8}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background md:text-sm h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <div className="text-[10px] text-muted-foreground">Right</div>
              <input
                type="number"
                defaultValue={8}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background md:text-sm h-7 text-xs"
              />
            </div>
          </div>
        </div>

        <div className="shrink-0 bg-border h-[1px] w-full" />

        <div className="space-y-3">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Transform</div>
          <div className="space-y-1.5">
            <div className="text-xs text-foreground">Rotation (deg)</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 rounded bg-muted" style={{ position: 'relative' }}>
                <div className="h-2 rounded" style={{ width: '60%', background: '#10b981' }} />
                <div
                  style={{
                    position: 'absolute',
                    left: '60%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 18,
                    height: 18,
                    borderRadius: 999,
                    background: '#0b1220',
                    border: '2px solid #10b981',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <input
                type="number"
                defaultValue={0}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background md:text-sm w-16 h-7 text-xs"
              />
            </div>
          </div>
        </div>

        <div className="shrink-0 bg-border h-[1px] w-full" />

        <div className="space-y-3">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Position &amp; Size (%)</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <div className="text-[10px] text-muted-foreground">X Position</div>
              <input
                type="number"
                defaultValue={60}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background md:text-sm h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <div className="text-[10px] text-muted-foreground">Y Position</div>
              <input
                type="number"
                defaultValue={46}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background md:text-sm h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <div className="text-[10px] text-muted-foreground">Width</div>
              <input
                type="number"
                defaultValue={20}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background md:text-sm h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <div className="text-[10px] text-muted-foreground">Height</div>
              <input
                type="number"
                defaultValue={8}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background md:text-sm h-7 text-xs"
              />
            </div>
          </div>
        </div>

        <div className="shrink-0 bg-border h-[1px] w-full" />

        <div className="space-y-3">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Typography</div>

          <div className="space-y-1.5">
            <div className="text-xs text-foreground">Font Family</div>
            <select className="w-full h-8 px-2 rounded border border-input bg-background text-sm">
              <option value="Arial">Arial</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <div className="text-xs text-foreground">Text Color</div>
            <div className="flex gap-2">
              <input
                type="color"
                defaultValue="#000000"
                className="w-10 h-8 p-0.5 cursor-pointer rounded-md border border-input bg-background"
              />
              <input
                type="text"
                defaultValue="#000000"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background md:text-sm flex-1 h-8 text-xs font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="text-xs text-foreground">Text Alignment</div>
            <div className="flex gap-1">
              <button
                type="button"
                className="flex-1 h-8 rounded border text-xs capitalize transition-colors bg-background border-input hover:bg-muted"
              >
                Left
              </button>
              <button
                type="button"
                className="flex-1 h-8 rounded border text-xs capitalize transition-colors bg-primary text-primary-foreground border-primary"
              >
                Center
              </button>
              <button
                type="button"
                className="flex-1 h-8 rounded border text-xs capitalize transition-colors bg-background border-input hover:bg-muted"
              >
                Right
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
