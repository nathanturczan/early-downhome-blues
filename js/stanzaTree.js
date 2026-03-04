// js/stanzaTree.js
//
// D3-based tree visualization for stanza structure
// Displays hierarchical phrase/line/stanza contour analysis

import { getContourShortName, getGeneralCaseName } from './contourAnalysis.js';
import { displayNames, frequencies } from './network.js';

// Tree container element
let treeContainer = null;
let tooltipEl = null;

// Node labels
const PHRASE_LABELS = ['phrase a', 'phrase b', 'phrase c', 'phrase d', 'phrase e', 'phrase f'];
const LINE_LABELS = ['line 1', 'line 2', 'line 3'];

/**
 * Initialize the tree visualization
 * @param {string} containerId - DOM element ID for the tree container
 */
export function initTree(containerId) {
    treeContainer = document.getElementById(containerId);
    if (!treeContainer) return;

    // Clear existing content
    treeContainer.innerHTML = '';

    // Create tooltip element
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'tree-tooltip hidden';
    document.body.appendChild(tooltipEl);
}

/**
 * Build tree data structure for D3 visualization
 * Structure: S (Stanza) → Z → Line 1/2/3 → [phrase a/b], [phrase c/d], [phrase e/f]
 *
 * @param {number} stanzaNumber - Current stanza number
 * @param {Object} position - Current position from getPosition()
 * @param {Object} phraseContours - { 0: ContourData, 1: ContourData, ... }
 * @param {Object} lineContours - { 1: ContourData, 2: ContourData, 3: ContourData }
 * @param {Object} stanzaContour - Contour data for the entire stanza
 * @returns {Object} D3 hierarchy-compatible tree data
 */
export function buildTreeData(stanzaNumber, position, phraseContours = {}, lineContours = {}, stanzaContour = null) {
    const currentPhraseIndex = position?.phraseIndex ?? 0;
    const currentLine = position?.line ?? 1;

    // Build phrase nodes
    const buildPhraseNode = (phraseIndex, label) => {
        const contour = phraseContours[phraseIndex];
        const isActive = phraseIndex === currentPhraseIndex;
        const isComplete = phraseIndex < currentPhraseIndex;

        return {
            name: label,
            nodeType: 'phrase',
            phraseIndex: phraseIndex,
            state: isActive ? 'active' : isComplete ? 'complete' : 'pending',
            contour: contour || null
        };
    };

    // Build line nodes
    const buildLineNode = (lineNum, phraseIndices, phraseLabels) => {
        const lineContour = lineContours[lineNum];
        const isActive = currentLine === lineNum;
        const isComplete = currentLine > lineNum;

        return {
            name: LINE_LABELS[lineNum - 1],
            nodeType: 'line',
            lineNum: lineNum,
            state: isActive ? 'active' : isComplete ? 'complete' : 'pending',
            contour: lineContour || null,
            children: phraseIndices.map((idx, i) => buildPhraseNode(idx, phraseLabels[i]))
        };
    };

    // Build the full tree
    return {
        name: 'song S',
        nodeType: 'stanza',
        state: 'active',
        contour: stanzaContour,  // Stanza-level contour for tooltip
        children: [
            {
                name: 'stanza Z',
                nodeType: 'zone',
                state: 'active',
                contour: stanzaContour,  // Same contour for zone node
                children: [
                    buildLineNode(1, [0, 1], [PHRASE_LABELS[0], PHRASE_LABELS[1]]),
                    buildLineNode(2, [2, 3], [PHRASE_LABELS[2], PHRASE_LABELS[3]]),
                    buildLineNode(3, [4, 5], [PHRASE_LABELS[4], PHRASE_LABELS[5]])
                ]
            }
        ]
    };
}

/**
 * Render the tree using D3
 * @param {Object} treeData - Tree data from buildTreeData
 */
export function renderTree(treeData) {
    if (!treeContainer || typeof d3 === 'undefined') return;

    // Clear existing content
    treeContainer.innerHTML = '';

    // Dimensions - responsive to container
    const containerRect = treeContainer.getBoundingClientRect();
    const width = Math.max(containerRect.width, 300);
    const height = Math.max(containerRect.height, 120);
    const margin = { top: 25, right: 80, bottom: 25, left: 40 }; // More vertical margin to prevent cutoff
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create SVG with viewBox for responsiveness
    const svg = d3.select(treeContainer)
        .append('svg')
        .attr('class', 'stanza-tree')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet');

    let g = svg.append('g');

    // Create hierarchy
    const root = d3.hierarchy(treeData);

    // Tree layout - horizontal with fixed node spacing
    const ROW_SPACING = 18; // Vertical spacing between nodes
    const COL_SPACING = innerWidth / (root.height || 1); // Horizontal spacing based on tree depth

    const treeLayout = d3.tree()
        .nodeSize([ROW_SPACING, COL_SPACING])
        .separation((a, b) => a.parent === b.parent ? 1 : 1.2);

    treeLayout(root);

    // Calculate vertical offset to center tree
    const yExtent = d3.extent(root.descendants(), d => d.x);
    const treeHeight = yExtent[1] - yExtent[0];
    const yOffset = (innerHeight - treeHeight) / 2 - yExtent[0];

    // Apply transform to center tree
    g.attr('transform', `translate(${margin.left},${margin.top + yOffset})`);

    // Link generator
    const linkGen = d3.linkHorizontal()
        .x(d => d.y)
        .y(d => d.x);

    // Draw links
    g.selectAll('.tree-link')
        .data(root.links())
        .enter()
        .append('path')
        .attr('class', d => {
            const sourceState = d.source.data.state;
            const targetState = d.target.data.state;
            let classes = 'tree-link';
            if (sourceState === 'active' || targetState === 'active') {
                classes += ' active';
            } else if (sourceState === 'complete' && targetState === 'complete') {
                classes += ' complete';
            }
            return classes;
        })
        .attr('d', linkGen);

    // Draw nodes
    const nodes = g.selectAll('.tree-node')
        .data(root.descendants())
        .enter()
        .append('g')
        .attr('class', d => `tree-node ${d.data.nodeType} ${d.data.state}`)
        .attr('transform', d => `translate(${d.y},${d.x})`);

    // Node circles
    nodes.append('circle')
        .attr('r', d => {
            if (d.data.nodeType === 'stanza') return 8;
            if (d.data.nodeType === 'zone') return 6;
            if (d.data.nodeType === 'line') return 5;
            return 4;
        });

    // Node labels - positioned to the right of nodes
    const textElements = nodes.append('text')
        .attr('dx', 10)
        .attr('dy', 4)
        .text(d => d.data.name || '');

    // Second pass: add background rects behind text (inserted before text in DOM)
    textElements.each(function(d) {
        const textEl = this;
        const bbox = textEl.getBBox();
        const padding = 2;

        // Insert rect before the text element
        d3.select(textEl.parentNode)
            .insert('rect', 'text')
            .attr('class', 'text-bg')
            .attr('x', bbox.x - padding)
            .attr('y', bbox.y - padding)
            .attr('width', bbox.width + padding * 2)
            .attr('height', bbox.height + padding * 2)
            .attr('fill', 'rgb(237, 232, 220)') // Match tree container background
            .attr('rx', 2)
            .style('pointer-events', 'none'); // Don't block hover events
    });

    // Hover interactions
    nodes.on('mouseenter', (event, d) => {
        if (d.data.contour) {
            showTooltip(event, d.data);
        }
    }).on('mouseleave', () => {
        hideTooltip();
    });
}

/**
 * Generate SVG path for contour shape based on contour type
 * Shapes based on Titon's contour analysis (see melodic-contour.md)
 */
function getContourShapeSVG(shlf, contourType) {
    if (!shlf) return '';

    const width = 100;
    const height = 60;
    const paddingX = 8;
    const paddingTop = 16; // Extra space for labels above points
    const paddingBottom = 8;

    // Normalize pitches to fit in the SVG
    const pitches = [shlf.S, shlf.H, shlf.L, shlf.F].filter(p => p != null);
    if (pitches.length < 2) return '';

    const minPitch = Math.min(...pitches);
    const maxPitch = Math.max(...pitches);
    const range = maxPitch - minPitch || 1;

    // Map pitch to Y coordinate (inverted: higher pitch = lower Y)
    const pitchToY = (pitch) => {
        return paddingTop + (height - paddingTop - paddingBottom) * (1 - (pitch - minPitch) / range);
    };

    const xS = paddingX;
    const xF = width - paddingX;
    const x1 = paddingX + (width - 2 * paddingX) * 0.33;
    const x2 = paddingX + (width - 2 * paddingX) * 0.66;

    // Build points array with labels based on contour type
    // Each point: { x, y, label }
    let points = [];

    switch (contourType) {
        // General Case I: Falling (S > F)
        case 'IA': // S=H, F=L - pure descent
            points = [
                { x: xS, y: pitchToY(shlf.S), label: 'S=H' },
                { x: xF, y: pitchToY(shlf.F), label: 'F=L' }
            ];
            break;
        case 'IB': // Rise to H, then fall to F=L
            points = [
                { x: xS, y: pitchToY(shlf.S), label: 'S' },
                { x: x1, y: pitchToY(shlf.H), label: 'H' },
                { x: xF, y: pitchToY(shlf.F), label: 'F=L' }
            ];
            break;
        case 'IC': // S=H, dips to L, ends at F
            points = [
                { x: xS, y: pitchToY(shlf.S), label: 'S=H' },
                { x: x2, y: pitchToY(shlf.L), label: 'L' },
                { x: xF, y: pitchToY(shlf.F), label: 'F' }
            ];
            break;
        case 'IDa': // H before L: S → H → L → F
            points = [
                { x: xS, y: pitchToY(shlf.S), label: 'S' },
                { x: x1, y: pitchToY(shlf.H), label: 'H' },
                { x: x2, y: pitchToY(shlf.L), label: 'L' },
                { x: xF, y: pitchToY(shlf.F), label: 'F' }
            ];
            break;
        case 'IDb': // L before H: S → L → H → F
            points = [
                { x: xS, y: pitchToY(shlf.S), label: 'S' },
                { x: x1, y: pitchToY(shlf.L), label: 'L' },
                { x: x2, y: pitchToY(shlf.H), label: 'H' },
                { x: xF, y: pitchToY(shlf.F), label: 'F' }
            ];
            break;

        // General Case II: Rising (S < F)
        case 'IIA': // S=L, F=H - pure ascent
            points = [
                { x: xS, y: pitchToY(shlf.S), label: 'S=L' },
                { x: xF, y: pitchToY(shlf.F), label: 'F=H' }
            ];
            break;
        case 'IIB': // S=L, peak at H, fall to F
            points = [
                { x: xS, y: pitchToY(shlf.S), label: 'S=L' },
                { x: x1, y: pitchToY(shlf.H), label: 'H' },
                { x: xF, y: pitchToY(shlf.F), label: 'F' }
            ];
            break;
        case 'IIC': // Dip to L, rise to F=H
            points = [
                { x: xS, y: pitchToY(shlf.S), label: 'S' },
                { x: x1, y: pitchToY(shlf.L), label: 'L' },
                { x: xF, y: pitchToY(shlf.F), label: 'F=H' }
            ];
            break;
        case 'IIDa': // H before L: S → H → L → F
            points = [
                { x: xS, y: pitchToY(shlf.S), label: 'S' },
                { x: x1, y: pitchToY(shlf.H), label: 'H' },
                { x: x2, y: pitchToY(shlf.L), label: 'L' },
                { x: xF, y: pitchToY(shlf.F), label: 'F' }
            ];
            break;
        case 'IIDb': // L before H: S → L → H → F
            points = [
                { x: xS, y: pitchToY(shlf.S), label: 'S' },
                { x: x1, y: pitchToY(shlf.L), label: 'L' },
                { x: x2, y: pitchToY(shlf.H), label: 'H' },
                { x: xF, y: pitchToY(shlf.F), label: 'F' }
            ];
            break;

        // General Case III: Level (S = F)
        case 'IIIA': // S=H=L=F - flat
            points = [
                { x: xS, y: pitchToY(shlf.S), label: 'S=H=L=F' },
                { x: xF, y: pitchToY(shlf.F), label: '' }
            ];
            break;
        case 'IIIB': // Arch: S=L=F, peak at H
            points = [
                { x: xS, y: pitchToY(shlf.S), label: 'S' },
                { x: (xS + xF) / 2, y: pitchToY(shlf.H), label: 'H' },
                { x: xF, y: pitchToY(shlf.F), label: 'F' }
            ];
            break;
        case 'IIIC': // Trough: S=H=F, dip at L
            points = [
                { x: xS, y: pitchToY(shlf.S), label: 'S' },
                { x: (xS + xF) / 2, y: pitchToY(shlf.L), label: 'L' },
                { x: xF, y: pitchToY(shlf.F), label: 'F' }
            ];
            break;
        case 'IIIDa': // Peak-Trough: S=F, H before L
            points = [
                { x: xS, y: pitchToY(shlf.S), label: 'S' },
                { x: x1, y: pitchToY(shlf.H), label: 'H' },
                { x: x2, y: pitchToY(shlf.L), label: 'L' },
                { x: xF, y: pitchToY(shlf.F), label: 'F' }
            ];
            break;
        case 'IIIDb': // Trough-Peak: S=F, L before H
            points = [
                { x: xS, y: pitchToY(shlf.S), label: 'S' },
                { x: x1, y: pitchToY(shlf.L), label: 'L' },
                { x: x2, y: pitchToY(shlf.H), label: 'H' },
                { x: xF, y: pitchToY(shlf.F), label: 'F' }
            ];
            break;

        default:
            // Fallback: S → H → L → F
            points = [
                { x: xS, y: pitchToY(shlf.S), label: 'S' },
                { x: x1, y: pitchToY(shlf.H), label: 'H' },
                { x: x2, y: pitchToY(shlf.L), label: 'L' },
                { x: xF, y: pitchToY(shlf.F), label: 'F' }
            ];
    }

    // Create path
    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    // Color map for labels
    const labelColors = { 'S': '#4a9', 'H': '#f64', 'L': '#48f', 'F': '#fa4' };
    const getColor = (label) => {
        if (label.includes('S')) return labelColors['S'];
        if (label.includes('H')) return labelColors['H'];
        if (label.includes('L')) return labelColors['L'];
        if (label.includes('F')) return labelColors['F'];
        return '#888';
    };

    return `
        <svg class="tooltip-contour-shape" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
            <path d="${pathData}" fill="none" stroke="rgb(145, 56, 47)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            ${points.map(p => `
                <circle cx="${p.x}" cy="${p.y}" r="4" fill="${getColor(p.label)}"/>
                ${p.label ? `<text x="${p.x}" y="${p.y - 6}" text-anchor="middle" fill="#ccc" font-size="8">${p.label}</text>` : ''}
            `).join('')}
        </svg>
    `;
}

/**
 * Show tooltip with contour details
 */
function showTooltip(event, data) {
    if (!tooltipEl || !data.contour) return;

    const contour = data.contour;
    const shlf = contour.shlf;

    // Format S/H/L/F pitches for display
    const formatPitch = (pitch) => {
        if (!pitch) return '—';
        // Find the note name for this pitch value
        const note = contour.notes?.find(n => {
            const freq = 440 * Math.pow(2, (pitch - 69) / 12);
            return Math.abs(freq - (frequencies?.[n] || 0)) < 1;
        });
        if (note && displayNames[note]) {
            return displayNames[note];
        }
        return Math.round(pitch);
    };

    const phraseName = data.name || '';

    let html = `
        <div class="tooltip-title">${phraseName}</div>
        <div class="tooltip-header">
            <span class="tooltip-label">Contour Type:</span>
            <span class="tooltip-type">${contour.type || '—'}</span>
            <span class="tooltip-case">${getGeneralCaseName(contour.generalCase)}</span>
        </div>
        <div class="tooltip-desc">${contour.description || ''}</div>
    `;

    // Add contour shape visualization
    if (shlf) {
        html += getContourShapeSVG(shlf, contour.type);
    }

    if (shlf) {
        html += `
            <div class="tooltip-shlf">
                <span style="color:#4a9">S: ${formatPitch(shlf.S)}</span>
                <span style="color:#f64">H: ${formatPitch(shlf.H)}</span>
                <span style="color:#48f">L: ${formatPitch(shlf.L)}</span>
                <span style="color:#fa4">F: ${formatPitch(shlf.F)}</span>
            </div>
        `;
    }

    html += `<div class="tooltip-notes">${contour.noteCount || 0} notes</div>`;

    tooltipEl.innerHTML = html;
    tooltipEl.classList.remove('hidden');

    // Position tooltip - check if near right edge
    const tooltipWidth = 220; // max-width from CSS
    const tooltipHeight = 180; // approximate height
    const margin = 10;

    let x = event.pageX + margin;
    let y = event.pageY + margin;

    // If tooltip would overflow right edge, position to the left of cursor
    if (x + tooltipWidth > window.innerWidth - margin) {
        x = event.pageX - tooltipWidth - margin;
    }

    // If tooltip would overflow bottom edge, position above cursor
    if (y + tooltipHeight > window.innerHeight - margin) {
        y = event.pageY - tooltipHeight - margin;
    }

    // Ensure tooltip doesn't go off left or top edge
    x = Math.max(margin, x);
    y = Math.max(margin, y);

    tooltipEl.style.left = `${x}px`;
    tooltipEl.style.top = `${y}px`;
}

/**
 * Hide tooltip
 */
function hideTooltip() {
    if (tooltipEl) {
        tooltipEl.classList.add('hidden');
    }
}

