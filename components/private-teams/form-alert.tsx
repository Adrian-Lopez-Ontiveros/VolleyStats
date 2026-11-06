import { Alert, AlertDescription } from "@/components/ui/alert";
import type { PrivateActionState } from "@/lib/actions/private-teams";
export function AjudgeAlert({ state }: { state: PrivateActionState }) {
  if (!state.error && !state.success) return null;
  return <Alert variant={state.error ? "destructive" : "success"}><AlertDescription>{state.error || state.success}</AlertDescription></Alert>;
}
