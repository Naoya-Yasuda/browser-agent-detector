interface ServiceAccountKey {
  project_id?: string;
  recaptcha_site_key?: string;
  [key: string]: any;
}

let cachedKeyData: ServiceAccountKey | null | undefined;

function getEnvValue(key: string): string {
  return process.env[key]?.trim() ?? '';
}

function loadServiceAccount(): ServiceAccountKey | null {
  if (cachedKeyData !== undefined) {
    return cachedKeyData ?? null;
  }

  const envJson = getEnvValue('GOOGLE_APPLICATION_CREDENTIALS_JSON');
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

  cachedKeyData = null;
  return null;
}

export function getRecaptchaSiteKeyFromServer(): string {
  const directEnv =
    getEnvValue('RECAPTCHA_SITE_KEY') ||
    getEnvValue('RECAPTCHA_ENTERPRISE_SITE_KEY') ||
    getEnvValue('NEXT_PUBLIC_RECAPTCHA_SITE_KEY');
  if (directEnv) {
    return directEnv;
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
  const options: { scopes: string[]; credentials?: ServiceAccountKey } = {
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  };

  const keyData = loadServiceAccount();
  if (keyData) {
    options.credentials = keyData;
  }

  return options;
}

export function getServiceAccountKeyPath(): string | null {
  // Edgeではファイルシステムを使わないため常にnull
  return null;
}
