// PDF Export
// Exports rendered VexFlow SVG to PDF

/**
 * Export SVG element to PDF
 * Uses jsPDF and svg2pdf.js loaded dynamically
 * @param {SVGElement} svgElement - The SVG element to export
 * @param {string} filename - Output filename
 */
export async function exportToPdf(svgElement, filename = 'blues-melody.pdf') {
    if (!svgElement) {
        console.error('No SVG element to export');
        return;
    }

    try {
        // Dynamically load jsPDF and svg2pdf if not already loaded
        if (typeof window.jspdf === 'undefined') {
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
        }
        if (typeof window.svg2pdf === 'undefined') {
            await loadScript('https://cdn.jsdelivr.net/npm/svg2pdf.js@2.2.3/dist/svg2pdf.umd.min.js');
        }

        const { jsPDF } = window.jspdf;

        // Get SVG dimensions
        const svgWidth = svgElement.clientWidth || svgElement.getAttribute('width') || 800;
        const svgHeight = svgElement.clientHeight || svgElement.getAttribute('height') || 400;

        // Create PDF with appropriate orientation
        const isLandscape = svgWidth > svgHeight;
        const pdf = new jsPDF({
            orientation: isLandscape ? 'landscape' : 'portrait',
            unit: 'pt',
            format: [svgWidth + 40, svgHeight + 60]  // Add margins
        });

        // Add title
        pdf.setFontSize(16);
        pdf.text('Early Downhome Blues - Melody', 20, 25);

        // Clone SVG to avoid modifying original
        const svgClone = svgElement.cloneNode(true);

        // Render SVG to PDF
        await window.svg2pdf(svgClone, pdf, {
            x: 20,
            y: 40,
            width: svgWidth,
            height: svgHeight
        });

        // Save
        pdf.save(filename);
    } catch (error) {
        console.error('PDF export failed:', error);
        // Fallback: offer SVG download
        downloadSvg(svgElement, filename.replace('.pdf', '.svg'));
    }
}

/**
 * Load a script dynamically
 * @param {string} src - Script URL
 * @returns {Promise}
 */
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

/**
 * Download SVG as fallback
 * @param {SVGElement} svgElement - SVG element to download
 * @param {string} filename - Output filename
 */
export function downloadSvg(svgElement, filename = 'blues-melody.svg') {
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
