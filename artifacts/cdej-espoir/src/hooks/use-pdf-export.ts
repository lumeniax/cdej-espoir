import { useState, useCallback } from "react";

export function usePdfExport() {
  const [exporting, setExporting] = useState(false);

  const exportToPdf = useCallback(async (elementId: string, filename: string = "dashboard.pdf") => {
    setExporting(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const element = document.getElementById(elementId);
      if (!element) throw new Error("Element not found: " + elementId);

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        onclone: (_doc: Document, clonedElement: HTMLElement) => {
          clonedElement.style.padding = "32px";
          clonedElement.style.background = "#ffffff";
          clonedElement.style.color = "#111827";

          const headers = clonedElement.querySelectorAll<HTMLElement>(".pdf-header-block");
          headers.forEach(h => {
            h.style.display = "block";
          });
        },
      });

      const imgW = 210;
      const pageH = 297;
      const imgH = (canvas.height * imgW) / canvas.width;
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      let heightLeft = imgH;
      let position = 0;
      const imgData = canvas.toDataURL("image/jpeg", 0.92);

      pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
      heightLeft -= pageH;

      while (heightLeft > 0) {
        position = heightLeft - imgH;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
        heightLeft -= pageH;
      }

      pdf.save(filename);
    } finally {
      setExporting(false);
    }
  }, []);

  return { exportToPdf, exporting };
}
