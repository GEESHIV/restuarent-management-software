let audioContext: AudioContext | null = null;

export async function enableAlertSound() {
  if (!audioContext) audioContext = new AudioContext();
  await audioContext.resume();
}

export function playAlertSound() {
  const context = audioContext;
  if (!context || context.state !== "running") return;
  const now = context.currentTime;
  [880, 660].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = frequency;
    oscillator.type = "sine";
    gain.gain.setValueAtTime(0.0001, now + index * 0.16);
    gain.gain.exponentialRampToValueAtTime(0.18, now + index * 0.16 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.16 + 0.14);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now + index * 0.16);
    oscillator.stop(now + index * 0.16 + 0.15);
  });
}
