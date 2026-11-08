import { redirect } from "next/navigation";
import { loginRequired } from "@/lib/session";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  if (!loginRequired()) redirect("/readiness");
  return <LoginForm />;
}
