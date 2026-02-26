// Score History Module
// Main orchestration for score rendering and export

import { renderScore, getSvgElement } from './ScoreRenderer.js';
import { downloadLilypond } from './exportLilypond.js';
import { downloadMusicXml } from './exportMusicXml.js';
import { exportToPdf } from './exportPdf.js';

/**
 * Initialize score history functionality
 * @param {HTMLElement} modalElement - The score modal element
 * @param {HTMLElement} inlineCanvas - Optional inline score canvas element
 * @returns {Object} Score history API
 */
export function initScoreHistory(modalElement, inlineCanvas = null) {
    const modalCanvas = modalElement.querySelector('#score-canvas');
    const exportBtns = modalElement.querySelectorAll('.export-btn');
    let currentHistoryData = [];

    // Set up export button handlers
    exportBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const format = btn.dataset.format;
            handleExport(format);
        });
    });

    /**
     * Handle export based on format
     * @param {string} format - Export format (lilypond, musicxml, pdf)
     */
    function handleExport(format) {
        if (currentHistoryData.length === 0) {
            console.warn('No history data to export');
            return;
        }

        switch (format) {
            case 'lilypond':
                downloadLilypond(currentHistoryData);
                break;
            case 'musicxml':
                downloadMusicXml(currentHistoryData);
                break;
            case 'pdf':
                const svg = getSvgElement(modalCanvas);
                if (svg) {
                    exportToPdf(svg);
                }
                break;
            default:
                console.warn(`Unknown export format: ${format}`);
        }
    }

    return {
        /**
         * Render score with given history data
         * @param {Array} historyData - Array of {note, position, stanza}
         * @param {boolean} modalOnly - If true, only render to modal canvas
         */
        render(historyData, modalOnly = false) {
            currentHistoryData = historyData || [];
            if (!modalOnly && inlineCanvas) {
                renderScore(inlineCanvas, currentHistoryData);
            }
            renderScore(modalCanvas, currentHistoryData);
        },

        /**
         * Render only to inline canvas (for live updates)
         * @param {Array} historyData - Array of {note, position, stanza}
         */
        renderInline(historyData) {
            currentHistoryData = historyData || [];
            if (inlineCanvas) {
                renderScore(inlineCanvas, currentHistoryData);
            }
        },

        /**
         * Export to LilyPond format
         */
        exportLilypond() {
            downloadLilypond(currentHistoryData);
        },

        /**
         * Export to MusicXML format
         */
        exportMusicXml() {
            downloadMusicXml(currentHistoryData);
        },

        /**
         * Export to PDF format
         */
        exportPdf() {
            const svg = getSvgElement(modalCanvas);
            if (svg) {
                exportToPdf(svg);
            }
        }
    };
}
