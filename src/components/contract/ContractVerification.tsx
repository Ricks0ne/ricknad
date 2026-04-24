import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";
import {
  getVerificationRecord,
  refreshVerificationStatus,
  verifyContractOnBaseScan,
  type StoredVerification,
} from "@/utils/verification";
import {
  basescanCodeUrl,
  inferCompilerVersion,
  SOLC_VERSIONS,
  type PollResult,
} from "@/utils/basescanVerification";
import {
  countDirectImports,
  DEFAULT_OZ_VERSION,
  hasExternalImports,
} from "@/utils/solidityImports";
import { BASE_MAINNET } from "@/config/base";
import type { CompileSettings } from "@/types/blockchain";

interface ContractVerificationProps {
  contractAddress: string;
  contractName: string;
  sourceCode: string;
  abi: unknown[];
  /**
   * Settings captured when Ricknad compiled the contract. When present,
   * these pre-populate the verify form so the user doesn't have to
   * re-enter them (and can't accidentally cause a bytecode mismatch).
   */
  compileSettings?: CompileSettings;
  /** ABI-encoded constructor arguments captured at deploy time (no 0x prefix). */
  constructorArguments?: string;
}

const EVM_VERSIONS = [
  { label: "default (compiler default)", value: "default" },
  { label: "paris", value: "paris" },
  { label: "london", value: "london" },
  { label: "berlin", value: "berlin" },
  { label: "shanghai", value: "shanghai" },
  { label: "cancun", value: "cancun" },
];

const LICENSE_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 1, label: "No License (None)" },
  { value: 2, label: "The Unlicense" },
  { value: 3, label: "MIT" },
  { value: 4, label: "GNU GPLv2" },
  { value: 5, label: "GNU GPLv3" },
  { value: 6, label: "GNU LGPLv2.1" },
  { value: 7, label: "GNU LGPLv3" },
  { value: 8, label: "BSD-2-Clause" },
  { value: 9, label: "BSD-3-Clause" },
  { value: 10, label: "MPL-2.0" },
  { value: 11, label: "OSL-3.0" },
  { value: 12, label: "Apache-2.0" },
  { value: 13, label: "GNU AGPLv3" },
  { value: 14, label: "BSL 1.1" },
];

const inferLicenseType = (sourceCode: string): number => {
  const match = sourceCode.match(/SPDX-License-Identifier:\s*([^\s*\n\r]+)/);
  if (!match) return 1;
  const id = match[1].trim().toUpperCase();
  if (id === "MIT") return 3;
  if (id === "UNLICENSED" || id === "UNLICENSE") return 2;
  if (id === "GPL-2.0" || id === "GPL-2.0-ONLY" || id === "GPL-2.0-OR-LATER") return 4;
  if (id === "GPL-3.0" || id === "GPL-3.0-ONLY" || id === "GPL-3.0-OR-LATER") return 5;
  if (id === "LGPL-2.1" || id === "LGPL-2.1-ONLY" || id === "LGPL-2.1-OR-LATER") return 6;
  if (id === "LGPL-3.0" || id === "LGPL-3.0-ONLY" || id === "LGPL-3.0-OR-LATER") return 7;
  if (id === "BSD-2-CLAUSE") return 8;
  if (id === "BSD-3-CLAUSE") return 9;
  if (id === "MPL-2.0") return 10;
  if (id === "OSL-3.0") return 11;
  if (id === "APACHE-2.0") return 12;
  if (id === "AGPL-3.0" || id === "AGPL-3.0-ONLY" || id === "AGPL-3.0-OR-LATER") return 13;
  if (id === "BUSL-1.1") return 14;
  return 1;
};

const ContractVerification: React.FC<ContractVerificationProps> = ({
  contractAddress,
  contractName,
  sourceCode,
  compileSettings,
  constructorArguments: deployedConstructorArgs,
}) => {
  const [stored, setStored] = useState<StoredVerification | null>(() =>
    getVerificationRecord(contractAddress),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [liveMessage, setLiveMessage] = useState<string | null>(null);

  const [compilerVersion, setCompilerVersion] = useState(
    () => compileSettings?.compilerVersion ?? inferCompilerVersion(sourceCode),
  );
  const [optimizationUsed, setOptimizationUsed] = useState(
    compileSettings?.optimizerEnabled ?? true,
  );
  const [optimizerRuns, setOptimizerRuns] = useState(compileSettings?.optimizerRuns ?? 200);
  const [evmVersion, setEvmVersion] = useState(compileSettings?.evmVersion ?? "default");
  const [licenseType, setLicenseType] = useState<number>(
    () => compileSettings?.licenseType ?? inferLicenseType(sourceCode),
  );
  const [constructorArguments, setConstructorArguments] = useState(
    deployedConstructorArgs ?? "",
  );
  const [ozVersion, setOzVersion] = useState(
    compileSettings?.ozVersion ?? DEFAULT_OZ_VERSION,
  );
  const [fetchedImports, setFetchedImports] = useState<string[]>([]);

  const requiresStandardJson = useMemo(() => hasExternalImports(sourceCode), [sourceCode]);
  const importCounts = useMemo(() => countDirectImports(sourceCode), [sourceCode]);
  const settingsLocked = Boolean(compileSettings);

  useEffect(() => {
    setStored(getVerificationRecord(contractAddress));
  }, [contractAddress]);

  useEffect(() => {
    if (compileSettings) {
      setCompilerVersion(compileSettings.compilerVersion);
      setOptimizationUsed(compileSettings.optimizerEnabled);
      setOptimizerRuns(compileSettings.optimizerRuns);
      setEvmVersion(compileSettings.evmVersion ?? "default");
      if (typeof compileSettings.licenseType === "number") {
        setLicenseType(compileSettings.licenseType);
      }
      if (compileSettings.ozVersion) setOzVersion(compileSettings.ozVersion);
    } else {
      setCompilerVersion(inferCompilerVersion(sourceCode));
      setLicenseType(inferLicenseType(sourceCode));
    }
  }, [sourceCode, compileSettings]);

  useEffect(() => {
    if (typeof deployedConstructorArgs === "string") {
      setConstructorArguments(deployedConstructorArgs);
    }
  }, [deployedConstructorArgs]);

  const explorerUrl = useMemo(() => basescanCodeUrl(contractAddress), [contractAddress]);

  const canSubmit =
    sourceCode.trim().length > 0 &&
    contractName.trim().length > 0 &&
    !isSubmitting &&
    stored?.status !== "pending";

  const handleVerify = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setFetchedImports([]);
    setLiveMessage(
      requiresStandardJson ? "Resolving imports…" : "Submitting source to BaseScan…",
    );
    const onPoll = (result: PollResult) => {
      if (result.kind === "pending") setLiveMessage(result.message);
      if (result.kind === "failure") setLiveMessage(result.reason);
      if (result.kind === "success") setLiveMessage(result.message);
      if (result.kind === "error") setLiveMessage(result.message);
    };
    const onFetchImport = (path: string) => {
      setFetchedImports((prev) => (prev.includes(path) ? prev : [...prev, path]));
      setLiveMessage(`Fetching ${path}`);
    };
    try {
      await verifyContractOnBaseScan({
        contractAddress,
        contractName,
        sourceCode,
        compilerVersion,
        optimizationUsed,
        optimizerRuns,
        evmVersion: evmVersion === "default" ? undefined : evmVersion,
        licenseType,
        constructorArguments: constructorArguments.trim() || undefined,
        ozVersion: requiresStandardJson ? ozVersion : undefined,
        onPoll,
        onFetchImport,
      });
    } finally {
      setStored(getVerificationRecord(contractAddress));
      setIsSubmitting(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshVerificationStatus(contractAddress);
    } finally {
      setStored(getVerificationRecord(contractAddress));
      setIsRefreshing(false);
    }
  };

  const status = stored?.status ?? "unverified";
  const lastMessage = liveMessage ?? stored?.lastMessage ?? null;

  return (
    <Card className="mt-4 border-base-accent/20 overflow-hidden animate-fade-in">
      <CardHeader className="bg-gradient-to-r from-base-primary/10 to-base-primary/5">
        <CardTitle className="flex items-center text-base-primary">
          <ShieldCheck className="mr-2 h-5 w-5" />
          Verify Contract on BaseScan
        </CardTitle>
        <CardDescription>
          Publishes the source to BaseScan (Etherscan V2 · chainid {BASE_MAINNET.chainId}) and
          polls <code>checkverifystatus</code> until verification passes or fails.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {status === "success" ? (
          <div className="p-4 border rounded-lg bg-green-50 border-green-200 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-green-500 text-white flex items-center gap-1">
                <CheckCircle2 size={12} />
                Verified on BaseScan
              </Badge>
              {stored?.guid && (
                <span className="text-xs text-green-700 font-mono">GUID: {stored.guid}</span>
              )}
            </div>
            <p className="text-sm text-green-700">
              {stored?.lastMessage ?? "BaseScan confirmed the source code matches on-chain bytecode."}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(explorerUrl, "_blank")}
              >
                <ExternalLink size={14} className="mr-1" />
                View code on BaseScan
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <Loader2 size={14} className="mr-1 animate-spin" />
                ) : (
                  <RefreshCcw size={14} className="mr-1" />
                )}
                Re-check
              </Button>
            </div>
          </div>
        ) : status === "pending" ? (
          <div className="p-4 border rounded-lg bg-yellow-50 border-yellow-200 space-y-2">
            <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">
              Verification pending on BaseScan
            </Badge>
            {stored?.guid && (
              <p className="text-xs text-yellow-800 font-mono">GUID: {stored.guid}</p>
            )}
            <p className="text-sm text-yellow-800 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {lastMessage ?? "Polling BaseScan…"}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 size={14} className="mr-1 animate-spin" />
              ) : (
                <RefreshCcw size={14} className="mr-1" />
              )}
              Re-check now
            </Button>
          </div>
        ) : status === "failure" ? (
          <div className="p-4 border rounded-lg bg-red-50 border-red-200 space-y-2">
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertCircle size={12} />
              Verification failed
            </Badge>
            <p className="text-sm text-red-700">
              BaseScan rejected the submission with:
            </p>
            <pre className="text-xs bg-red-100 text-red-900 p-2 rounded whitespace-pre-wrap break-words">
              {stored?.lastMessage ?? "No response message returned."}
            </pre>
            <p className="text-xs text-red-700">
              Common causes: compiler version mismatch, optimizer runs mismatch, wrong constructor
              arguments, EVM version mismatch, or contract name differs from the source. Adjust the
              fields below and retry.
            </p>
          </div>
        ) : (
          <Alert className="bg-gradient-to-r from-base-primary/10 to-base-primary/5 border-base-primary/20">
            <AlertDescription>
              This contract is <strong>not yet verified</strong> on BaseScan. Verification is
              confirmed only after BaseScan returns <code>Pass - Verified</code> — nothing else marks
              the contract as verified in Ricknad.
            </AlertDescription>
          </Alert>
        )}

        {status !== "success" && settingsLocked && (
          <Alert className="bg-emerald-50 border-emerald-200">
            <AlertDescription className="text-emerald-900 space-y-1">
              <p className="font-semibold">
                Using compile settings captured at deployment time.
              </p>
              <p className="text-xs">
                Compiler: <code>{compileSettings?.compilerVersion}</code> · Optimizer:{" "}
                {compileSettings?.optimizerEnabled
                  ? `enabled (${compileSettings.optimizerRuns} runs)`
                  : "disabled"}
                {compileSettings?.evmVersion
                  ? ` · EVM version: ${compileSettings.evmVersion}`
                  : ""}
                {compileSettings?.ozVersion
                  ? ` · OpenZeppelin: ${compileSettings.ozVersion}`
                  : ""}
                {deployedConstructorArgs
                  ? ` · Constructor args: ${deployedConstructorArgs.length / 2} bytes`
                  : ""}
              </p>
              <p className="text-xs">
                These match what Ricknad used to compile the bytecode actually on-chain — don't
                change them unless you compiled the contract elsewhere.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {status !== "success" && requiresStandardJson && (
          <Alert className="bg-purple-50 border-purple-200">
            <AlertDescription className="text-purple-900 space-y-2">
              <p className="font-semibold">
                Detected {importCounts.external} external import
                {importCounts.external === 1 ? "" : "s"} (e.g. <code>@openzeppelin/…</code>).
              </p>
              <p className="text-sm">
                BaseScan can't resolve bare-package paths on its own, so Ricknad will fetch the
                full dependency graph from <code>unpkg.com</code> and submit as{" "}
                <code>solidity-standard-json-input</code> instead of a single flat file. Pick the
                OpenZeppelin version your contract was compiled against — a mismatch here will
                cause BaseScan to return <code>Fail - Unable to verify</code>.
              </p>
              {fetchedImports.length > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer">
                    Resolved {fetchedImports.length} file{fetchedImports.length === 1 ? "" : "s"} so far
                  </summary>
                  <ul className="font-mono mt-1 max-h-40 overflow-auto">
                    {fetchedImports.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </details>
              )}
            </AlertDescription>
          </Alert>
        )}

        {status !== "success" && (
          <div className="p-4 border rounded-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="compiler">Compiler version</Label>
                <Select value={compilerVersion} onValueChange={setCompilerVersion}>
                  <SelectTrigger id="compiler">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOLC_VERSIONS.map((v) => (
                      <SelectItem key={v.value} value={v.value}>
                        {v.label} ({v.value})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="evm">EVM version</Label>
                <Select value={evmVersion} onValueChange={setEvmVersion}>
                  <SelectTrigger id="evm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVM_VERSIONS.map((v) => (
                      <SelectItem key={v.value} value={v.value}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="optimizer"
                  checked={optimizationUsed}
                  onCheckedChange={(v) => setOptimizationUsed(Boolean(v))}
                />
                <Label htmlFor="optimizer">Optimizer enabled</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="runs">Optimizer runs</Label>
                <Input
                  id="runs"
                  type="number"
                  min={0}
                  value={optimizerRuns}
                  onChange={(e) => setOptimizerRuns(Number(e.target.value) || 0)}
                  disabled={!optimizationUsed}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="license">License</Label>
                <Select
                  value={String(licenseType)}
                  onValueChange={(v) => setLicenseType(Number(v))}
                >
                  <SelectTrigger id="license">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LICENSE_OPTIONS.map((l) => (
                      <SelectItem key={l.value} value={String(l.value)}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {requiresStandardJson && (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="oz-version">OpenZeppelin contracts version</Label>
                  <Input
                    id="oz-version"
                    placeholder={DEFAULT_OZ_VERSION}
                    value={ozVersion}
                    onChange={(e) => setOzVersion(e.target.value)}
                    className="font-mono"
                  />
                  <p className="text-xs text-gray-500">
                    Must match the version compiled into the deployed bytecode. Pragma{" "}
                    <code>^0.8.20</code>+ generally implies OZ v5.x (default{" "}
                    <code>{DEFAULT_OZ_VERSION}</code>). Older pragmas may need{" "}
                    <code>4.9.6</code> or similar.
                  </p>
                </div>
              )}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="ctorargs">
                  Constructor arguments (ABI-encoded hex, no <code>0x</code> prefix required)
                </Label>
                <Input
                  id="ctorargs"
                  placeholder="e.g. 000000000000000000000000...  (leave empty if none)"
                  value={constructorArguments}
                  onChange={(e) => setConstructorArguments(e.target.value)}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-gray-500">
                  Must match the exact bytes passed at deploy time. A mismatch here is the single
                  most common reason BaseScan returns <code>Fail - Unable to verify</code>.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                onClick={handleVerify}
                disabled={!canSubmit}
                className="bg-base-accent hover:bg-base-accent/80 text-black flex items-center"
              >
                {isSubmitting ? (
                  <Loader2 size={16} className="mr-2 animate-spin" />
                ) : (
                  <ShieldCheck size={16} className="mr-2" />
                )}
                {status === "failure" ? "Retry verification" : "Verify on BaseScan"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <Loader2 size={14} className="mr-1 animate-spin" />
                ) : (
                  <RefreshCcw size={14} className="mr-1" />
                )}
                Check BaseScan status
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(explorerUrl, "_blank")}
              >
                <ExternalLink size={14} className="mr-1" />
                Open on BaseScan
              </Button>
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 pt-2 border-t">
          <p>Network: Base Mainnet (chainId {BASE_MAINNET.chainId})</p>
          <p className="mt-1">Contract: <span className="font-mono">{contractAddress}</span></p>
          {stored?.guid && (
            <p className="mt-1">Last GUID: <span className="font-mono">{stored.guid}</span></p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ContractVerification;
