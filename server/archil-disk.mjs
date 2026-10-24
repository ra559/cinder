/**
 * Server-side access to this project's Archil disk.
 *
 * The playground itself stays a standalone browser app: nothing in `app.js`
 * imports this file, and the API key never reaches a browser bundle. This
 * module is for server-side tooling whose files must outlive a single run
 * (exported projects, snapshots) and for the persistence check in
 * `scripts/check-archil-persistence.mjs`.
 *
 * Configuration comes from the environment only:
 *   ARCHIL_API_KEY  API key starting with `key-` (region-scoped)
 *   ARCHIL_REGION   defaults to `aws-us-east-1`
 *   ARCHIL_DISK_ID  disk id (`dsk-...`) holding the playground data
 *
 * Exec runs mount the disk at `/mnt/data`, which is also the working
 * directory. Every exec gets a fresh container: files on the disk persist,
 * container state does not. Prefer writing into a fresh per-job subdirectory
 * (shared mounts claim new directories dynamically) to avoid
 * "Read-only file system" errors.
 */
import * as archil from 'disk';

export const DEFAULT_REGION = 'aws-us-east-1';

/** Disk used by the persistence check when ARCHIL_DISK_ID is not set. */
export const DEFAULT_DISK_NAME = 'code-playground-data';

let configuredKey = null;

export function region() {
  return process.env.ARCHIL_REGION?.trim() || DEFAULT_REGION;
}

function readApiKey() {
  const apiKey = process.env.ARCHIL_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      'ARCHIL_API_KEY is not set: put your key-... API key in .env (see .env.example).',
    );
  }
  if (!apiKey.startsWith('key-')) {
    throw new Error(
      'ARCHIL_API_KEY must be an API key starting with "key-"; disk/mount tokens are a different credential and the API rejects them.',
    );
  }
  return apiKey;
}

/** Configure the SDK from the environment; safe to call more than once. */
export function configureArchil() {
  const apiKey = readApiKey();
  if (configuredKey !== apiKey) {
    archil.configure({ apiKey, region: region() });
    configuredKey = apiKey;
  }
  return { region: region() };
}

/** Disk id from ARCHIL_DISK_ID, or a clear error explaining what is missing. */
export function getDiskId() {
  const diskId = process.env.ARCHIL_DISK_ID?.trim();
  if (!diskId) {
    throw new Error(
      'ARCHIL_DISK_ID is not set: add the disk id (dsk-...) to .env, or run `npm run archil:check` to reuse/create the project disk.',
    );
  }
  return diskId;
}

/** Fetch the configured disk. */
export async function getDisk(diskId = getDiskId()) {
  configureArchil();
  return archil.getDisk(diskId);
}

/** Create a disk. The one-time mount token is dropped: exec and object reads need only the API key. */
export async function createDisk(name = DEFAULT_DISK_NAME) {
  configureArchil();
  const { disk } = await archil.createDisk({ name });
  return disk;
}

/** The disk named by ARCHIL_DISK_ID, else an existing disk of `name`, else a new one. */
export async function getOrCreateDisk(name = DEFAULT_DISK_NAME) {
  if (process.env.ARCHIL_DISK_ID?.trim()) return getDisk();
  configureArchil();
  const existing = (await archil.listDisks()).find((disk) => disk.name === name);
  return existing ?? createDisk(name);
}

/** Run a shell command on the disk (cwd `/mnt/data`); returns { stdout, stderr, exitCode, timing }. */
export async function runCommand(command, { diskId } = {}) {
  const disk = await getDisk(diskId);
  return disk.exec(command);
}

/** Write a UTF-8 file at `key` on the disk (object-style write). */
export async function writeFile(key, contents, { diskId } = {}) {
  const disk = await getDisk(diskId);
  return disk.putObject(key, contents);
}

/** Read a file at `key` on the disk as UTF-8 text. */
export async function readFile(key, { diskId } = {}) {
  const disk = await getDisk(diskId);
  const bytes = await disk.getObject(key);
  return new TextDecoder('utf-8').decode(bytes);
}
