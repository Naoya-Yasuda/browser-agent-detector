export type DeployEnv = 'local' | 'dev';

function readEnv(key: string) {
  return process.env[key]?.trim();
}

export function requireEnvVar(key: string) {
  const value = readEnv(key);
  if (!value) {
    throw new Error(`[runtime-env] Missing required environment variable: ${key}`);
  }
  return value;
}

export function getDeployEnv(): DeployEnv {
  const raw = readEnv('DEPLOY_ENV');
  if (raw === 'local' || raw === 'dev') {
    return raw;
  }
  throw new Error('[runtime-env] DEPLOY_ENV must be set to "local" or "dev"');
}

export function getApiBaseUrl() {
  getDeployEnv();
  const override = readEnv('API_BASE_URL');
  if (override) {
    return override;
  }
  return requireEnvVar('API_URL');
}
