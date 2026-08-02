import Constants from 'expo-constants';
import PostHog from 'posthog-react-native';

const extra = Constants.expoConfig?.extra;
const projectToken = extra?.POSTHOG_PROJECT_TOKEN;
const host = extra?.POSTHOG_HOST;
const isConfigured = Boolean(projectToken && host);

if (__DEV__ && !isConfigured) {
  console.warn(
    'PostHog desativado: configure POSTHOG_PROJECT_TOKEN e POSTHOG_HOST para enviar analytics.',
  );
}

export const posthog = isConfigured
  ? new PostHog(projectToken, {
      host,
      captureAppLifecycleEvents: true,
    })
  : null;
