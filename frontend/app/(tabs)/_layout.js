import { Tabs } from "expo-router";
import TabBar from "../../components/TabBar";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={props => <TabBar {...props} />}
      screenOptions={{
        animation: 'fade',
        headerShown: false, // Hide header globally for tabs
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "首頁",
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "歷史",
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "設定",
        }}
      />
    </Tabs>
  );
}
