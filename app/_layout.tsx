import { Stack } from "expo-router";
import {
  PostHogErrorBoundary,
  PostHogProvider,
} from "posthog-react-native";
import { posthog } from "../services/posthog";

function Navigation() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "Wise Traveler",
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return posthog ? (
    <PostHogProvider client={posthog}>
      <PostHogErrorBoundary>
        <Navigation />
      </PostHogErrorBoundary>
    </PostHogProvider>
  ) : (
    <Navigation />
  );
}
