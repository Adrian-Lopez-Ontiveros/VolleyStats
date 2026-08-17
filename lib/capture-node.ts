const PLACEHOLDER =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

export async function captureNodePng(node: HTMLElement, backgroundColor = "#0B1F3A") {
  node.scrollIntoView({ block: "nearest", inline: "nearest" });
  await waitForImages(node);
  await waitForPaint();

  const rect = node.getBoundingClientRect();
  const width = Math.max(1, Math.round(Math.max(node.offsetWidth, rect.width)));
  const measuredHeight = Math.max(node.offsetHeight, rect.height);
  const height = Math.max(
    1,
    Math.round(measuredHeight > 40 ? measuredHeight : width * 1.4)
  );
  const ratio = Math.min(3, Math.max(2, window.devicePixelRatio || 2));

  const stage = document.createElement("div");
  stage.setAttribute("aria-hidden", "true");
  stage.style.cssText = [
    "position:fixed",
    `left:-${width + 24}px`,
    "top:0",
    `width:${width}px`,
    `height:${height}px`,
    "margin:0",
    "padding:0",
    "overflow:visible",
    "pointer-events:none",
    "z-index:-1",
    `background:${backgroundColor}`,
  ].join(";");

  const clone = node.cloneNode(true) as HTMLElement;
  clone.removeAttribute("id");
  clone.style.width = `${width}px`;
  clone.style.height = `${height}px`;
  clone.style.maxWidth = `${width}px`;
  clone.style.margin = "0";
  clone.style.transform = "none";
  clone.style.position = "relative";
  stage.appendChild(clone);
  document.body.appendChild(stage);

  try {
    await waitForImages(clone);
    await waitForPaint();

    const { toBlob } = await import("html-to-image");
    const blob = await toBlob(clone, {
      cacheBust: true,
      skipAutoScale: true,
      pixelRatio: ratio,
      backgroundColor,
      width,
      height,
      canvasWidth: Math.round(width * ratio),
      canvasHeight: Math.round(height * ratio),
      imagePlaceholder: PLACEHOLDER,
      style: {
        width: `${width}px`,
        height: `${height}px`,
        maxWidth: `${width}px`,
        margin: "0",
        transform: "none",
      },
    });

    if (!blob || blob.size < 500) {
      throw new Error("La imagen generada está vacía");
    }

    return blob;
  } finally {
    stage.remove();
  }
}

function waitForPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

async function waitForImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map(async (img) => {
      if (img.complete && img.naturalWidth > 0) return;
      try {
        await img.decode();
      } catch {
        await new Promise<void>((resolve) => {
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        });
      }
    })
  );
}
