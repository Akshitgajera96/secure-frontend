import React from 'react';

export const CanvasArea = () => {
  return (
    <div className="flex-1 min-h-0 bg-muted/30">
      <div className="w-full h-full flex justify-center overflow-auto">
        <div className="flex justify-center p-6">
          <div
            className="preview-canvas relative bg-white shadow-[0_10px_30px_rgba(0,0,0,0.18)] ring-1 ring-black/10 text-black svg-doc-page overflow-visible"
            style={{ width: 595.28, height: 841.89, margin: '24px auto' }}
          >
            <div className="absolute left-0 top-0 w-full h-full">
              <img
                src="/car.svg"
                alt="Artwork"
                style={{
                  position: 'absolute',
                  left: 20,
                  top: 250,
                  width: 555,
                  height: 430,
                  objectFit: 'contain',
                }}
                onError={(e) => {
                  e.currentTarget.src = '/placeholder.svg';
                }}
              />

              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 290,
                  width: 595.28,
                  height: 260,
                  border: '1px dashed #2563eb',
                  boxSizing: 'border-box',
                }}
              />

              <div
                style={{
                  position: 'absolute',
                  left: 22,
                  top: 278,
                  background: '#2563eb',
                  color: '#ffffff',
                  fontSize: 10,
                  lineHeight: '12px',
                  padding: '2px 6px',
                  borderRadius: 4,
                }}
              >
                Ticket Area (drag to adjust)
              </div>

              <div
                style={{
                  position: 'absolute',
                  left: 336,
                  top: 450,
                  width: 135,
                  height: 72,
                  border: '2px solid #10b981',
                  borderRadius: 2,
                  boxSizing: 'border-box',
                }}
              />

              {[
                { x: 336, y: 450 },
                { x: 336 + 135, y: 450 },
                { x: 336, y: 450 + 72 },
                { x: 336 + 135, y: 450 + 72 },
              ].map((p, idx) => (
                <div
                  key={idx}
                  style={{
                    position: 'absolute',
                    left: p.x - 5,
                    top: p.y - 5,
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: '#10b981',
                    border: '2px solid #0b1220',
                    boxSizing: 'border-box',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
