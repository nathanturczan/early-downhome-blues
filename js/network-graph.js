// Network Graph Visualization using D3.js force-directed layout
import { edges, frequencies, displayNames } from './network.js';

let simulation = null;
let currentNoteHighlight = null;
let networkModal = null;

// Get unique nodes from edges
function getNodes() {
    const nodeSet = new Set();
    edges.forEach(({ from, to }) => {
        nodeSet.add(from);
        nodeSet.add(to);
    });

    // Sort by frequency (pitch) for initial positioning
    const nodes = Array.from(nodeSet).map(id => ({
        id,
        freq: frequencies[id] || 261,
        display: displayNames[id] || id
    }));

    nodes.sort((a, b) => a.freq - b.freq);
    return nodes;
}

// Get links from edges
function getLinks() {
    return edges.map(({ from, to }) => ({
        source: from,
        target: to
    }));
}

// Initialize the network graph
export function initNetworkGraph(onNoteClick) {
    const networkBtn = document.getElementById('network-btn');
    networkModal = document.getElementById('network-modal');
    const modalClose = networkModal.querySelector('.modal-close');
    const modalBackdrop = networkModal.querySelector('.modal-backdrop');
    const graphContainer = document.getElementById('network-graph');

    // Modal open/close
    networkBtn.addEventListener('click', () => {
        networkModal.classList.remove('hidden');
        // Render graph when modal opens (so we have correct dimensions)
        setTimeout(() => renderGraph(graphContainer, onNoteClick), 50);
    });

    modalClose.addEventListener('click', () => {
        networkModal.classList.add('hidden');
    });

    modalBackdrop.addEventListener('click', () => {
        networkModal.classList.add('hidden');
    });
}

// Render the force-directed graph
function renderGraph(container, onNoteClick) {
    // Clear previous graph
    container.innerHTML = '';

    const width = container.clientWidth;
    const height = container.clientHeight;
    const nodeRadius = 28;

    const nodes = getNodes();
    const links = getLinks();

    // Create SVG
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    // Define arrow marker
    svg.append('defs').append('marker')
        .attr('id', 'arrowhead')
        .attr('viewBox', '-0 -5 10 10')
        .attr('refX', nodeRadius + 8)
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .append('path')
        .attr('d', 'M 0,-5 L 10,0 L 0,5')
        .attr('class', 'edge-arrow');

    // Create force simulation
    simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links)
            .id(d => d.id)
            .distance(100))
        .force('charge', d3.forceManyBody().strength(-400))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(nodeRadius + 10))
        .force('y', d3.forceY().y(d => {
            // Arrange by pitch - lower notes at bottom
            const minFreq = Math.min(...nodes.map(n => n.freq));
            const maxFreq = Math.max(...nodes.map(n => n.freq));
            const normalized = (d.freq - minFreq) / (maxFreq - minFreq);
            return height - (normalized * (height - 100) + 50);
        }).strength(0.3));

    // Draw links (edges with arrows)
    const link = svg.append('g')
        .selectAll('path')
        .data(links)
        .enter()
        .append('path')
        .attr('class', 'edge-line')
        .attr('marker-end', 'url(#arrowhead)');

    // Draw nodes
    const node = svg.append('g')
        .selectAll('g')
        .data(nodes)
        .enter()
        .append('g')
        .attr('class', 'node')
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));

    // Node circles
    node.append('circle')
        .attr('class', 'node-circle')
        .attr('r', nodeRadius)
        .on('click', (event, d) => {
            if (onNoteClick) {
                onNoteClick(d.id);
                networkModal.classList.add('hidden');
            }
        });

    // Mini staff lines inside each node
    node.each(function(d) {
        const g = d3.select(this);
        const staffHeight = 16;
        const lineSpacing = staffHeight / 4;

        for (let i = 0; i < 5; i++) {
            g.append('line')
                .attr('class', 'node-staff')
                .attr('x1', -18)
                .attr('x2', 18)
                .attr('y1', -staffHeight/2 + i * lineSpacing)
                .attr('y2', -staffHeight/2 + i * lineSpacing);
        }
    });

    // Node labels (note names)
    node.append('text')
        .attr('class', 'node-label')
        .attr('dy', 2)
        .html(d => d.display);

    // Update positions on each tick
    simulation.on('tick', () => {
        // Keep nodes within bounds
        nodes.forEach(d => {
            d.x = Math.max(nodeRadius, Math.min(width - nodeRadius, d.x));
            d.y = Math.max(nodeRadius, Math.min(height - nodeRadius, d.y));
        });

        // Update link paths (curved)
        link.attr('d', d => {
            const dx = d.target.x - d.source.x;
            const dy = d.target.y - d.source.y;
            const dr = Math.sqrt(dx * dx + dy * dy) * 0.8;

            // Check if there's a reverse link
            const hasReverse = links.some(l =>
                l.source.id === d.target.id && l.target.id === d.source.id
            );

            if (hasReverse) {
                // Curve the line if bidirectional
                return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
            } else {
                // Straight line
                return `M${d.source.x},${d.source.y}L${d.target.x},${d.target.y}`;
            }
        });

        // Update node positions
        node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Drag functions
    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
}

// Highlight a note in the graph
export function highlightNote(lilyNote) {
    currentNoteHighlight = lilyNote;

    d3.selectAll('.node-circle')
        .classed('current', d => d.id === lilyNote);

    d3.selectAll('.node-label')
        .classed('current', d => d.id === lilyNote);
}
