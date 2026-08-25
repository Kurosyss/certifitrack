import React, { useState, useCallback } from "react";
import { 
  CheckCircle2, 
  Download, 
  RefreshCw, 
  FileSpreadsheet, 
  AlertTriangle, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  Building2, 
  FileText, 
  Calendar, 
  DollarSign, 
  Shield, 
  Layers,
  Car,
  HardHat,
  Umbrella,
  FileCheck2
} from "lucide-react";
import { parseXlsxBlob } from "../utils/xlsxParser";
import type { ParsedCoiRow } from "../utils/xlsxParser";

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
  project?: string | null;
  additionalInsured?: boolean;
  waiverOfSubrogation?: boolean;
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
    successSubtitle: "Your Certificate of Insurance data has been verified and compiled into structured records.",
    reviewBannerTitle: "Document Attention Required",
    reviewBannerSubtitle: "Some certificate fields could not be verified automatically and require human review. All available data was compiled into your workbook.",
    certificate: "certificate processed",
    certificatesPlural: "certificates processed",
    statusVerified: "VERIFIED",
    statusReview: "REVIEW REQUIRED",
    
    // Identity Section
    namedInsuredLabel: "Named Insured",
    sourceDocLabel: "Source Document",
    primaryCarrierLabel: "Primary Carrier",
    certHolderLabel: "Certificate Holder",

    // Key Summary
    keySummaryTitle: "Primary Coverage Overview",
    generalLiability: "General Liability",
    glLimits: "Policy Limits (Occ / Agg)",
    glTerm: "Policy Term",
    
    // Coverage Breakdown
    coverageBreakdownTitle: "Coverage Breakdown",
    autoLiability: "Automobile Liability",
    workersComp: "Workers' Compensation",
    umbrellaLiability: "Umbrella / Excess Liability",
    
    // Field Labels
    colPolicy: "Policy Number",
    colCarrier: "Insurance Carrier",
    colEffective: "Effective Date",
    colExpiration: "Expiration Date",
    colOccLimit: "Each Occurrence Limit",
    colAggLimit: "General Aggregate Limit",
    colCslLimit: "Combined Single Limit",
    colWcLimit: "Accident / Statutory Limit",
    colUmbLimit: "Occurrence Limit",
    
    // Compliance Section
    complianceTitle: "Certificate & Compliance Details",
    addlInsuredLabel: "Additional Insured",
    subrWvdLabel: "Waiver of Subrogation",
    projectOpsLabel: "Project / Description of Operations",
    yesBadge: "YES",
    noBadge: "NO",

    // Full Details Table
    viewAllBtn: "View all extracted fields",
    hideAllBtn: "Hide all extracted fields",
    allFieldsTitle: "Complete Structured Extraction Schema",
    allFieldsSubtitle: "All 28 extracted spreadsheet columns and compliance data points",

    // Actions
    downloadBtn: "Download .XLSX Tracker",
    uploadAnotherBtn: "Upload Another Certificate",
    
    // Support Box
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
    successSubtitle: "Los datos de tu certificado de seguro han sido verificados y compilados en registros estructurados.",
    reviewBannerTitle: "Atención Requerida en Documento",
    reviewBannerSubtitle: "Algunos campos de la póliza no pudieron verificarse automáticamente y requieren revisión humana. Todos los datos disponibles se han compilado en tu registro.",
    certificate: "certificado procesado",
    certificatesPlural: "certificados procesados",
    statusVerified: "VERIFICADO",
    statusReview: "REVISIÓN REQUERIDA",
    
    // Identity Section
    namedInsuredLabel: "Asegurado Titular",
    sourceDocLabel: "Documento de Origen",
    primaryCarrierLabel: "Aseguradora Principal",
    certHolderLabel: "Titular del Certificado",

    // Key Summary
    keySummaryTitle: "Resumen Principal de Cobertura",
    generalLiability: "Responsabilidad Civil General",
    glLimits: "Límites de Póliza (Ocurrencia / Agregado)",
    glTerm: "Vigencia de Póliza",
    
    // Coverage Breakdown
    coverageBreakdownTitle: "Desglose de Coberturas",
    autoLiability: "Responsabilidad Automóvil",
    workersComp: "Compensación de Trabajadores",
    umbrellaLiability: "Póliza Sombrilla / Exceso",
    
    // Field Labels
    colPolicy: "Número de Póliza",
    colCarrier: "Aseguradora",
    colEffective: "Fecha de Inicio",
    colExpiration: "Fecha de Vencimiento",
    colOccLimit: "Límite por Ocurrencia",
    colAggLimit: "Límite Agregado General",
    colCslLimit: "Límite Único Combinado (CSL)",
    colWcLimit: "Límite por Accidente / Estatutario",
    colUmbLimit: "Límite por Ocurrencia",
    
    // Compliance Section
    complianceTitle: "Detalles del Certificado y Cumplimiento",
    addlInsuredLabel: "Asegurado Adicional",
    subrWvdLabel: "Renuncia a Subrogación",
    projectOpsLabel: "Proyecto / Descripción de Operaciones",
    yesBadge: "SÍ",
    noBadge: "NO",

    // Full Details Table
    viewAllBtn: "Ver todos los campos extraídos",
    hideAllBtn: "Ocultar todos los campos extraídos",
    allFieldsTitle: "Esquema Completo de Extracción Estructurada",
    allFieldsSubtitle: "Las 28 columnas extraídas para la hoja de cálculo",

    // Actions
    downloadBtn: "Descargar Registro .XLSX",
    uploadAnotherBtn: "Subir Otro Certificado",
    
    // Support Box
    bmcTag: "Código Abierto y Gratuito",
    bmcText: "CertifiTrack es software de código abierto. Si esta herramienta te ahorró tiempo gestionando pólizas, considera apoyar su desarrollo continuo.",
    bmcBtn: "Invítanos un Café en Buy Me a Coffee",
    emptySummary: "Todos los campos y validaciones de fechas se han compilado en certifitrack-results.xlsx."
  }
};

function formatCurrency(val: any): string {
  if (val === null || val === undefined || val === "" || val === "—") return "—";
  if (typeof val === "number") {
    return `$${val.toLocaleString("en-US")}`;
  }
  const clean = String(val).replace(/[^0-9.]/g, "");
  const num = parseFloat(clean);
  if (!isNaN(num) && num > 0) {
    return `$${num.toLocaleString("en-US")}`;
  }
  return String(val);
}

function formatDate(val: any): string {
  if (!val || val === "—") return "—";
  const str = String(val).trim();
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[parseInt(match[2], 10) - 1] || match[2];
    return `${month} ${parseInt(match[3], 10)}, ${match[1]}`;
  }
  return str;
}

function renderValue(val: any, isDate = false, isCurrency = false): React.ReactNode {
  if (val === null || val === undefined || val === "" || val === "—" || val === "null" || val === "undefined") {
    return <span className="text-muted-foreground/50 font-normal select-none">—</span>;
  }
  
  if (isCurrency) {
    return <span className="text-foreground font-medium tabular-nums">{formatCurrency(val)}</span>;
  }

  if (isDate) {
    return <span className="text-foreground font-medium tabular-nums">{formatDate(val)}</span>;
  }

  return <span className="text-foreground font-medium">{String(val)}</span>;
}

function sanitizeFilename(input: string): string {
  if (!input) return "certifitrack-results.xlsx";
  let clean = input.replace(/[\x00-\x1f\x7f/\\:*?"<>|]/g, "").trim();
  clean = clean.replace(/\.{2,}/g, ".");
  clean = clean.replace(/^[.\s]+|[.\s]+$/g, "");
  if (clean.length > 80) {
    clean = clean.slice(0, 80);
  }
  if (!clean.toLowerCase().endsWith(".xlsx")) {
    if (clean.toLowerCase().endsWith(".xls")) {
      clean = clean.slice(0, -4) + ".xlsx";
    } else {
      clean = clean + ".xlsx";
    }
  }
  if (clean === ".xlsx" || clean.length < 6) {
    return "certifitrack-results.xlsx";
  }
  return clean;
}

export default function Uploader({ lang = "en" }: UploaderProps) {
  const t = translations[lang] || translations.en;
  const [status, setStatus] = useState<UploadState>("READY");
  const [errorMessage, setErrorMessage] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [summaryItems, setSummaryItems] = useState<ExtractedSummaryItem[]>([]);
  const [parsedRows, setParsedRows] = useState<ParsedCoiRow[]>([]);
  const [selectedDocIndex, setSelectedDocIndex] = useState<number>(0);
  const [downloadBlobUrl, setDownloadBlobUrl] = useState<string | null>(null);
  const [downloadFileName, setDownloadFileName] = useState<string>("certifitrack-results.xlsx");
  const [showAllFields, setShowAllFields] = useState(false);

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
    setSummaryItems([]);
    setParsedRows([]);
    setSelectedDocIndex(0);

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
      let headerItems: ExtractedSummaryItem[] = [];
      if (summaryHeader) {
        try {
          const parsed = JSON.parse(decodeURIComponent(summaryHeader));
          if (Array.isArray(parsed)) {
            headerItems = parsed;
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

      // Extract all 28 columns from XLSX blob on client for rich inspection
      try {
        const rows = await parseXlsxBlob(blob);
        if (rows.length > 0) {
          setParsedRows(rows);
        }
      } catch (err) {
        console.warn("Client XLSX parse fallback:", err);
      }

      setStatus("SUCCESS");
      
      // Trigger automatic initial download
      const a = document.createElement("a");
      a.href = url;
      a.download = sanitizeFilename(downloadFileName);
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
    setParsedRows([]);
    setSelectedDocIndex(0);
    setUploadedFileName("");
    setDownloadFileName("certifitrack-results.xlsx");
    setErrorMessage("");
    setShowAllFields(false);
    setStatus("READY");
  };

  const triggerDownload = (nameOverride?: string) => {
    if (!downloadBlobUrl) return;
    const finalName = sanitizeFilename(nameOverride || downloadFileName);
    const a = document.createElement("a");
    a.href = downloadBlobUrl;
    a.download = finalName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const hasAnyReviewNeeded = summaryItems.some(i => i.reviewRequired) || parsedRows.some(r => r.review_needed?.includes("ACTION"));
  const count = Math.max(summaryItems.length, parsedRows.length, 1);

  // Active item resolution
  const activeSummary = summaryItems[selectedDocIndex] || summaryItems[0] || null;
  const activeRow = parsedRows[selectedDocIndex] || parsedRows[0] || null;

  // Normalized active fields across header summary & parsed spreadsheet row
  const activeNamedInsured = activeRow?.named_insured || activeSummary?.insured || "—";
  const activeSourceDoc = activeRow?.filename || activeSummary?.filename || uploadedFileName || "document.pdf";
  const activeGlCarrier = activeRow?.gl_carrier || activeSummary?.carrier || "—";
  const activeHolder = activeRow?.holder || "—";
  
  // General Liability
  const glPolicy = activeRow?.gl_policy || activeSummary?.policyNumber || "—";
  const glEff = activeRow?.gl_eff || activeSummary?.effectiveDate || "—";
  const glExp = activeRow?.gl_exp || activeSummary?.expirationDate || "—";
  const glOcc = activeRow?.gl_occ || activeSummary?.occurrenceLimit || "—";
  const glAgg = activeRow?.gl_agg || activeSummary?.aggregateLimit || "—";

  // Auto
  const autoPolicy = activeRow?.auto_policy || "—";
  const autoCarrier = activeRow?.auto_carrier || activeGlCarrier;
  const autoEff = activeRow?.auto_eff || glEff;
  const autoExp = activeRow?.auto_exp || glExp;
  const autoLimit = activeRow?.auto_limit || "—";

  // Workers Comp
  const wcPolicy = activeRow?.wc_policy || "—";
  const wcCarrier = activeRow?.wc_carrier || "—";
  const wcEff = activeRow?.wc_eff || glEff;
  const wcExp = activeRow?.wc_exp || glExp;
  const wcLimit = activeRow?.wc_limit || "—";

  // Umbrella
  const umbPolicy = activeRow?.umbrella_policy || "—";
  const umbCarrier = activeRow?.umbrella_carrier || activeGlCarrier;
  const umbEff = activeRow?.umbrella_eff || glEff;
  const umbExp = activeRow?.umbrella_exp || glExp;
  const umbLimit = activeRow?.umbrella_limit || "—";

  // Compliance
  const isAddlInsured = activeRow?.addl_insd === "YES" || activeSummary?.additionalInsured === true;
  const isSubrWvd = activeRow?.subr_wvd === "YES" || activeSummary?.waiverOfSubrogation === true;
  const projectOps = activeRow?.project || activeSummary?.project || "—";

  // SUCCESS STATE: High-end Document Intelligence Result UI
  if (status === "SUCCESS") {
    return (
      <div data-certifitrack-build="current-dev-2026-08-25-v4" className="w-full max-w-5xl mx-auto mt-4 mb-24 px-3 sm:px-6">
        
        {/* ================================================== */}
        {/* 1. RESULT HEADER                                   */}
        {/* ================================================== */}
        <div className="text-center mb-8 pt-2">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-subtle">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
              {hasAnyReviewNeeded ? t.statusReview : t.statusVerified}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-2">
            {t.successTitle}
          </h1>
          
          <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto mb-3">
            {hasAnyReviewNeeded ? t.reviewBannerSubtitle : t.successSubtitle}
          </p>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/60 border border-border text-[11px] font-medium text-muted-foreground tabular-nums">
            <span>{count} {count === 1 ? t.certificate : t.certificatesPlural}</span>
          </div>
        </div>

        {/* Document Switcher if ZIP contains multiple documents */}
        {summaryItems.length > 1 && (
          <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {summaryItems.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedDocIndex(idx)}
                className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                  selectedDocIndex === idx
                    ? "bg-foreground text-background border-foreground shadow-subtle"
                    : "bg-surface text-muted-foreground border-border hover:text-foreground hover:bg-surface-hover"
                }`}
              >
                <FileText className="w-3.5 h-3.5 opacity-70" />
                <span>{item.filename}</span>
              </button>
            ))}
          </div>
        )}

        {/* Main Result Card Container */}
        <div className="bg-surface rounded-2xl border border-border shadow-elevated overflow-hidden mb-6">
          
          {/* ================================================== */}
          {/* 2. DOCUMENT IDENTITY                               */}
          {/* ================================================== */}
          <div className="p-5 sm:p-7 border-b border-border bg-gradient-to-b from-muted/20 to-transparent">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                  {t.namedInsuredLabel}
                </span>
                <h2 className="text-lg sm:text-2xl font-bold text-foreground tracking-tight">
                  {activeNamedInsured}
                </h2>
              </div>

              <div className="flex items-center gap-2 self-start md:self-auto">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface border border-border text-xs text-muted-foreground font-sans">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="truncate max-w-[220px]">{activeSourceDoc}</span>
                </span>
              </div>
            </div>

            {/* Sub-identity strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-border/70 text-xs">
              <div>
                <span className="text-[11px] font-medium text-muted-foreground block mb-0.5">
                  {t.primaryCarrierLabel}
                </span>
                <span className="text-foreground font-medium text-xs sm:text-sm">
                  {renderValue(activeGlCarrier)}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-medium text-muted-foreground block mb-0.5">
                  {t.certHolderLabel}
                </span>
                <span className="text-foreground font-medium text-xs sm:text-sm">
                  {renderValue(activeHolder)}
                </span>
              </div>
            </div>
          </div>

          {/* ================================================== */}
          {/* 3. KEY SUMMARY STRIP                               */}
          {/* ================================================== */}
          <div className="p-5 sm:p-7 bg-muted/10 border-b border-border">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-foreground/70" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                {t.keySummaryTitle}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* GL Policy Card */}
              <div className="p-4 rounded-xl border border-border bg-surface shadow-subtle">
                <span className="text-[11px] font-medium text-muted-foreground block mb-1">
                  {t.generalLiability} ({t.colPolicy})
                </span>
                <div className="text-sm sm:text-base font-semibold text-foreground tabular-nums tracking-tight">
                  {renderValue(glPolicy)}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 truncate">
                  {activeGlCarrier !== "—" ? activeGlCarrier : "Commercial General Liability"}
                </div>
              </div>

              {/* Policy Term */}
              <div className="p-4 rounded-xl border border-border bg-surface shadow-subtle">
                <span className="text-[11px] font-medium text-muted-foreground block mb-1">
                  {t.glTerm}
                </span>
                <div className="text-xs sm:text-sm font-semibold text-foreground tabular-nums">
                  {glEff !== "—" && glExp !== "—" ? (
                    <span>{formatDate(glEff)} — {formatDate(glExp)}</span>
                  ) : (
                    <span>{renderValue(glEff, true)} — {renderValue(glExp, true)}</span>
                  )}
                </div>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                  Active Policy Period
                </div>
              </div>

              {/* Limits (Occ / Agg) */}
              <div className="p-4 rounded-xl border border-border bg-surface shadow-subtle">
                <span className="text-[11px] font-medium text-muted-foreground block mb-1">
                  {t.glLimits}
                </span>
                <div className="text-sm sm:text-base font-semibold text-foreground tabular-nums">
                  {glOcc !== "—" ? formatCurrency(glOcc) : "—"} <span className="text-muted-foreground font-normal">/</span> {glAgg !== "—" ? formatCurrency(glAgg) : "—"}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  Occurrence / Aggregate
                </div>
              </div>
            </div>
          </div>

          {/* ================================================== */}
          {/* 4. COVERAGE BREAKDOWN (Grouped Sections)           */}
          {/* ================================================== */}
          <div className="p-5 sm:p-7 border-b border-border">
            <div className="flex items-center gap-2 mb-5">
              <Layers className="w-4 h-4 text-foreground/70" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                {t.coverageBreakdownTitle}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* 1. General Liability */}
              <div className="p-4 sm:p-5 rounded-xl border border-border bg-surface/50">
                <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-foreground/60" />
                    <span className="text-xs font-semibold text-foreground">{t.generalLiability}</span>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground tabular-nums">
                    {glPolicy !== "—" ? glPolicy : "Inactive"}
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-xs">
                  <div>
                    <dt className="text-[10px] text-muted-foreground">{t.colCarrier}</dt>
                    <dd className="font-medium text-foreground truncate">{renderValue(activeGlCarrier)}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] text-muted-foreground">{t.colExpiration}</dt>
                    <dd className="font-medium text-foreground tabular-nums">{renderValue(glExp, true)}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] text-muted-foreground">{t.colOccLimit}</dt>
                    <dd className="font-semibold text-foreground tabular-nums">{renderValue(glOcc, false, true)}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] text-muted-foreground">{t.colAggLimit}</dt>
                    <dd className="font-semibold text-foreground tabular-nums">{renderValue(glAgg, false, true)}</dd>
                  </div>
                </dl>
              </div>

              {/* 2. Automobile Liability */}
              <div className="p-4 sm:p-5 rounded-xl border border-border bg-surface/50">
                <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Car className="w-3.5 h-3.5 text-foreground/60" />
                    <span className="text-xs font-semibold text-foreground">{t.autoLiability}</span>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground tabular-nums">
                    {autoPolicy !== "—" ? autoPolicy : "Inactive"}
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-xs">
                  <div>
                    <dt className="text-[10px] text-muted-foreground">{t.colCarrier}</dt>
                    <dd className="font-medium text-foreground truncate">{renderValue(autoCarrier)}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] text-muted-foreground">{t.colExpiration}</dt>
                    <dd className="font-medium text-foreground tabular-nums">{renderValue(autoExp, true)}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-[10px] text-muted-foreground">{t.colCslLimit}</dt>
                    <dd className="font-semibold text-foreground tabular-nums">{renderValue(autoLimit, false, true)}</dd>
                  </div>
                </dl>
              </div>

              {/* 3. Workers' Compensation */}
              <div className="p-4 sm:p-5 rounded-xl border border-border bg-surface/50">
                <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-border">
                  <div className="flex items-center gap-2">
                    <HardHat className="w-3.5 h-3.5 text-foreground/60" />
                    <span className="text-xs font-semibold text-foreground">{t.workersComp}</span>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground tabular-nums">
                    {wcPolicy !== "—" ? wcPolicy : "Inactive"}
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-xs">
                  <div>
                    <dt className="text-[10px] text-muted-foreground">{t.colCarrier}</dt>
                    <dd className="font-medium text-foreground truncate">{renderValue(wcCarrier)}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] text-muted-foreground">{t.colExpiration}</dt>
                    <dd className="font-medium text-foreground tabular-nums">{renderValue(wcExp, true)}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-[10px] text-muted-foreground">{t.colWcLimit}</dt>
                    <dd className="font-semibold text-foreground tabular-nums">{renderValue(wcLimit, false, true)}</dd>
                  </div>
                </dl>
              </div>

              {/* 4. Umbrella / Excess Liability */}
              <div className="p-4 sm:p-5 rounded-xl border border-border bg-surface/50">
                <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Umbrella className="w-3.5 h-3.5 text-foreground/60" />
                    <span className="text-xs font-semibold text-foreground">{t.umbrellaLiability}</span>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground tabular-nums">
                    {umbPolicy !== "—" ? umbPolicy : "Inactive"}
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-xs">
                  <div>
                    <dt className="text-[10px] text-muted-foreground">{t.colCarrier}</dt>
                    <dd className="font-medium text-foreground truncate">{renderValue(umbCarrier)}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] text-muted-foreground">{t.colExpiration}</dt>
                    <dd className="font-medium text-foreground tabular-nums">{renderValue(umbExp, true)}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-[10px] text-muted-foreground">{t.colUmbLimit}</dt>
                    <dd className="font-semibold text-foreground tabular-nums">{renderValue(umbLimit, false, true)}</dd>
                  </div>
                </dl>
              </div>

            </div>
          </div>

          {/* ================================================== */}
          {/* 5. COMPLIANCE & CERTIFICATE DETAILS                */}
          {/* ================================================== */}
          <div className="p-5 sm:p-7 border-b border-border bg-muted/5">
            <div className="flex items-center gap-2 mb-4">
              <FileCheck2 className="w-4 h-4 text-foreground/70" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                {t.complianceTitle}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              
              {/* Additional Insured */}
              <div className="p-3.5 rounded-xl border border-border bg-surface">
                <span className="text-[10px] font-medium text-muted-foreground block mb-1.5">
                  {t.addlInsuredLabel}
                </span>
                {isAddlInsured ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" />
                    {t.yesBadge}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground">
                    {t.noBadge}
                  </span>
                )}
              </div>

              {/* Waiver of Subrogation */}
              <div className="p-3.5 rounded-xl border border-border bg-surface">
                <span className="text-[10px] font-medium text-muted-foreground block mb-1.5">
                  {t.subrWvdLabel}
                </span>
                {isSubrWvd ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" />
                    {t.yesBadge}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground">
                    {t.noBadge}
                  </span>
                )}
              </div>

              {/* Certificate Holder */}
              <div className="p-3.5 rounded-xl border border-border bg-surface sm:col-span-2">
                <span className="text-[10px] font-medium text-muted-foreground block mb-1">
                  {t.certHolderLabel}
                </span>
                <span className="text-xs font-medium text-foreground block truncate">
                  {renderValue(activeHolder)}
                </span>
              </div>

              {/* Project / Operations */}
              <div className="p-3.5 rounded-xl border border-border bg-surface col-span-1 sm:col-span-2 lg:col-span-4">
                <span className="text-[10px] font-medium text-muted-foreground block mb-1">
                  {t.projectOpsLabel}
                </span>
                <span className="text-xs text-foreground font-medium block leading-relaxed">
                  {renderValue(projectOps)}
                </span>
              </div>

            </div>
          </div>

          {/* ================================================== */}
          {/* 6. EXPANDABLE ALL EXTRACTED DATA                   */}
          {/* ================================================== */}
          <div className="border-b border-border">
            <button
              type="button"
              onClick={() => setShowAllFields(!showAllFields)}
              className="w-full px-5 py-4 flex items-center justify-between bg-surface hover:bg-surface-hover transition-colors text-xs font-medium text-foreground cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
                <span>{showAllFields ? t.hideAllBtn : t.viewAllBtn}</span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  (28 structured columns)
                </span>
              </div>
              {showAllFields ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            {showAllFields && (
              <div className="p-4 sm:p-6 bg-muted/10 border-t border-border animate-in fade-in duration-200">
                <div className="mb-3">
                  <h4 className="text-xs font-semibold text-foreground">{t.allFieldsTitle}</h4>
                  <p className="text-[11px] text-muted-foreground">{t.allFieldsSubtitle}</p>
                </div>

                <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-subtle">
                  <table className="w-full text-left text-xs font-sans whitespace-nowrap">
                    <thead className="bg-muted/40 text-muted-foreground border-b border-border text-[10px] uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="px-3.5 py-2.5">Field Name</th>
                        <th className="px-3.5 py-2.5">Extracted Value</th>
                        <th className="px-3.5 py-2.5">Category</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-foreground">
                      <tr className="hover:bg-muted/20">
                        <td className="px-3.5 py-2 text-muted-foreground font-medium">Source Document</td>
                        <td className="px-3.5 py-2 font-mono text-[11px]">{activeSourceDoc}</td>
                        <td className="px-3.5 py-2 text-[10px] text-muted-foreground">METADATA</td>
                      </tr>
                      <tr className="hover:bg-muted/20">
                        <td className="px-3.5 py-2 text-muted-foreground font-medium">Named Insured</td>
                        <td className="px-3.5 py-2 font-medium">{renderValue(activeNamedInsured)}</td>
                        <td className="px-3.5 py-2 text-[10px] text-muted-foreground">INSURED</td>
                      </tr>
                      <tr className="hover:bg-muted/20">
                        <td className="px-3.5 py-2 text-muted-foreground font-medium">Compliance State</td>
                        <td className="px-3.5 py-2">{hasAnyReviewNeeded ? "ACTION REQUIRED" : "VERIFIED"}</td>
                        <td className="px-3.5 py-2 text-[10px] text-muted-foreground">STATUS</td>
                      </tr>
                      <tr className="hover:bg-muted/20">
                        <td className="px-3.5 py-2 text-muted-foreground font-medium">GL Policy #</td>
                        <td className="px-3.5 py-2 tabular-nums">{renderValue(glPolicy)}</td>
                        <td className="px-3.5 py-2 text-[10px] text-muted-foreground">GENERAL LIABILITY</td>
                      </tr>
                      <tr className="hover:bg-muted/20">
                        <td className="px-3.5 py-2 text-muted-foreground font-medium">GL Carrier</td>
                        <td className="px-3.5 py-2">{renderValue(activeGlCarrier)}</td>
                        <td className="px-3.5 py-2 text-[10px] text-muted-foreground">GENERAL LIABILITY</td>
                      </tr>
                      <tr className="hover:bg-muted/20">
                        <td className="px-3.5 py-2 text-muted-foreground font-medium">GL Effective Date</td>
                        <td className="px-3.5 py-2 tabular-nums">{renderValue(glEff)}</td>
                        <td className="px-3.5 py-2 text-[10px] text-muted-foreground">GENERAL LIABILITY</td>
                      </tr>
                      <tr className="hover:bg-muted/20">
                        <td className="px-3.5 py-2 text-muted-foreground font-medium">GL Expiration Date</td>
                        <td className="px-3.5 py-2 tabular-nums font-semibold">{renderValue(glExp)}</td>
                        <td className="px-3.5 py-2 text-[10px] text-muted-foreground">GENERAL LIABILITY</td>
                      </tr>
                      <tr className="hover:bg-muted/20">
                        <td className="px-3.5 py-2 text-muted-foreground font-medium">GL Occurrence Limit</td>
                        <td className="px-3.5 py-2 tabular-nums">{renderValue(glOcc, false, true)}</td>
                        <td className="px-3.5 py-2 text-[10px] text-muted-foreground">LIMITS</td>
                      </tr>
                      <tr className="hover:bg-muted/20">
                        <td className="px-3.5 py-2 text-muted-foreground font-medium">GL General Aggregate Limit</td>
                        <td className="px-3.5 py-2 tabular-nums">{renderValue(glAgg, false, true)}</td>
                        <td className="px-3.5 py-2 text-[10px] text-muted-foreground">LIMITS</td>
                      </tr>
                      <tr className="hover:bg-muted/20">
                        <td className="px-3.5 py-2 text-muted-foreground font-medium">Auto Policy #</td>
                        <td className="px-3.5 py-2 tabular-nums">{renderValue(autoPolicy)}</td>
                        <td className="px-3.5 py-2 text-[10px] text-muted-foreground">AUTOMOBILE</td>
                      </tr>
                      <tr className="hover:bg-muted/20">
                        <td className="px-3.5 py-2 text-muted-foreground font-medium">Auto Carrier</td>
                        <td className="px-3.5 py-2">{renderValue(autoCarrier)}</td>
                        <td className="px-3.5 py-2 text-[10px] text-muted-foreground">AUTOMOBILE</td>
                      </tr>
                      <tr className="hover:bg-muted/20">
                        <td className="px-3.5 py-2 text-muted-foreground font-medium">Auto Limit (CSL)</td>
                        <td className="px-3.5 py-2 tabular-nums">{renderValue(autoLimit, false, true)}</td>
                        <td className="px-3.5 py-2 text-[10px] text-muted-foreground">AUTOMOBILE</td>
                      </tr>
                      <tr className="hover:bg-muted/20">
                        <td className="px-3.5 py-2 text-muted-foreground font-medium">WC Policy #</td>
                        <td className="px-3.5 py-2 tabular-nums">{renderValue(wcPolicy)}</td>
                        <td className="px-3.5 py-2 text-[10px] text-muted-foreground">WORKERS COMP</td>
                      </tr>
                      <tr className="hover:bg-muted/20">
                        <td className="px-3.5 py-2 text-muted-foreground font-medium">WC Carrier</td>
                        <td className="px-3.5 py-2">{renderValue(wcCarrier)}</td>
                        <td className="px-3.5 py-2 text-[10px] text-muted-foreground">WORKERS COMP</td>
                      </tr>
                      <tr className="hover:bg-muted/20">
                        <td className="px-3.5 py-2 text-muted-foreground font-medium">WC Limit (Accident)</td>
                        <td className="px-3.5 py-2 tabular-nums">{renderValue(wcLimit, false, true)}</td>
                        <td className="px-3.5 py-2 text-[10px] text-muted-foreground">WORKERS COMP</td>
                      </tr>
                      <tr className="hover:bg-muted/20">
                        <td className="px-3.5 py-2 text-muted-foreground font-medium">Umbrella Policy #</td>
                        <td className="px-3.5 py-2 tabular-nums">{renderValue(umbPolicy)}</td>
                        <td className="px-3.5 py-2 text-[10px] text-muted-foreground">UMBRELLA</td>
                      </tr>
                      <tr className="hover:bg-muted/20">
                        <td className="px-3.5 py-2 text-muted-foreground font-medium">Umbrella Carrier</td>
                        <td className="px-3.5 py-2">{renderValue(umbCarrier)}</td>
                        <td className="px-3.5 py-2 text-[10px] text-muted-foreground">UMBRELLA</td>
                      </tr>
                      <tr className="hover:bg-muted/20">
                        <td className="px-3.5 py-2 text-muted-foreground font-medium">Umbrella Occurrence Limit</td>
                        <td className="px-3.5 py-2 tabular-nums">{renderValue(umbLimit, false, true)}</td>
                        <td className="px-3.5 py-2 text-[10px] text-muted-foreground">UMBRELLA</td>
                      </tr>
                      <tr className="hover:bg-muted/20">
                        <td className="px-3.5 py-2 text-muted-foreground font-medium">Additional Insured</td>
                        <td className="px-3.5 py-2 font-medium">{isAddlInsured ? "YES" : "NO"}</td>
                        <td className="px-3.5 py-2 text-[10px] text-muted-foreground">ENDORSEMENT</td>
                      </tr>
                      <tr className="hover:bg-muted/20">
                        <td className="px-3.5 py-2 text-muted-foreground font-medium">Waiver of Subrogation</td>
                        <td className="px-3.5 py-2 font-medium">{isSubrWvd ? "YES" : "NO"}</td>
                        <td className="px-3.5 py-2 text-[10px] text-muted-foreground">ENDORSEMENT</td>
                      </tr>
                      <tr className="hover:bg-muted/20">
                        <td className="px-3.5 py-2 text-muted-foreground font-medium">Certificate Holder</td>
                        <td className="px-3.5 py-2">{renderValue(activeHolder)}</td>
                        <td className="px-3.5 py-2 text-[10px] text-muted-foreground">COMPLIANCE</td>
                      </tr>
                      <tr className="hover:bg-muted/20">
                        <td className="px-3.5 py-2 text-muted-foreground font-medium">Project / Operations</td>
                        <td className="px-3.5 py-2">{renderValue(projectOps)}</td>
                        <td className="px-3.5 py-2 text-[10px] text-muted-foreground">COMPLIANCE</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* ================================================== */}
          {/* 7. ACTION BUTTONS & FILENAME CONTROL               */}
          {/* ================================================== */}
          <div className="p-5 sm:p-6 bg-muted/20 border-t border-border flex flex-col gap-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              
              {/* Compact Filename Input Control */}
              <div className="flex items-center gap-2.5 flex-1 max-w-sm sm:max-w-md">
                <label htmlFor="export-filename-input" className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                  File name:
                </label>
                <div className="relative flex-1">
                  <input
                    id="export-filename-input"
                    type="text"
                    value={downloadFileName}
                    onChange={(e) => setDownloadFileName(e.target.value)}
                    onBlur={() => setDownloadFileName(sanitizeFilename(downloadFileName))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        triggerDownload(downloadFileName);
                      }
                    }}
                    placeholder="certifitrack-results.xlsx"
                    maxLength={80}
                    className="w-full px-3 py-2 text-xs font-mono bg-surface border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-foreground shadow-subtle"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  id="download-xlsx-btn"
                  onClick={() => triggerDownload(downloadFileName)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs sm:text-sm hover:opacity-90 transition-all shadow-subtle cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-4 h-4" />
                  <span>{t.downloadBtn}</span>
                </button>

                <button
                  type="button"
                  id="upload-another-btn"
                  onClick={resetUploader}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface hover:bg-surface-hover text-foreground text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{t.uploadAnotherBtn}</span>
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* ================================================== */}
        {/* 8. BUY ME A COFFEE (Integrated Neutral Support)    */}
        {/* ================================================== */}
        <div className="p-6 rounded-2xl border border-border bg-surface text-center flex flex-col items-center gap-2.5 shadow-subtle">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t.bmcTag}
          </span>
          <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
            {t.bmcText}
          </p>
          <a
            href="https://buymeacoffee.com/kurosys"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-muted/40 hover:bg-muted/80 text-foreground text-xs font-medium transition-all shadow-subtle hover:border-border-hover"
          >
            <span>☕</span>
            <span>{t.bmcBtn}</span>
          </a>
        </div>

      </div>
    );
  }

  // DEFAULT UPLOAD VIEW (Restrained, elegant drag & drop zone)
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
