import React, { useState, useCallback } from "react";
import { CheckCircle2, Download, RefreshCw, FileSpreadsheet, AlertTriangle } from "lucide-react";

type UploadState = "READY" | "UPLOADING" | "PROCESSING" | "SUCCESS" | "ERROR";

interface ExtractedSummaryItem {
  filename: string;
  insured: string | null;
  carrier: string | null;
  policyNumber: string | null;
  effectiveDate: string | null;
  expirationDate: string | null;
  occurrenceLimit: number | string | null;
  aggregateLimit: number | string | null;
  isCoi: boolean;
  reviewRequired?: boolean;
  reasonCode?: string | null;
}

interface UploaderProps {
  lang?: "en" | "es";
}

const translations = {
  en: {
    title: "Upload Your COI Documents",
    subtitle: "Upload individual Certificate of Insurance (COI) PDFs or a ZIP archive containing multiple documents.",
    dragPrompt: "Click or drag files to upload",
    dragHint: "Supports standard ACORD 25 .pdf certificates or a .zip archive up to 10MB",
    uploadingTitle: "Uploading certificate data...",
    processingTitle: "Extracting Insurance Fields",
    processingSubtitle: "Parsing coverage limits, policy numbers, and expiration dates...",
    errorFileType: "Only .zip and .pdf files are supported.",
    errorGeneric: "An error occurred during upload.",
    tryAgain: "Try Again",
    successTitle: "Extraction Complete",
    successSubtitle: "Your COI tracker workbook has been generated and downloaded to your device.",
    reviewBannerTitle: "Document Attention Required",
    reviewBannerSubtitle: "Some certificate fields could not be verified automatically and require human review. All available data was compiled into your workbook.",
    summaryTitle: "Extraction Summary",
    certificates: "certificate",
    certificatesPlural: "certificates",
    colDoc: "Document",
    colInsured: "Named Insured",
    colStatus: "Status",
    colCarrier: "Carrier",
    colPolicy: "Policy #",
    colEffective: "Effective",
    colExpiration: "Expiration",
    colLimit: "Occurrence Limit",
    statusVerified: "Verified",
    statusReview: "Review Needed",
    downloadBtn: "Download .XLSX Tracker",
    uploadAnotherBtn: "Upload Another Certificate",
    bmcTag: "Open Source & Free",
    bmcText: "CertifiTrack is free open-source software. If this tool saved you time managing certificates, consider supporting ongoing development.",
    bmcBtn: "Support on Buy Me a Coffee",
    emptySummary: "All parsed fields and date validations have been compiled into certifitrack-results.xlsx."
  },
  es: {
    title: "Sube tus Documentos COI",
    subtitle: "Sube certificados de seguro (COI) individuales en formato PDF o un archivo ZIP con múltiples documentos.",
    dragPrompt: "Haz clic o arrastra archivos para subir",
    dragHint: "Admite certificados .pdf ACORD 25 estándar o archivos .zip hasta 10MB",
    uploadingTitle: "Subiendo datos de certificados...",
    processingTitle: "Extrayendo Campos de Seguro",
    processingSubtitle: "Analizando límites de cobertura, números de póliza y fechas de vigencia...",
    errorFileType: "Solo se admiten archivos .zip y .pdf.",
    errorGeneric: "Ocurrió un error durante la carga.",
    tryAgain: "Intentar de Nuevo",
    successTitle: "Extracción Completada",
    successSubtitle: "Tu registro de COIs ha sido generado y descargado en tu dispositivo.",
    reviewBannerTitle: "Atención Requerida en Documento",
    reviewBannerSubtitle: "Algunos campos de la póliza no pudieron verificarse automáticamente y requieren revisión humana. Todos los datos disponibles se han compilado en tu registro.",
    summaryTitle: "Resumen de Extracción",
    certificates: "certificado",
    certificatesPlural: "certificados",
    colDoc: "Documento",
    colInsured: "Asegurado Titular",
    colStatus: "Estado",
    colCarrier: "Aseguradora",
    colPolicy: "Póliza #",
    colEffective: "Inicio",
    colExpiration: "Vencimiento",
    colLimit: "Límite por Ocurrencia",
    statusVerified: "Verificado",
    statusReview: "Revisión",
    downloadBtn: "Descargar Registro .XLSX",
    uploadAnotherBtn: "Subir Otro Certificado",
    bmcTag: "Código Abierto y Gratuito",
    bmcText: "CertifiTrack es software de código abierto. Si esta herramienta te ahorró tiempo gestionando pólizas, considera apoyar su desarrollo continuo.",
    bmcBtn: "Invítanos un Café en Buy Me a Coffee",
    emptySummary: "Todos los campos y validaciones de fechas se han compilado en certifitrack-results.xlsx."
  }
};

export default function Uploader({ lang = "en" }: UploaderProps) {
  const t = translations[lang] || translations.en;
  const [status, setStatus] = useState<UploadState>("READY");
  const [errorMessage, setErrorMessage] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [summaryItems, setSummaryItems] = useState<ExtractedSummaryItem[]>([]);
  const [downloadBlobUrl, setDownloadBlobUrl] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [status]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    if (status !== "READY" && status !== "ERROR") return;
    if (!file.name.endsWith(".zip") && !file.name.endsWith(".pdf")) {
      setStatus("ERROR");
      setErrorMessage(t.errorFileType);
      return;
    }

    setStatus("UPLOADING");
    setErrorMessage("");
    setUploadedFileName(file.name);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const backendUrl = import.meta.env.PUBLIC_BACKEND_URL || "";
      const endpoint = backendUrl ? `${backendUrl}/v1/extract` : "/v1/extract";
      
      const res = await fetch(endpoint, {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        let msg = t.errorGeneric;
        try {
          const errData = await res.json();
          if (errData.message) msg = errData.message;
        } catch(e) {}
        throw new Error(msg);
      }

      setStatus("PROCESSING");
      
      // Parse summary header from backend if present
      const summaryHeader = res.headers.get("X-Extraction-Summary") || res.headers.get("x-extraction-summary");
      if (summaryHeader) {
        try {
          const parsed = JSON.parse(decodeURIComponent(summaryHeader));
          if (Array.isArray(parsed)) {
            setSummaryItems(parsed);
          }
        } catch (err) {
          console.warn("Could not parse extraction summary header", err);
        }
      }

      // Read XLSX blob
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      setDownloadBlobUrl(url);

      setStatus("SUCCESS");
      
      // Trigger automatic initial download
      const a = document.createElement("a");
      a.href = url;
      a.download = "certifitrack-results.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      
    } catch (err: any) {
      console.error(err);
      setStatus("ERROR");
      setErrorMessage(err.message || t.errorGeneric);
    }
  };

  const resetUploader = () => {
    if (downloadBlobUrl) {
      window.URL.revokeObjectURL(downloadBlobUrl);
      setDownloadBlobUrl(null);
    }
    setSummaryItems([]);
    setUploadedFileName("");
    setErrorMessage("");
    setStatus("READY");
  };

  const triggerDownload = () => {
    if (!downloadBlobUrl) return;
    const a = document.createElement("a");
    a.href = downloadBlobUrl;
    a.download = "certifitrack-results.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const hasAnyReviewNeeded = summaryItems.some(i => i.reviewRequired);

  // SUCCESS STATE: Clean, informative result experience
  if (status === "SUCCESS") {
    return (
      <div className="max-w-4xl mx-auto mt-6 mb-20 px-4">
        {/* Confirmation Header */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full border mb-3 shadow-subtle ${
            hasAnyReviewNeeded 
              ? "bg-[var(--color-status-expired-bg)] border-[var(--color-status-expired-border)] text-[var(--color-status-expired)]"
              : "bg-[var(--color-status-active-bg)] border-[var(--color-status-active-border)] text-[var(--color-status-active)]"
          }`}>
            {hasAnyReviewNeeded ? (
              <AlertTriangle className="w-6 h-6" />
            ) : (
              <CheckCircle2 className="w-6 h-6" />
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-2">
            {t.successTitle}
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {hasAnyReviewNeeded ? t.reviewBannerSubtitle : t.successSubtitle}
          </p>
        </div>

        {/* Extracted Content Summary Card */}
        <div className="bg-surface rounded-2xl border border-border shadow-elevated overflow-hidden mb-8">
          <div className="px-5 py-3.5 bg-muted/40 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-foreground opacity-70" />
              <span className="text-xs font-semibold text-foreground tracking-wide">
                {t.summaryTitle}
              </span>
              <span className="text-[11px] text-muted-foreground ml-1">
                ({summaryItems.length > 0 ? summaryItems.length : 1} {summaryItems.length > 1 ? t.certificatesPlural : t.certificates})
              </span>
            </div>
            {uploadedFileName && (
              <span className="text-[11px] font-sans text-muted-foreground truncate max-w-[200px]">
                {uploadedFileName}
              </span>
            )}
          </div>

          {summaryItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans whitespace-nowrap">
                <thead className="bg-muted/20 text-muted-foreground border-b border-border text-[11px] uppercase tracking-wider font-medium">
                  <tr>
                    <th className="px-4 py-2.5">{t.colDoc}</th>
                    <th className="px-4 py-2.5">{t.colStatus}</th>
                    <th className="px-4 py-2.5">{t.colInsured}</th>
                    <th className="px-4 py-2.5">{t.colCarrier}</th>
                    <th className="px-4 py-2.5">{t.colPolicy}</th>
                    <th className="px-4 py-2.5">{t.colEffective}</th>
                    <th className="px-4 py-2.5">{t.colExpiration}</th>
                    <th className="px-4 py-2.5 text-right">{t.colLimit}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground">
                  {summaryItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {item.filename || "document.pdf"}
                      </td>
                      <td className="px-4 py-3">
                        {item.reviewRequired ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            {t.statusReview} {item.reasonCode ? `(${item.reasonCode})` : ''}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            {t.statusVerified}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {item.insured || "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {item.carrier || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">
                        {item.policyNumber || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">
                        {item.effectiveDate || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs tabular-nums font-medium text-foreground">
                        {item.expirationDate || "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-xs tabular-nums font-medium text-foreground">
                        {item.occurrenceLimit !== null && item.occurrenceLimit !== undefined
                          ? typeof item.occurrenceLimit === 'number'
                            ? `$${item.occurrenceLimit.toLocaleString()}`
                            : item.occurrenceLimit
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-muted-foreground">
              {t.emptySummary}
            </div>
          )}

          {/* Action Row */}
          <div className="px-5 py-4 bg-muted/20 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={triggerDownload}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-xs hover:opacity-90 transition-all shadow-subtle cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.downloadBtn}</span>
            </button>

            <button
              type="button"
              onClick={resetUploader}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface hover:bg-surface-hover text-foreground text-xs font-medium transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{t.uploadAnotherBtn}</span>
            </button>
          </div>
        </div>

        {/* Tasteful, Minimal Buy Me a Coffee Support Box */}
        <div className="p-6 rounded-2xl border border-border bg-surface text-center flex flex-col items-center gap-3 shadow-subtle">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {t.bmcTag}
          </span>
          <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
            {t.bmcText}
          </p>
          <a
            href="https://buymeacoffee.com/kurosys"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-muted/40 hover:bg-muted/80 text-foreground text-xs font-medium transition-all shadow-subtle hover:border-border-hover"
          >
            <span>☕</span>
            <span>{t.bmcBtn}</span>
          </a>
        </div>
      </div>
    );
  }

  // DEFAULT UPLOAD VIEW
  return (
    <div className="max-w-3xl mx-auto mt-6 mb-20 px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground mb-3 font-sans">
          {t.title}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          {t.subtitle}
        </p>
      </div>

      <div 
        className={`relative group flex flex-col items-center justify-center p-10 sm:p-14 text-center rounded-2xl border-2 border-dashed transition-all ${
          dragActive 
            ? "border-foreground bg-muted/30 scale-[1.01]" 
            : "border-border bg-surface hover:border-foreground/40 hover:bg-surface-hover shadow-subtle"
        } ${status === "UPLOADING" || status === "PROCESSING" ? "pointer-events-none opacity-80" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input 
          type="file" 
          accept=".zip,.pdf" 
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          disabled={status === "UPLOADING" || status === "PROCESSING"}
        />

        <div className="pointer-events-none flex flex-col items-center gap-3.5 relative z-0">
          {status === "READY" || status === "ERROR" ? (
            <>
              <div className="w-14 h-14 rounded-full bg-muted border border-border flex items-center justify-center text-foreground mb-1 transition-transform group-hover:scale-105 shadow-subtle">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-foreground">
                {t.dragPrompt}
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                {t.dragHint}
              </p>
            </>
          ) : status === "UPLOADING" ? (
            <>
              <div className="w-14 h-14 rounded-full bg-muted border border-border flex items-center justify-center text-foreground mb-1 animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </div>
              <h3 className="text-base font-semibold text-foreground animate-pulse">
                {t.uploadingTitle}
              </h3>
            </>
          ) : status === "PROCESSING" ? (
            <>
              <div className="w-14 h-14 rounded-full bg-muted border border-border flex items-center justify-center text-foreground mb-1">
                <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              </div>
              <h3 className="text-base font-semibold text-foreground">
                {t.processingTitle}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t.processingSubtitle}
              </p>
            </>
          ) : null}
        </div>
      </div>

      {status === "ERROR" && errorMessage && (
        <div className="mt-6 p-4 rounded-xl bg-[var(--color-status-expired-bg)] border border-[var(--color-status-expired-border)] text-[var(--color-status-expired)] text-center">
          <p className="text-xs font-medium">Error: {errorMessage}</p>
          <button 
            type="button"
            onClick={resetUploader}
            className="mt-2 text-xs underline hover:opacity-80 transition-opacity cursor-pointer font-medium"
          >
            {t.tryAgain}
          </button>
        </div>
      )}
    </div>
  );
}
