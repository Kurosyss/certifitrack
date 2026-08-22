import React, { useState } from "react";

export default function CheckoutButton({ 
  text, 
  className 
}: { 
  text: string; 
  className?: string; 
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    setError(false);
    try {
      const backendUrl = import.meta.env.PUBLIC_BACKEND_URL || "https://api.certifitrack.com";
      const res = await fetch(`${backendUrl}/v1/checkout`, { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No URL returned");
      }
    } catch (err) {
      console.error(err);
      setError(true);
      setLoading(false);
      setTimeout(() => setError(false), 3000);
    }
  };

  const baseStyles = "inline-flex items-center justify-center rounded-[6px] font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary disabled:opacity-50 disabled:pointer-events-none";
  const primaryStyles = "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_1px_2px_rgba(0,0,0,0.1)]";
  const sizeStyles = "h-11 px-8 text-base";

  return (
    <button 
      onClick={handleCheckout} 
      disabled={loading}
      className={`${baseStyles} ${primaryStyles} ${sizeStyles} ${className || ""}`}
    >
      {error ? "Error - Try Again" : loading ? "Redirecting..." : text}
    </button>
  );
}
