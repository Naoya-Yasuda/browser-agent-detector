import fs from 'fs';
import path from 'path';

interface ServiceAccountKey {
  project_id?: string;
  recaptcha_site_key?: string;
  [key: string]: any;
}

type EnvCache = Record<string, string>;

let cachedKeyData: ServiceAccountKey | null | undefined = undefined;
let cachedKeyPath: string | null | undefined = undefined;
const parsedEnvFiles: Record<string, EnvCache | null> = {};
const envValueCache: Record<string, string | null> = {};

const ENV_FILE_CANDIDATES = [
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../.env.local'),
  path.resolve(process.cwd(), '../.env'),
  path.resolve(process.cwd(), '../../.env.local'),
  path.resolve(process.cwd(), '../../.env'),
];

function loadEnvFile(filePath: string): EnvCache | null {
  if (parsedEnvFiles[filePath] !== undefined) {
    return parsedEnvFiles[filePath];
  }

  if (!fs.existsSync(filePath)) {
    parsedEnvFiles[filePath] = null;
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const entries: EnvCache = {};

    content.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        return;
      }

      const [key, ...rest] = trimmed.split('=');
      if (!key) {
        return;
      }

      const rawValue = rest.join('=').trim();
      const unquoted = rawValue.replace(/^['"]|['"]$/g, '');
      entries[key.trim()] = unquoted;
    });

    parsedEnvFiles[filePath] = entries;
    return entries;
  } catch (error) {
    console.error(`Failed to parse env file (${filePath}):`, error);
    parsedEnvFiles[filePath] = null;
    return null;
  }
}

function getEnvValue(key: string): string {
  const direct = process.env[key]?.trim();
  if (direct) {
    return direct;
  }

  if (envValueCache[key] !== undefined) {
    return envValueCache[key] ?? '';
  }

  for (const filePath of ENV_FILE_CANDIDATES) {
    const envData = loadEnvFile(filePath);
    if (envData && envData[key]?.trim()) {
      const value = envData[key].trim();
      envValueCache[key] = value;
      return value;
    }
  }

  envValueCache[key] = null;
  return '';
}

function resolveKeyPath(): string | null {
  if (cachedKeyPath !== undefined) {
    return cachedKeyPath;
  }

  const explicitPath = getEnvValue('GOOGLE_APPLICATION_CREDENTIALS');
  if (explicitPath) {
    cachedKeyPath = explicitPath;
    return cachedKeyPath;
  }

  const candidatePaths = [
    path.resolve(process.cwd(), 'gcloud-key.json'),
    path.resolve(process.cwd(), '../gcloud-key.json'),
  ];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      cachedKeyPath = candidate;
      return cachedKeyPath;
    }
  }

  cachedKeyPath = null;
  return cachedKeyPath;
}

function loadServiceAccount(): ServiceAccountKey | null {
  if (cachedKeyData !== undefined) {
    return cachedKeyData ?? null;
  }

  const envJson =
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim() ||
    getEnvValue('GOOGLE_APPLICATION_CREDENTIALS_JSON');
  if (envJson) {
    try {
      cachedKeyData = JSON.parse(envJson) as ServiceAccountKey;
      return cachedKeyData;
    } catch (error) {
      console.error('Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:', error);
      cachedKeyData = null;
      return null;
    }
  }

  const keyPath = resolveKeyPath();
  if (!keyPath) {
    cachedKeyData = null;
    return null;
  }

  try {
    const raw = fs.readFileSync(keyPath, 'utf-8');
    cachedKeyData = JSON.parse(raw) as ServiceAccountKey;
  } catch (error) {
    console.error('Failed to read Google service account key:', error);
    cachedKeyData = null;
  }

  return cachedKeyData;
}

export function getRecaptchaSiteKeyFromServer(): string {
  const directEnv =
    getEnvValue('RECAPTCHA_SITE_KEY') ||
    getEnvValue('RECAPTCHA_ENTERPRISE_SITE_KEY') ||
    getEnvValue('NEXT_PUBLIC_RECAPTCHA_SITE_KEY');
  if (directEnv?.trim()) {
    return directEnv.trim();
  }

  const keyData = loadServiceAccount();
  const fromKey = typeof keyData?.recaptcha_site_key === 'string' ? keyData.recaptcha_site_key.trim() : '';
  return fromKey;
}

export function getGoogleCloudProjectId(): string {
  const projectFromEnv = getEnvValue('GOOGLE_CLOUD_PROJECT_ID');
  if (projectFromEnv) {
    return projectFromEnv;
  }

  const keyData = loadServiceAccount();
  return keyData?.project_id ?? '';
}

export function getGoogleAuthOptions() {
  const options: { scopes: string[]; keyFilename?: string; credentials?: ServiceAccountKey } = {
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  };

  const keyData = loadServiceAccount();
  if (keyData) {
    options.credentials = keyData;
    return options;
  }

  const keyPath = resolveKeyPath();
  if (keyPath) {
    options.keyFilename = keyPath;
  }

  return options;
}

export function getServiceAccountKeyPath(): string | null {
  return resolveKeyPath();
}
