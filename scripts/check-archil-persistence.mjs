#!/usr/bin/env node
/**
 * Persistence check for the Archil disk.
 *
 * Writes a unique line into a fresh subdirectory in one exec, then reads it
 * back in a second, separate exec. Exits non-zero when ARCHIL_API_KEY is
 * missing or when the second exec does not return what the first wrote.
 *
 *   npm run archil:check
 *
 * Uses ARCHIL_DISK_ID when set, otherwise reuses or creates the project disk.
 * The disk's one-time mount token is never printed.
 */
import { randomUUID } from 'node:crypto';
import { DEFAULT_DISK_NAME, getOrCreateDisk, region } from '../server/archil-disk.mjs';

/** Quote a value for a POSIX shell command. */
function shellQuote(value) {
  return `'${String(value).replaceAll("'", `'\\''`)}'`;
}

function fail(message, details = '') {
  console.error(`FAIL: ${message}`);
  if (details.trim()) console.error(details.trim());
  process.exitCode = 1;
}

async function main() {
  if (!process.env.ARCHIL_API_KEY?.trim()) {
    fail(
      'ARCHIL_API_KEY is not set.',
      'Add a key-... API key from https://console.archil.com/api-keys to .env (see .env.example), then rerun `npm run archil:check`.',
    );
    return;
  }

  const disk = await getOrCreateDisk(DEFAULT_DISK_NAME);
  console.log(`Disk: ${disk.name} (${disk.id})`);
  console.log(`Region: ${region()}`);

  // A fresh per-job directory: shared mounts claim new directories dynamically,
  // so writing into one avoids "Read-only file system".
  const directory = `runs/check-${randomUUID().slice(0, 8)}`;
  const line = `archil-persistence-check ${new Date().toISOString()} ${randomUUID()}`;

  const write = await disk.exec(
    `mkdir -p ${shellQuote(directory)} && printf '%s\\n' ${shellQuote(line)} > ${shellQuote(`${directory}/probe.txt`)}`,
  );
  console.log(`Write exec: exit ${write.exitCode} (${directory}/probe.txt)`);
  if (write.exitCode !== 0) {
    fail('the write exec failed.', write.stderr);
    return;
  }

  const read = await disk.exec(`cat ${shellQuote(`${directory}/probe.txt`)}`);
  console.log(`Read exec: exit ${read.exitCode}`);
  if (read.exitCode !== 0) {
    fail('the read exec failed.', read.stderr);
    return;
  }

  const readBack = read.stdout.trim();
  console.log(`Read back: ${readBack}`);
  if (readBack !== line) {
    fail(`read-back did not match. wrote ${JSON.stringify(line)}, read ${JSON.stringify(readBack)}`);
    return;
  }

  console.log(`OK: ${line} survived between two separate execs.`);
  console.log(`ARCHIL_DISK_ID=${disk.id}`);
}

main().catch((error) => {
  fail(error?.message ?? String(error), error?.stack ?? '');
});
