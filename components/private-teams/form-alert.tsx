import { Alert, AlertDescription } from "@/components/ui/alert";
import type { PrivateActionState } from "@/lib/actions/private-teams";
export function AjudgeAlert({ state }: { state: PrivateActionState }) {
  if (!state.error && !state.success) return null;
  return <Alert variant={state.error ? "destructive" : "success"}>
    <AlertDescription className="break-words">
      <p>{state.error || state.success}</p>
      {state.errorDetail ? <details className="mt-2 text-xs">
        <summary className="cursor-pointer font-medium">Detalle técnico para administradores</summary>
        <code className="mt-1.5 block whitespace-pre-wrap">{state.errorDetail}</code>
      </details> : null}
    </AlertDescription>
  </Alert>;
}
