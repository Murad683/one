import { getMailMode } from '../utils/notices';
import { isMailConfigured } from '../services/mail.service';
import { runNotices, sendSamples } from '../services/notice.service';

// Manual runs inside the API container:
//   node dist/jobs/notices.js --dry-run            report who would get a mail, sends nothing
//   node dist/jobs/notices.js --run                one real pass now (needs MAIL_MODE=on), any hour
//   node dist/jobs/notices.js --test-to <address>  the 3 mail texts with sample data, to ONE address
// The hourly schedule lives in jobs/retention.ts.
const main = async (): Promise<number> => {
  const [flag, value] = process.argv.slice(2);

  if (flag === '--dry-run') {
    const result = await runNotices({ act: false, ignoreSendingHours: true });
    console.log(JSON.stringify(result, null, 2));
    return 0;
  }
  if (flag === '--run') {
    if (getMailMode() !== 'on') {
      console.error('Refusing: MAIL_MODE is not "on" (or the retention rule is off).');
      return 1;
    }
    const result = await runNotices({ act: true, ignoreSendingHours: true });
    console.log(JSON.stringify(result, null, 2));
    return 0;
  }
  if (flag === '--test-to') {
    if (!value || !/^\S+@\S+$/.test(value)) {
      console.error('Usage: node dist/jobs/notices.js --test-to <address>');
      return 1;
    }
    if (!isMailConfigured()) {
      console.error('Refusing: RESEND_API_KEY is not set.');
      return 1;
    }
    const sent = await sendSamples(value);
    console.log(`Sample mails sent to ${value}: ${sent.join(', ')}`);
    return 0;
  }
  console.error('Usage: node dist/jobs/notices.js --dry-run | --run | --test-to <address>');
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
