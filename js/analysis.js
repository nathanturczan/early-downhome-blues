// Network analysis - eigenvalues of transition matrix
import { edges, adjacency } from './network.js';

// Get all unique nodes
function getNodes() {
    const nodeSet = new Set();
    edges.forEach(({ from, to }) => {
        nodeSet.add(from);
        nodeSet.add(to);
    });
    return Array.from(nodeSet).sort();
}

// Build transition matrix (row-stochastic)
function buildTransitionMatrix(nodes) {
    const n = nodes.length;
    const nodeIndex = {};
    nodes.forEach((node, i) => nodeIndex[node] = i);

    // Initialize matrix with zeros
    const matrix = Array(n).fill(null).map(() => Array(n).fill(0));

    // Count outgoing edges
    nodes.forEach((from, i) => {
        const neighbors = adjacency[from] || [];
        if (neighbors.length > 0) {
            const prob = 1 / neighbors.length;
            neighbors.forEach(to => {
                const j = nodeIndex[to];
                if (j !== undefined) {
                    matrix[i][j] = prob;
                }
            });
        }
    });

    return { matrix, nodes, nodeIndex };
}

// Power iteration to find dominant eigenvector (stationary distribution)
function powerIteration(matrix, maxIter = 1000, tol = 1e-10) {
    const n = matrix.length;
    let v = Array(n).fill(1 / n);

    for (let iter = 0; iter < maxIter; iter++) {
        // Multiply: v_new = v * M (left multiply for row-stochastic)
        const vNew = Array(n).fill(0);
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                vNew[j] += v[i] * matrix[i][j];
            }
        }

        // Normalize
        const sum = vNew.reduce((a, b) => a + b, 0);
        for (let i = 0; i < n; i++) {
            vNew[i] /= sum;
        }

        // Check convergence
        let diff = 0;
        for (let i = 0; i < n; i++) {
            diff += Math.abs(vNew[i] - v[i]);
        }

        v = vNew;
        if (diff < tol) {
            return { vector: v, converged: true, iterations: iter + 1 };
        }
    }

    return { vector: v, converged: false, iterations: maxIter };
}

// Estimate second eigenvalue using deflated power iteration
function estimateSecondEigenvalue(matrix, stationaryDist) {
    const n = matrix.length;

    // Start with random vector orthogonal to stationary distribution
    let v = Array(n).fill(0).map(() => Math.random() - 0.5);

    // Orthogonalize against stationary distribution
    const orthogonalize = (vec) => {
        const dot = vec.reduce((sum, vi, i) => sum + vi * stationaryDist[i], 0);
        return vec.map((vi, i) => vi - dot * stationaryDist[i]);
    };

    v = orthogonalize(v);
    let norm = Math.sqrt(v.reduce((sum, vi) => sum + vi * vi, 0));
    v = v.map(vi => vi / norm);

    let eigenvalue = 0;
    for (let iter = 0; iter < 500; iter++) {
        // Multiply
        const vNew = Array(n).fill(0);
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                vNew[j] += v[i] * matrix[i][j];
            }
        }

        // Orthogonalize
        const vOrth = orthogonalize(vNew);

        // Calculate eigenvalue estimate (Rayleigh quotient)
        norm = Math.sqrt(vOrth.reduce((sum, vi) => sum + vi * vi, 0));
        if (norm < 1e-10) break;

        eigenvalue = vNew.reduce((sum, vi, i) => sum + vi * v[i], 0);
        v = vOrth.map(vi => vi / norm);
    }

    return Math.abs(eigenvalue);
}

// Find sink nodes (no outgoing edges)
function findSinkNodes(nodes) {
    return nodes.filter(node => !adjacency[node] || adjacency[node].length === 0);
}

// Find hub nodes (most outgoing edges)
function findHubNodes(nodes, topN = 3) {
    return nodes
        .map(node => ({ node, outDegree: (adjacency[node] || []).length }))
        .sort((a, b) => b.outDegree - a.outDegree)
        .slice(0, topN);
}

// Run analysis and log results
export function analyzeNetwork() {
    console.log('=== Network Analysis ===\n');

    const nodes = getNodes();
    console.log(`Nodes (${nodes.length}):`, nodes);

    const { matrix, nodeIndex } = buildTransitionMatrix(nodes);

    // Stationary distribution
    const { vector: stationary, converged, iterations } = powerIteration(matrix);
    console.log(`\nStationary distribution (converged: ${converged}, iterations: ${iterations}):`);

    const distribution = nodes
        .map((node, i) => ({ node, prob: stationary[i] }))
        .sort((a, b) => b.prob - a.prob);

    console.table(distribution.map(d => ({
        note: d.node,
        probability: (d.prob * 100).toFixed(2) + '%'
    })));

    // Second eigenvalue (mixing rate)
    const lambda2 = estimateSecondEigenvalue(matrix, stationary);
    console.log(`\nSecond largest eigenvalue (|λ₂|): ${lambda2.toFixed(4)}`);
    console.log(`Mixing time indicator: ${(-1 / Math.log(lambda2)).toFixed(2)} steps`);

    // Sink nodes
    const sinks = findSinkNodes(nodes);
    console.log(`\nSink nodes (no outgoing edges):`, sinks);

    // Hub nodes
    const hubs = findHubNodes(nodes);
    console.log('\nHub nodes (most connections):');
    console.table(hubs.map(h => ({ note: h.node, outDegree: h.outDegree })));

    // Transition matrix
    console.log('\nTransition matrix:');
    console.log('Rows:', nodes);
    console.table(matrix.map((row, i) => {
        const obj = { from: nodes[i] };
        row.forEach((p, j) => {
            if (p > 0) obj[nodes[j]] = p.toFixed(2);
        });
        return obj;
    }));

    return { nodes, matrix, stationary: distribution, lambda2, sinks, hubs };
}

// Export for use in console
window.analyzeNetwork = analyzeNetwork;
