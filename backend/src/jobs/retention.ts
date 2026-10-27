import { getRetentionMode } from '../utils/retention';
import { runRetention } from '../services/retention.service';

const HOUR_MS = 60 * 60 * 1000;
const FIRST_RUN_DELAY_MS = 2 * 60 * 1000;

let running = false;

const tick = async (): Promise<void> => {
  const mode = getRetentionMode();
  if (mode === 'off' || running) return;
  running = true;
  try {
    await runRetention({ stamp: true, act: mode === 'on' });
  } catch (err) {
    console.error('[Retention] run failed:', err);
  } finally {
    running = false;
  }
};

/** Runs the retention rule hourly inside the API (first run shortly after boot). */
export const startRetentionScheduler = (): void => {
  console.log(`[Retention] mode: ${getRetentionMode()}`);
  setTimeout(() => void tick(), FIRST_RUN_DELAY_MS).unref();
  setInterval(() => void tick(), HOUR_MS).unref();
};

// Manual run inside the container:
//   node dist/jobs/retention.js --dry-run   report only, writes nothing
//   node dist/jobs/retention.js --run       one real pass (only when RETENTION_MODE=on)
if (require.main === module) {
  const arg = process.argv[2];
  const main = async (): Promise<number> => {
    if (arg === '--dry-run') {
      const result = await runRetention({ stamp: false, act: false });
      console.log(JSON.stringify(result, null, 2));
      return 0;
    }
    if (arg === '--run') {
      if (getRetentionMode() !== 'on') {
        console.error('Refusing: RETENTION_MODE is not "on".');
        return 1;
      }
      const result = await runRetention({ stamp: true, act: true });
      console.log(JSON.stringify(result, null, 2));
      return 0;
    }
    console.error('Usage: node dist/jobs/retention.js --dry-run | --run');
    return 1;
  };
  main()
    .then(async (code) => {
      const { default: prisma } = await import('../utils/prisma');
      await prisma.$disconnect();
      process.exit(code);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
