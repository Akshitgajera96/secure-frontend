import { describe, expect, it } from 'vitest';
import { runTicketRegionGoldenSuite } from '@/utils/goldenTicketRegionSuite';

describe('Golden Ticket Region Regression Suite (10 PDFs)', () => {
  it('passes all golden bbox cases deterministically', async () => {
    const res = await runTicketRegionGoldenSuite();
    if (!res.ok) {
      const fail = res as Extract<typeof res, { ok: false }>;
      const message = fail.mismatches
        .map((m) => {
          const e = m.expected;
          const a = m.actual;
          return [
            `Case ${m.caseId}: ${m.inputPdfDescription}`,
            `  expected %: x=${e.xPercent}, y=${e.yPercent}, w=${e.widthPercent}, h=${e.heightPercent}`,
            `  actual   %: x=${a.xPercent}, y=${a.yPercent}, w=${a.widthPercent}, h=${a.heightPercent}`,
          ].join('\n');
        })
        .join('\n');

      throw new Error(`Golden suite failed.\n${message}`);
    }

    expect(res.ok).toBe(true);
  });
});
