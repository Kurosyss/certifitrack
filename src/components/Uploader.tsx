import React, { useState, useEffect, useCallback } from "react";

type UploadState = "READY" | "UPLOADING" | "PROCESSING" | "SUCCESS" | "ERROR";

export default function Uploader() {
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<UploadState>("READY");
  const [errorMessage, setErrorMessage] = useState("");
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (t) {
      setToken(t);
    } else {
      setStatus("ERROR");
      setErrorMessage("Missing payment session token. Please start from the homepage.");
    }
  }, []);

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
  }, [token, status]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    if (status !== "READY" && status !== "ERROR") return;
    if (!token) return;

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
      const backendUrl = import.meta.env.PUBLIC_BACKEND_URL || "https://api.certifitrack.com";
      
      const res = await fetch(`${backendUrl}/v1/extract`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
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

  if (!token && status === "ERROR") {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center bg-red-50 text-red-900 rounded-2xl border border-red-200 mt-12">
        <h2 className="text-2xl font-bold mb-4">Invalid Session</h2>
        <p className="mb-6">{errorMessage}</p>
        <a href="/" className="inline-block bg-primary text-white font-medium px-6 py-3 rounded-full hover:bg-primary/90 transition-colors">
          Return Home
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto mt-12 mb-24 px-4">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl mb-4">
          Upload Your COI Folder
        </h1>
        <p className="text-lg text-slate-600">
          Your payment was successful. Upload your .zip of PDFs (or a single .pdf) below to generate your tracker.
        </p>
      </div>

      <div 
        className={`relative group flex flex-col items-center justify-center p-12 text-center rounded-3xl border-2 border-dashed transition-all ${
          dragActive 
            ? "border-primary bg-primary/5 shadow-xl scale-[1.02]" 
            : "border-slate-200 bg-white hover:border-primary/50 hover:bg-slate-50 shadow-sm"
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
              <h3 className="text-xl font-semibold text-slate-900">
                Click or drag file to this area
              </h3>
              <p className="text-sm text-slate-500">
                Supports .zip or .pdf up to 10MB
              </p>
            </>
          ) : status === "UPLOADING" ? (
            <>
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-2 animate-bounce">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 animate-pulse">
                Uploading securely...
              </h3>
            </>
          ) : status === "PROCESSING" ? (
            <>
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mb-2">
                <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900">
                Extracting COI Data
              </h3>
              <p className="text-sm text-slate-500">
                This usually takes 10-30 seconds depending on the file size.
              </p>
            </>
          ) : status === "SUCCESS" ? (
            <>
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-600 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900">
                Processing Complete
              </h3>
              <p className="text-sm text-slate-500">
                Your tracker has been downloaded. 
              </p>
            </>
          ) : null}
        </div>
      </div>

      {status === "ERROR" && token && (
        <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-800 text-center">
          <p className="font-medium">Error: {errorMessage}</p>
          <button 
            onClick={() => setStatus("READY")}
            className="mt-3 text-sm underline hover:text-red-900"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
