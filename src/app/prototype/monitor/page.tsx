import type { Metadata } from "next";
import { Monitor } from "./monitor";

export const metadata: Metadata = { title: "Моніторинг · прототип" };

export default function Page() {
  return <Monitor />;
}
