// Simple Node script to validate multi-slot series ordering logic
// Usage: node scripts/checkSeriesOrder.js

function incrementSeries(value, increment) {
  const match = value.match(/^(.*?)(\d+)$/);
  if (match) {
    const [, prefix, numStr] = match;
    const num = parseInt(numStr, 10);
    const endNum = num + increment;
    return `${prefix}${endNum.toString().padStart(numStr.length, '0')}`;
  }
  return value;
}

function generateSeriesForSlot(startingSeries, pages, seriesIncrement = 1) {
  const perTicket = [];
  const totalTickets = pages * 4;
  for (let globalIdx = 0; globalIdx < totalTickets; globalIdx++) {
    const seriesValue = incrementSeries(startingSeries, globalIdx * seriesIncrement);
    perTicket.push(seriesValue);
  }
  return perTicket;
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg}: expected ${expected}, got ${actual}`);
  }
}

function main() {
  const pages = 3;
  const slotA = generateSeriesForSlot('A001', pages, 1);
  const slotB = generateSeriesForSlot('v08', pages, 1);

  // Page/ticket index helpers
  const idx = (pageIdx, ticketIdx) => pageIdx * 4 + ticketIdx;

  // Page1 top ticket
  assertEqual(slotA[idx(0, 0)], 'A001', 'SlotA page1 ticket1');
  assertEqual(slotB[idx(0, 0)], 'v08', 'SlotB page1 ticket1');

  // Page2 top ticket (globalIdx = 4)
  assertEqual(slotA[idx(1, 0)], 'A005', 'SlotA page2 ticket1');
  assertEqual(slotB[idx(1, 0)], 'v12', 'SlotB page2 ticket1');

  // Last ticket of page3 (globalIdx = 11)
  assertEqual(slotA[idx(2, 3)], 'A012', 'SlotA page3 ticket4');
  assertEqual(slotB[idx(2, 3)], 'v19', 'SlotB page3 ticket4');

  console.log('checkSeriesOrder: OK');
}

if (require.main === module) {
  main();
}
