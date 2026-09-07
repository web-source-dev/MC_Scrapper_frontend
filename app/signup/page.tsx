import { SignupScreen } from "@/components/SignupScreen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign up",
};

export default function SignupPage() {
  return <SignupScreen />;
}
