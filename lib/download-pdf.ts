function ascii(text: string) {
  return Uint8Array.from(text, (char) => char.charCodeAt(0));
}

function concat(parts: Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export function jpegToPdfBlob(jpeg: Uint8Array, imgWidth: number, imgHeight: number) {
  const pageW = 595.28;
  const pageH = 841.89;
  const margin = 28;
  const maxW = pageW - margin * 2;
  const maxH = pageH - margin * 2;
  const scale = Math.min(maxW / imgWidth, maxH / imgHeight);
  const drawW = imgWidth * scale;
  const drawH = imgHeight * scale;
  const x = (pageW - drawW) / 2;
  const y = (pageH - drawH) / 2;
  const content = `q ${drawW.toFixed(2)} 0 0 ${drawH.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /Im0 Do Q\n`;

  const objects: Uint8Array[] = [
    ascii("<< /Type /Catalog /Pages 2 0 R >>"),
    ascii("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    ascii(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW.toFixed(2)} ${pageH.toFixed(2)}] /Contents 4 0 R /Resources << /XObject << /Im0 5 0 R >> >> >>`
    ),
    ascii(`<< /Length ${content.length} >>\nstream\n${content}endstream`),
    concat([
      ascii(
        `<< /Type /XObject /Subtype /Image /Width ${Math.round(imgWidth)} /Height ${Math.round(imgHeight)} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`
      ),
      jpeg,
      ascii("\nendstream"),
    ]),
  ];

  const chunks: Uint8Array[] = [ascii("%PDF-1.4\n")];
  const offsets = [0];
  let cursor = chunks[0].length;
  objects.forEach((body, index) => {
    offsets.push(cursor);
    const header = ascii(`${index + 1} 0 obj\n`);
    const footer = ascii("\nendobj\n");
    chunks.push(header, body, footer);
    cursor += header.length + body.length + footer.length;
  });

  const xrefStart = cursor;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  chunks.push(ascii(xref));
  return new Blob([concat(chunks)], { type: "application/pdf" });
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
