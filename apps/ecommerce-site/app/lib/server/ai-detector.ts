import { getDeployEnv, requireEnvVar } from '../runtime-env';

function normalize(value?: string | null) {
  return value?.trim() || '';
}

export function getAIDetectorServerConfig() {
  getDeployEnv();
  const endpoint =
    normalize(process.env.AI_DETECTOR_ENDPOINT_URL) ||
    normalize(process.env.AI_DETECTOR_ENDPOINT) ||
    normalize(requireEnvVar('AI_DETECTOR_ENDPOINT_URL'));

  const apiKey =
    normalize(process.env.AI_DETECTOR_API_KEY) ||
    normalize(requireEnvVar('AI_DETECTOR_API_KEY'));

  return {
    endpoint,
    apiKey,
  };
}
