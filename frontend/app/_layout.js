import { Stack } from "expo-router";
import { useEffect } from "react";
import { initDatabase } from '../database/db';
import { scheduleDailyNotifications } from '../utils/notifications';

export default function RootLayout() {
  useEffect(() => {
    initDatabase();
    scheduleDailyNotifications(); // Schedule 3x daily
  }, []);

  return (
    <Stack>
      <Stack.Screen
        name="(tabs)"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="details"
        options={{ title: "Details" }}
      />
      <Stack.Screen
        name="record-mood"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}