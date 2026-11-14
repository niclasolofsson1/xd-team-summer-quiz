import { useMemo } from "react";
import QRCode from "qrcode";

// The join QR, drawn in the browser from the real join address. Dark modules on a white card
// (quiet zone included in the card's padding), crisp at any size.
export function QrCode({ url }) {
  const modules = useMemo(() => {
    try {
      return QRCode.create(url, { errorCorrectionLevel: "M" }).modules;
    } catch {
      return null;
    }
  }, [url]);
  if (!modules) return null;

  const { size, data } = modules;
  let path = "";
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (data[y * size + x]) path += `M${x} ${y}h1v1h-1z`;
    }
  }
  return (
    <svg className="ds-qr__code" viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges" role="img" aria-label={`QR code for ${url}`}>
      <path d={path} fill="#161616" />
    </svg>
  );
}
