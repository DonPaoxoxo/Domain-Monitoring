"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileText,
  Globe2,
  Loader2,
  Plus,
  UploadCloud,
  X,
} from "lucide-react";
import { addDomain, addDomainsBulk, type AddDomainState } from "@/app/bulk-import/actions";
import type { BulkImportRecord } from "@/lib/bulkImports";
import type { TargetMarket } from "@/types/monitor";

const initialAddState: AddDomainState = {};

const MARKETS: { key: TargetMarket; label: string }[] = [
  { key: "india", label: "India" },
  { key: "indonesia", label: "Indonesia" },
];

const MARKET_LABELS: Record<TargetMarket, string> = {
  india: "India",
  indonesia: "Indonesia",
};

const MARKET_BADGE_STYLES: Record<TargetMarket, string> = {
  india: "bg-[#eaf6fb] text-[#1f7a9c]",
  indonesia: "bg-[#fdf2e3] text-[#b9770e]",
};

const MAX_FILE_BYTES = 5 * 1024 * 1024;

const GUIDELINES = [
  "One domain per line, without http:// or https://.",
  "Lines starting with # are treated as comments and skipped.",
  "Duplicate domains already being monitored are skipped automatically.",
  "Each batch is tagged with the target market selected above, plus Global.",
  "CSV files work too — only the first column of each row is read as the domain.",
];

interface AddedDomain {
  domain: string;
  market: TargetMarket;
}

interface BulkImportPanelProps {
  recentImports: BulkImportRecord[];
}

function countDetectedLines(text: string): number {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#")).length;
}

export default function BulkImportPanel({ recentImports }: BulkImportPanelProps) {
  const router = useRouter();
  const [market, setMarket] = useState<TargetMarket>("india");
  const [addedDomains, setAddedDomains] = useState<AddedDomain[]>([]);
  const [addState, addAction, addPending] = useActionState(addDomain, initialAddState);
  const [handledAddState, setHandledAddState] = useState(addState);
  const addFormRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileText, setFileText] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<{ added: number; skipped: number } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, startUpload] = useTransition();

  if (addState !== handledAddState) {
    setHandledAddState(addState);
    if (addState.success && addState.domain && addState.market) {
      setAddedDomains((prev) => [{ domain: addState.domain!, market: addState.market! }, ...prev]);
    }
  }

  useEffect(() => {
    if (addState.success) {
      addFormRef.current?.reset();
    }
  }, [addState]);

  const detectedCount = useMemo(() => (fileText === null ? 0 : countDetectedLines(fileText)), [fileText]);

  const handleFile = (file: File) => {
    setUploadResult(null);
    setUploadError(null);
    setFileError(null);

    if (!/\.(csv|txt)$/i.test(file.name)) {
      setFileError("Only .csv and .txt files are supported.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileError("File is too large. Maximum size is 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedFile(file);
      setFileText(String(reader.result ?? ""));
    };
    reader.onerror = () => {
      setFileError("Could not read the file.");
    };
    reader.readAsText(file);
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const resetFileSelection = () => {
    setSelectedFile(null);
    setFileText(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearSelectedFile = () => {
    resetFileSelection();
    setUploadResult(null);
    setUploadError(null);
  };

  const handleUpload = () => {
    if (!selectedFile || fileText === null) return;

    setUploadResult(null);
    setUploadError(null);

    startUpload(async () => {
      const result = await addDomainsBulk(selectedFile.name, market, fileText);
      if (result.success) {
        setUploadResult({ added: result.added, skipped: result.skipped });
        resetFileSelection();
        router.refresh();
      } else {
        setUploadError(result.error ?? "Upload failed.");
      }
    });
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {/* Upload card */}
        <div className="rounded-md border border-border bg-surface p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground">Import domains</h2>
          <p className="mt-0.5 text-xs text-muted">
            Upload a CSV or plain text file with one domain per line. Choose the target market this batch belongs to.
          </p>

          <div className="mt-4 inline-flex w-fit gap-1 rounded-md border border-border bg-surface-muted p-1">
            {MARKETS.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMarket(m.key)}
                className={`rounded px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                  market === m.key
                    ? "bg-[#20a8d8] text-white shadow-sm"
                    : "text-muted hover:bg-surface hover:text-foreground"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileInputChange}
            className="hidden"
          />

          {selectedFile ? (
            <div className="mt-4 flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-[#20a8d8] bg-[#eaf6fb] px-4 py-10 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#20a8d8] text-white">
                <FileText size={18} />
              </div>
              <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
              <p className="text-xs text-muted">{detectedCount} domain line{detectedCount === 1 ? "" : "s"} detected</p>
              <button
                type="button"
                onClick={clearSelectedFile}
                className="mt-1 flex items-center gap-1 text-xs font-medium text-[#d9534f] hover:underline"
              >
                <X size={12} />
                Remove file
              </button>
            </div>
          ) : (
            <div
              onDrop={handleDrop}
              onDragOver={(event) => event.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-surface-muted px-4 py-10 text-center transition-colors hover:border-[#20a8d8] hover:bg-[#eaf6fb]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eaf6fb] text-[#20a8d8]">
                <UploadCloud size={18} />
              </div>
              <p className="text-sm font-medium text-foreground">Drag &amp; drop your file here</p>
              <p className="text-xs text-muted">or click to browse — .csv, .txt up to 5MB</p>
              <button
                type="button"
                className="mt-2 rounded-md bg-[#20a8d8] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#1c93bd]"
              >
                Choose File
              </button>
            </div>
          )}

          {fileError && (
            <div className="mt-2 flex items-center gap-2 rounded-md border border-[#f5c6cb] bg-[#fbeaea] px-3 py-2 text-xs font-medium text-[#d9534f]">
              <AlertCircle size={14} className="shrink-0" />
              {fileError}
            </div>
          )}

          <div className="mt-3 flex flex-col gap-2 rounded-md border border-border bg-surface-muted px-3 py-2 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-1.5">
              <FileText size={13} />
              Need the format? Download a starter template.
            </span>
            <a
              href="/domain-import-template.csv"
              download
              className="flex items-center gap-1 font-medium text-[#20a8d8] hover:underline"
            >
              <Download size={12} />
              Download template
            </a>
          </div>

          <button
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-md bg-[#20a8d8] px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1c93bd] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUploading && <Loader2 size={14} className="animate-spin" />}
            Upload {MARKET_LABELS[market]} domains
          </button>

          {uploadError && (
            <div className="mt-2 flex items-center gap-2 rounded-md border border-[#f5c6cb] bg-[#fbeaea] px-3 py-2 text-xs font-medium text-[#d9534f]">
              <AlertCircle size={14} className="shrink-0" />
              {uploadError}
            </div>
          )}
          {uploadResult && (
            <div className="mt-2 flex items-center gap-2 rounded-md border border-[#c3e6c3] bg-[#eaf6ea] px-3 py-2 text-xs font-medium text-[#3e8e41]">
              <CheckCircle2 size={14} className="shrink-0" />
              Added {uploadResult.added} domain{uploadResult.added === 1 ? "" : "s"}
              {uploadResult.skipped > 0
                ? `, skipped ${uploadResult.skipped} (duplicate or invalid)`
                : "."}
            </div>
          )}
        </div>

        {/* Add a single domain */}
        <div className="rounded-md border border-border bg-surface p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground">Add a single domain</h2>
          <p className="mt-0.5 text-xs text-muted">
            Add domains one by one instead of uploading a file. Each domain is tagged with the{" "}
            <span className="font-medium text-foreground">{MARKET_LABELS[market]}</span> market selected above, plus
            Global.
          </p>

          <form ref={addFormRef} action={addAction} className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input type="hidden" name="market" value={market} />
            <div className="relative flex-1">
              <Globe2 size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
              <input
                type="text"
                name="domain"
                required
                placeholder="example.com"
                className="w-full rounded-md border border-border bg-surface-muted py-2 pr-3 pl-9 text-[13px] text-foreground transition-colors focus:border-[#20a8d8] focus:bg-surface focus:outline-none focus:ring-2 focus:ring-[#20a8d8]/20"
              />
            </div>
            <button
              type="submit"
              disabled={addPending}
              className="flex items-center justify-center gap-1.5 rounded-md bg-[#20a8d8] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1c93bd] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {addPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Add domain
            </button>
          </form>

          {addState.error && (
            <div className="mt-2 flex items-center gap-2 rounded-md border border-[#f5c6cb] bg-[#fbeaea] px-3 py-2 text-xs font-medium text-[#d9534f]">
              <AlertCircle size={14} className="shrink-0" />
              {addState.error}
            </div>
          )}
          {addState.success && (
            <div className="mt-2 flex items-center gap-2 rounded-md border border-[#c3e6c3] bg-[#eaf6ea] px-3 py-2 text-xs font-medium text-[#3e8e41]">
              <CheckCircle2 size={14} className="shrink-0" />
              {addState.success}
            </div>
          )}

          {addedDomains.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {addedDomains.map((item, index) => (
                <li
                  key={`${item.domain}-${index}`}
                  className="flex items-center justify-between rounded-md border border-border bg-surface-muted px-3 py-1.5 text-xs"
                >
                  <span className="font-medium text-foreground">{item.domain}</span>
                  <span className={`inline-flex rounded px-1.5 py-0.5 text-[11px] font-medium ${MARKET_BADGE_STYLES[item.market]}`}>
                    {MARKET_LABELS[item.market]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent imports */}
        <div className="rounded-md border border-border bg-surface shadow-sm">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">Recent imports</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-100 border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-border bg-surface-muted text-left text-[10px] font-semibold tracking-wide text-muted uppercase">
                  <th className="px-4 py-2">File</th>
                  <th className="px-4 py-2">Market</th>
                  <th className="px-4 py-2">Added</th>
                  <th className="px-4 py-2">Skipped</th>
                  <th className="px-4 py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentImports.map((item) => (
                  <tr key={item.id} className="border-b border-border last:border-b-0 hover:bg-surface-muted">
                    <td className="px-4 py-2 font-medium text-foreground">{item.fileName}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex rounded px-1.5 py-0.5 text-[11px] font-medium ${MARKET_BADGE_STYLES[item.market]}`}>
                        {MARKET_LABELS[item.market]}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-muted">{item.added}</td>
                    <td className="px-4 py-2 text-muted">{item.skipped}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-muted">{item.date}</td>
                  </tr>
                ))}
                {recentImports.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-[13px] text-muted">
                      No imports yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Guidelines */}
      <div className="rounded-md border border-border bg-surface p-4 shadow-sm lg:col-span-1">
        <h2 className="text-sm font-semibold text-foreground">Import guidelines</h2>
        <ul className="mt-3 space-y-2.5">
          {GUIDELINES.map((tip) => (
            <li key={tip} className="flex items-start gap-2 text-xs text-muted">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[#5cb85c]" />
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
