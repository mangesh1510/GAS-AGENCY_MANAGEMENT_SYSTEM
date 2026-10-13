import { useEffect } from "react";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

export default function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 3500);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);

  return (
    <div className={`gasflow-toast ${type}`} role="status">
      <span>
        {type === "success" ? "✓" : type === "error" ? "✕" : "ⓘ"}
      </span>

      <p>{message}</p>

      <button type="button" onClick={onClose} aria-label="Close notification">
        ×
      </button>
    </div>
  );
}