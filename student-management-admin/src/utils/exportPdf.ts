import html2pdf from 'html2pdf.js';

export async function waitForImages(root: HTMLElement, timeoutMs = 8000): Promise<void> {
  const images = Array.from(root.querySelectorAll('img'));

  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }

          const timer = window.setTimeout(resolve, timeoutMs);
          const done = () => {
            window.clearTimeout(timer);
            resolve();
          };

          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
        })
    )
  );
}

export async function exportElementToPdf(
  element: HTMLElement,
  filename: string,
  options?: {
    orientation?: 'portrait' | 'landscape';
    format?: 'a4' | 'letter';
    margin?: number | number[];
  }
): Promise<void> {
  await waitForImages(element);
  await new Promise((resolve) => window.setTimeout(resolve, 400));

  const orientation = options?.orientation ?? 'portrait';
  const format = options?.format ?? 'a4';
  const margin = options?.margin ?? [8, 8, 8, 8];

  await html2pdf()
    .set({
      margin,
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      },
      jsPDF: { unit: 'mm', format, orientation },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    })
    .from(element)
    .save();
}

export function sanitizePdfFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-').replace(/\s+/g, '-').slice(0, 120);
}