import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function useQrUrl(text: string): string {
  const [dataUrl, setDataUrl] = useState("");
  useEffect(() => {
    let active = true;
    if (!text) {
      setDataUrl("");
      return;
    }
    QRCode.toDataURL(text, { width: 320, margin: 1, color: { dark: "#1a2e1a", light: "#ffffff" } })
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch(() => {
        if (active) setDataUrl("");
      });
    return () => {
      active = false;
    };
  }, [text]);
  return dataUrl;
}
