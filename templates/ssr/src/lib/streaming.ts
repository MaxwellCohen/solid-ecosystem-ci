/** Artificial delay — makes SSR streaming visible in the browser. */
export function delay<T>(value: T, ms: number): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export type PanelData = {
  label: string;
  detail: string;
  ms: number;
};

export type TimedPanelData = PanelData & { resolvedAt: string };

/** Out-of-order demo: A is slow (frontier), B is fast, C is medium. */
export const outOfOrderPanels: PanelData[] = [
  {
    label: 'Slot 1 · A',
    detail: 'Slow frontier — resolves last (3s)',
    ms: 3000,
  },
  {
    label: 'Slot 2 · B',
    detail: 'Fast — resolves first (0.5s) but waits for A in sequential mode',
    ms: 500,
  },
  {
    label: 'Slot 3 · C',
    detail: 'Medium — resolves second (1.5s)',
    ms: 1500,
  },
];

export async function loadTimedPanel(panel: PanelData): Promise<TimedPanelData> {
  await delay(undefined, panel.ms);
  return {
    ...panel,
    resolvedAt: new Date().toISOString(),
  };
}

export async function* tokenStream(words: string[], ms = 700) {
  let text = '';
  for (const word of words) {
    await delay(word, ms);
    text = text ? `${text} ${word}` : word;
    yield text;
  }
}

export function fetchMessage(fail: boolean): Promise<{ message: string }> {
  return delay(undefined, 600).then(() => {
    if (fail) throw new Error('Simulated fetch failure during streaming');
    return { message: 'Recovered — content streamed successfully.' };
  });
}
