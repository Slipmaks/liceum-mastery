import type { Metadata } from "next";
import { TestScreen } from "./test-screen";

export const metadata: Metadata = { title: "Тест · прототип" };

export default function Page() {
  return <TestScreen />;
}
