// PDF Export
// Exports rendered VexFlow SVG to PDF

/**
 * Export SVG element to PDF
 * Uses jsPDF with canvas-based rendering for reliability
 * @param {SVGElement} svgElement - The SVG element to export
 * @param {string} filename - Output filename
 */
export async function exportToPdf(svgElement, filename = 'blues-melody.pdf') {
    if (!svgElement) {
        console.error('No SVG element to export');
        return;
    }

    try {
        // Dynamically load jsPDF if not already loaded
        if (typeof window.jspdf === 'undefined') {
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
        }

        const { jsPDF } = window.jspdf;

        // Get SVG dimensions
        const svgWidth = parseFloat(svgElement.getAttribute('width')) || svgElement.clientWidth || 800;
        const svgHeight = parseFloat(svgElement.getAttribute('height')) || svgElement.clientHeight || 400;

        // Create a clean SVG string with proper namespace and dimensions
        const svgClone = svgElement.cloneNode(true);
        svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svgClone.setAttribute('width', svgWidth);
        svgClone.setAttribute('height', svgHeight);

        // Convert SVG to data URL via canvas for reliable rendering
        const svgString = new XMLSerializer().serializeToString(svgClone);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);

        // Load SVG into an image
        const img = new Image();
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = svgUrl;
        });

        // Draw to canvas at higher resolution for quality
        const scale = 2;
        const canvas = document.createElement('canvas');
        canvas.width = svgWidth * scale;
        canvas.height = svgHeight * scale;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);

        URL.revokeObjectURL(svgUrl);

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

        // Add canvas image to PDF
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 20, 40, svgWidth, svgHeight);

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
