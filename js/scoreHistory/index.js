// Score History Module
// Main orchestration for score rendering and export

import { renderScore, getSvgElement } from './ScoreRenderer.js';
import { downloadLilypond } from './exportLilypond.js';
import { downloadMusicXml } from './exportMusicXml.js';
import { exportToPdf } from './exportPdf.js';

/**
 * Initialize score history functionality
 * @param {HTMLElement} modalElement - The score modal element
 * @returns {Object} Score history API
 */
export function initScoreHistory(modalElement) {
    const canvas = modalElement.querySelector('#score-canvas');
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
                const svg = getSvgElement(canvas);
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
         */
        render(historyData) {
            currentHistoryData = historyData || [];
            renderScore(canvas, currentHistoryData);
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
            const svg = getSvgElement(canvas);
            if (svg) {
                exportToPdf(svg);
            }
        }
    };
}
