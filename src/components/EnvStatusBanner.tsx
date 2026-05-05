import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { getEnvStatus } from "@/config/env";

/**
 * Render a banner when required Vercel-managed env variables are missing.
 * The list of missing names is shown verbatim so the operator knows
 * exactly what to add in Vercel → Project Settings → Environment Variables.
 */
const EnvStatusBanner: React.FC = () => {
  const { ok, missing, warnings } = getEnvStatus();
  if (ok && warnings.length === 0) return null;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Missing environment configuration</AlertTitle>
      <AlertDescription>
        {missing.length > 0 && (
          <p>
            Please set the following variables in Vercel: <code>{missing.join(", ")}</code>.
            Deployments, contract interactions, and wallet analytics are disabled until
            configuration is complete.
          </p>
        )}
        {warnings.map((w) => (
          <p key={w} className="mt-1">{w}</p>
        ))}
      </AlertDescription>
    </Alert>
  );
};

export default EnvStatusBanner;
