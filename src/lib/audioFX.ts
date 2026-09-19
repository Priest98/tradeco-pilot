let context: AudioContext | undefined;
let enabled = false;
let lastAlert = 0;

export async function enableAudio(value: boolean): Promise<void> {
  enabled = value;
  if (!value) { await context?.suspend(); return; }
  context ??= new AudioContext();
  await context.resume();
}

export function playAlert(kind: "anomaly" | "emergency" | "dossier"): void {
  if (!enabled || !context || context.state !== "running" || Date.now() - lastAlert < 500) return;
  lastAlert = Date.now();
  const notes = kind === "emergency" ? [880, 440, 880] : kind === "anomaly" ? [1200, 1800] : [660];
  notes.forEach((frequency, index) => {
    const oscillator = context!.createOscillator();
    const gain = context!.createGain();
    const start = context!.currentTime + index * 0.15;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.type = kind === "emergency" ? "square" : "sine";
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.035, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.12);
    oscillator.connect(gain).connect(context!.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.13);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  });
}
