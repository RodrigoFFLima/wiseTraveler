import Constants from 'expo-constants';
import PostHog from 'posthog-react-native';

const extra = Constants.expoConfig?.extra;
const projectToken = extra?.POSTHOG_PROJECT_TOKEN;
const host = extra?.POSTHOG_HOST;
const isConfigured = Boolean(projectToken && host);

if (__DEV__ && !projectToken) {
  throw new Error(
    'POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once POSTHOG_PROJECT_TOKEN is configured',
  );
}

if (__DEV__ && !host) {
  throw new Error(
    'POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once POSTHOG_HOST is configured',
  );
}

export const posthog = isConfigured
  ? new PostHog(projectToken, {
      host,
      captureAppLifecycleEvents: true,
    })
  : null;
