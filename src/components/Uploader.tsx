import React, { useState, useCallback } from "react";

type UploadState = "READY" | "UPLOADING" | "PROCESSING" | "SUCCESS" | "ERROR";

export default function Uploader() {
  const [status, setStatus] = useState<UploadState>("READY");
  const [errorMessage, setErrorMessage] = useState("");
  const [dragActive, setDragActive] = useState(false);

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
      setErrorMessage("Only .zip and .pdf files are supported.");
      return;
    }

    setStatus("UPLOADING");
    setErrorMessage("");

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
        let msg = "An error occurred during upload.";
        try {
          const errData = await res.json();
          if (errData.message) msg = errData.message;
        } catch(e) {}
        throw new Error(msg);
      }

      setStatus("PROCESSING");
      
      // Wait for the blob (XLSX)
      const blob = await res.blob();
      
      setStatus("SUCCESS");
      
      // Trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "certifitrack-results.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
    } catch (err: any) {
      console.error(err);
      setStatus("ERROR");
      setErrorMessage(err.message || "An unexpected error occurred.");
    }
  };

  if (status === "ERROR" && !errorMessage) {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto mt-12 mb-24 px-4">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl mb-4">
          Upload Your COI Folder
        </h1>
        <p className="text-lg text-muted-foreground">
          Upload your .zip of PDFs (or a single .pdf) below to generate your tracker.
        </p>
      </div>

      <div 
        className={`relative group flex flex-col items-center justify-center p-12 text-center rounded-3xl border-2 border-dashed transition-all ${
          dragActive 
            ? "border-accent bg-accent/5 shadow-xl scale-[1.02]" 
            : "border-border bg-surface hover:border-accent/50 hover:bg-surface-hover shadow-sm"
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
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={status === "UPLOADING" || status === "PROCESSING" || status === "SUCCESS"}
        />

        <div className="pointer-events-none flex flex-col items-center gap-4">
          {status === "READY" || status === "ERROR" ? (
            <>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2 transition-transform group-hover:scale-110">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground">
                Click or drag file to this area
              </h3>
              <p className="text-sm text-muted-foreground">
                Supports .zip or .pdf up to 10MB
              </p>
            </>
          ) : status === "UPLOADING" ? (
            <>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2 animate-bounce">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground animate-pulse">
                Uploading securely...
              </h3>
            </>
          ) : status === "PROCESSING" ? (
            <>
              <div className="w-16 h-16 rounded-full bg-[var(--color-status-review-bg)] flex items-center justify-center text-[var(--color-status-review)] mb-2">
                <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground">
                Extracting COI Data
              </h3>
              <p className="text-sm text-muted-foreground">
                This usually takes 10-30 seconds depending on the file size.
              </p>
            </>
          ) : status === "SUCCESS" ? (
            <>
              <div className="w-16 h-16 rounded-full bg-[var(--color-status-active-bg)] flex items-center justify-center text-[var(--color-status-active)] mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground">
                Processing Complete
              </h3>
              <p className="text-sm text-muted-foreground">
                Your Excel tracker has been downloaded successfully.
              </p>
              
              <div className="mt-3 flex gap-3 pointer-events-auto">
                <button
                  type="button"
                  onClick={() => setStatus("READY")}
                  className="px-4 py-2 rounded-lg border border-border bg-surface hover:bg-surface-hover text-foreground text-xs font-medium transition-colors cursor-pointer"
                >
                  Upload Another File
                </button>
              </div>

              <div className="mt-5 pt-4 border-t border-border w-full flex flex-col items-center gap-2 pointer-events-auto">
                <p className="text-xs text-muted-foreground">
                  CertifiTrack is 100% free & open-source. Saved you manual work?
                </p>
                <a 
                  href="https://buymeacoffee.com/kurosys" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-hover text-foreground text-xs font-medium shadow-sm transition-all hover:scale-105"
                >
                  <span>☕</span>
                  <span>Support on Buy Me a Coffee</span>
                </a>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {status === "ERROR" && (
        <div className="mt-6 p-4 rounded-xl bg-[var(--color-status-expired-bg)] border border-[var(--color-status-expired-border)] text-[var(--color-status-expired)] text-center">
          <p className="font-medium">Error: {errorMessage}</p>
          <button 
            onClick={() => setStatus("READY")}
            className="mt-3 text-sm underline hover:opacity-80 transition-opacity cursor-pointer"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
