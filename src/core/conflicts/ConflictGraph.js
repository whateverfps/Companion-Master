/**
 * ============================================================================
 * Mission Companion
 * Conflict Engine
 *
 * File:
 *     ConflictGraph.js
 *
 * Build:
 *     Commit 2
 *
 * Purpose:
 *     Directed weighted graph used by the reasoning engine.
 *
 * Commit 2 adds:
 *     - Breadth-first traversal
 *     - Depth-first traversal
 *     - Reachability checks
 *     - Ancestor and descendant lookup
 *     - Shortest-path search
 *     - Directed-cycle detection
 *     - Topological sorting
 *     - Weakly connected components
 *     - Subgraph extraction
 *     - Serialization and deserialization
 * ============================================================================
 */

export const NodeType = Object.freeze({
    REQUIREMENT: "requirement",
    DOCUMENT: "document",
    SECTION: "section",
    PERSON: "person",
    ROLE: "role",
    SPECIFICATION: "specification",
    DRAWING: "drawing",
    DELIVERABLE: "deliverable",
    RISK: "risk",
    QUESTION: "question",
    DECISION: "decision",
    CONFLICT: "conflict"
});

export const EdgeType = Object.freeze({
    REFERENCES: "references",
    REQUIRES: "requires",
    DEPENDS_ON: "depends_on",
    SATISFIES: "satisfies",
    CONTRADICTS: "contradicts",
    DEFINES: "defines",
    IMPLEMENTS: "implements",
    RESPONSIBLE_FOR: "responsible_for",
    PRECEDES: "precedes",
    SUPPORTS: "supports"
});

function uuid(prefix = "ID") {
    return (
        `${prefix}-` +
        Math.random().toString(36).substring(2, 12) +
        "-" +
        Date.now().toString(36)
    );
}

function assertNonEmptyString(value, name) {
    if (typeof value !== "string" || value.trim() === "") {
        throw new TypeError(`${name} must be a non-empty string.`);
    }
}

function clonePlainObject(value) {
    return value == null
        ? {}
        : JSON.parse(JSON.stringify(value));
}

export class ConflictNode {
    constructor(data = {}) {
        this.id = data.id || uuid("N");
        this.type = data.type || NodeType.REQUIREMENT;
        this.title = data.title || "";
        this.text = data.text || "";
        this.source = data.source || "";
        this.document = data.document || "";
        this.section = data.section || "";
        this.metadata = clonePlainObject(data.metadata);
        this.evidence = Array.isArray(data.evidence)
            ? data.evidence.map(clonePlainObject)
            : [];
    }

    addEvidence(evidence) {
        if (evidence == null || typeof evidence !== "object") {
            throw new TypeError("Evidence must be an object.");
        }

        this.evidence.push(clonePlainObject(evidence));
        return this;
    }

    toJSON() {
        return {
            id: this.id,
            type: this.type,
            title: this.title,
            text: this.text,
            source: this.source,
            document: this.document,
            section: this.section,
            metadata: clonePlainObject(this.metadata),
            evidence: this.evidence.map(clonePlainObject)
        };
    }
}

export class ConflictEdge {
    constructor({
        id,
        from,
        to,
        type,
        weight = 1,
        confidence = 1,
        metadata = {}
    } = {}) {
        assertNonEmptyString(from, "from");
        assertNonEmptyString(to, "to");
        assertNonEmptyString(type, "type");

        if (!Number.isFinite(weight) || weight < 0) {
            throw new TypeError("weight must be a finite non-negative number.");
        }

        if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
            throw new TypeError("confidence must be between 0 and 1.");
        }

        this.id = id || uuid("E");
        this.from = from;
        this.to = to;
        this.type = type;
        this.weight = weight;
        this.confidence = confidence;
        this.metadata = clonePlainObject(metadata);
    }

    toJSON() {
        return {
            id: this.id,
            from: this.from,
            to: this.to,
            type: this.type,
            weight: this.weight,
            confidence: this.confidence,
            metadata: clonePlainObject(this.metadata)
        };
    }
}

export class ConflictGraph {
    constructor() {
        this.nodes = new Map();
        this.edges = new Map();
        this.outgoing = new Map();
        this.incoming = new Map();
        this.byType = new Map();
    }

    clear() {
        this.nodes.clear();
        this.edges.clear();
        this.outgoing.clear();
        this.incoming.clear();
        this.byType.clear();
    }

    addNode(node) {
        if (!(node instanceof ConflictNode)) {
            node = new ConflictNode(node);
        }

        const existing = this.nodes.get(node.id);

        if (existing && existing.type !== node.type) {
            this.byType.get(existing.type)?.delete(existing.id);
        }

        this.nodes.set(node.id, node);

        if (!this.outgoing.has(node.id)) {
            this.outgoing.set(node.id, new Set());
        }

        if (!this.incoming.has(node.id)) {
            this.incoming.set(node.id, new Set());
        }

        if (!this.byType.has(node.type)) {
            this.byType.set(node.type, new Set());
        }

        this.byType.get(node.type).add(node.id);

        return node;
    }

    getNode(id) {
        return this.nodes.get(id) || null;
    }

    hasNode(id) {
        return this.nodes.has(id);
    }

    removeNode(id) {
        if (!this.nodes.has(id)) {
            return false;
        }

        const outgoingIds = [...(this.outgoing.get(id) || [])];
        const incomingIds = [...(this.incoming.get(id) || [])];

        for (const edgeId of outgoingIds) {
            this.removeEdge(edgeId);
        }

        for (const edgeId of incomingIds) {
            this.removeEdge(edgeId);
        }

        const node = this.nodes.get(id);
        this.byType.get(node.type)?.delete(id);

        if (this.byType.get(node.type)?.size === 0) {
            this.byType.delete(node.type);
        }

        this.nodes.delete(id);
        this.outgoing.delete(id);
        this.incoming.delete(id);

        return true;
    }

    addEdge(edge) {
        if (!(edge instanceof ConflictEdge)) {
            edge = new ConflictEdge(edge);
        }

        if (!this.nodes.has(edge.from)) {
            throw new Error(`Unknown source node: ${edge.from}`);
        }

        if (!this.nodes.has(edge.to)) {
            throw new Error(`Unknown destination node: ${edge.to}`);
        }

        const existing = this.edges.get(edge.id);

        if (existing) {
            this.outgoing.get(existing.from)?.delete(existing.id);
            this.incoming.get(existing.to)?.delete(existing.id);
        }

        this.edges.set(edge.id, edge);
        this.outgoing.get(edge.from).add(edge.id);
        this.incoming.get(edge.to).add(edge.id);

        return edge;
    }

    getEdge(id) {
        return this.edges.get(id) || null;
    }

    hasEdge(id) {
        return this.edges.has(id);
    }

    removeEdge(edgeId) {
        const edge = this.edges.get(edgeId);

        if (!edge) {
            return false;
        }

        this.outgoing.get(edge.from)?.delete(edgeId);
        this.incoming.get(edge.to)?.delete(edgeId);
        this.edges.delete(edgeId);

        return true;
    }

    getOutgoing(nodeId, options = {}) {
        const { edgeTypes = null } = options;

        const allowed = edgeTypes
            ? new Set(Array.isArray(edgeTypes) ? edgeTypes : [edgeTypes])
            : null;

        return [...(this.outgoing.get(nodeId) || [])]
            .map(id => this.edges.get(id))
            .filter(Boolean)
            .filter(edge => !allowed || allowed.has(edge.type));
    }

    getIncoming(nodeId, options = {}) {
        const { edgeTypes = null } = options;

        const allowed = edgeTypes
            ? new Set(Array.isArray(edgeTypes) ? edgeTypes : [edgeTypes])
            : null;

        return [...(this.incoming.get(nodeId) || [])]
            .map(id => this.edges.get(id))
            .filter(Boolean)
            .filter(edge => !allowed || allowed.has(edge.type));
    }

    getNeighbors(nodeId, options = {}) {
        const {
            direction = "outgoing",
            edgeTypes = null,
            includeEdges = false
        } = options;

        if (!this.nodes.has(nodeId)) {
            return [];
        }

        let edges = [];

        if (direction === "outgoing") {
            edges = this.getOutgoing(nodeId, { edgeTypes });
        } else if (direction === "incoming") {
            edges = this.getIncoming(nodeId, { edgeTypes });
        } else if (direction === "both") {
            edges = [
                ...this.getOutgoing(nodeId, { edgeTypes }),
                ...this.getIncoming(nodeId, { edgeTypes })
            ];
        } else {
            throw new Error(`Unsupported direction: ${direction}`);
        }

        const seen = new Set();
        const result = [];

        for (const edge of edges) {
            const neighborId =
                edge.from === nodeId
                    ? edge.to
                    : edge.from;

            if (seen.has(neighborId)) {
                continue;
            }

            seen.add(neighborId);

            const node = this.nodes.get(neighborId);

            if (!node) {
                continue;
            }

            result.push(
                includeEdges
                    ? { node, edge }
                    : node
            );
        }

        return result;
    }

    getNodesByType(type) {
        return [...(this.byType.get(type) || [])]
            .map(id => this.nodes.get(id))
            .filter(Boolean);
    }

    nodeCount() {
        return this.nodes.size;
    }

    edgeCount() {
        return this.edges.size;
    }

    statistics() {
        const nodeTypes = {};

        for (const [type, ids] of this.byType.entries()) {
            nodeTypes[type] = ids.size;
        }

        return {
            nodes: this.nodeCount(),
            edges: this.edgeCount(),
            nodeTypes
        };
    }

    breadthFirst(startId, options = {}) {
        const {
            direction = "outgoing",
            edgeTypes = null,
            maxDepth = Infinity,
            includeStart = true,
            visitor = null
        } = options;

        if (!this.nodes.has(startId)) {
            return [];
        }

        const queue = [{ id: startId, depth: 0 }];
        const visited = new Set([startId]);
        const result = [];

        while (queue.length > 0) {
            const current = queue.shift();
            const node = this.nodes.get(current.id);

            if (includeStart || current.id !== startId) {
                const entry = {
                    node,
                    depth: current.depth
                };

                result.push(entry);

                if (typeof visitor === "function") {
                    const shouldContinue = visitor(entry);

                    if (shouldContinue === false) {
                        break;
                    }
                }
            }

            if (current.depth >= maxDepth) {
                continue;
            }

            const neighbors = this.getNeighbors(current.id, {
                direction,
                edgeTypes
            });

            for (const neighbor of neighbors) {
                if (visited.has(neighbor.id)) {
                    continue;
                }

                visited.add(neighbor.id);
                queue.push({
                    id: neighbor.id,
                    depth: current.depth + 1
                });
            }
        }

        return result;
    }

    depthFirst(startId, options = {}) {
        const {
            direction = "outgoing",
            edgeTypes = null,
            maxDepth = Infinity,
            includeStart = true,
            visitor = null
        } = options;

        if (!this.nodes.has(startId)) {
            return [];
        }

        const stack = [{ id: startId, depth: 0 }];
        const visited = new Set();
        const result = [];

        while (stack.length > 0) {
            const current = stack.pop();

            if (visited.has(current.id)) {
                continue;
            }

            visited.add(current.id);

            const node = this.nodes.get(current.id);

            if (includeStart || current.id !== startId) {
                const entry = {
                    node,
                    depth: current.depth
                };

                result.push(entry);

                if (typeof visitor === "function") {
                    const shouldContinue = visitor(entry);

                    if (shouldContinue === false) {
                        break;
                    }
                }
            }

            if (current.depth >= maxDepth) {
                continue;
            }

            const neighbors = this.getNeighbors(current.id, {
                direction,
                edgeTypes
            });

            for (let i = neighbors.length - 1; i >= 0; i -= 1) {
                const neighbor = neighbors[i];

                if (!visited.has(neighbor.id)) {
                    stack.push({
                        id: neighbor.id,
                        depth: current.depth + 1
                    });
                }
            }
        }

        return result;
    }

    isReachable(fromId, toId, options = {}) {
        if (fromId === toId) {
            return this.nodes.has(fromId);
        }

        const visited = this.breadthFirst(fromId, {
            ...options,
            includeStart: false
        });

        return visited.some(entry => entry.node.id === toId);
    }

    getDescendants(nodeId, options = {}) {
        return this.breadthFirst(nodeId, {
            ...options,
            direction: "outgoing",
            includeStart: false
        }).map(entry => entry.node);
    }

    getAncestors(nodeId, options = {}) {
        return this.breadthFirst(nodeId, {
            ...options,
            direction: "incoming",
            includeStart: false
        }).map(entry => entry.node);
    }

    shortestPath(fromId, toId, options = {}) {
        const {
            direction = "outgoing",
            edgeTypes = null
        } = options;

        if (!this.nodes.has(fromId) || !this.nodes.has(toId)) {
            return null;
        }

        if (fromId === toId) {
            return {
                nodes: [this.nodes.get(fromId)],
                edges: [],
                distance: 0
            };
        }

        const queue = [fromId];
        const visited = new Set([fromId]);
        const previous = new Map();

        while (queue.length > 0) {
            const currentId = queue.shift();

            const neighborEntries = this.getNeighbors(currentId, {
                direction,
                edgeTypes,
                includeEdges: true
            });

            for (const { node, edge } of neighborEntries) {
                if (visited.has(node.id)) {
                    continue;
                }

                visited.add(node.id);
                previous.set(node.id, {
                    nodeId: currentId,
                    edge
                });

                if (node.id === toId) {
                    const nodeIds = [toId];
                    const edges = [];
                    let cursor = toId;

                    while (cursor !== fromId) {
                        const step = previous.get(cursor);

                        if (!step) {
                            return null;
                        }

                        edges.push(step.edge);
                        cursor = step.nodeId;
                        nodeIds.push(cursor);
                    }

                    nodeIds.reverse();
                    edges.reverse();

                    return {
                        nodes: nodeIds.map(id => this.nodes.get(id)),
                        edges,
                        distance: edges.length
                    };
                }

                queue.push(node.id);
            }
        }

        return null;
    }

    findDirectedCycles(options = {}) {
        const { edgeTypes = null } = options;

        const state = new Map();
        const stack = [];
        const stackIndex = new Map();
        const cycles = [];
        const signatures = new Set();

        const visit = nodeId => {
            state.set(nodeId, 1);
            stackIndex.set(nodeId, stack.length);
            stack.push(nodeId);

            for (const edge of this.getOutgoing(nodeId, { edgeTypes })) {
                const nextId = edge.to;
                const nextState = state.get(nextId) || 0;

                if (nextState === 0) {
                    visit(nextId);
                } else if (nextState === 1) {
                    const start = stackIndex.get(nextId);
                    const cycleIds = stack.slice(start);
                    cycleIds.push(nextId);

                    const normalized = cycleIds
                        .slice(0, -1)
                        .sort()
                        .join("|");

                    if (!signatures.has(normalized)) {
                        signatures.add(normalized);
                        cycles.push(
                            cycleIds.map(id => this.nodes.get(id))
                        );
                    }
                }
            }

            stack.pop();
            stackIndex.delete(nodeId);
            state.set(nodeId, 2);
        };

        for (const nodeId of this.nodes.keys()) {
            if ((state.get(nodeId) || 0) === 0) {
                visit(nodeId);
            }
        }

        return cycles;
    }

    hasDirectedCycle(options = {}) {
        return this.findDirectedCycles(options).length > 0;
    }

    topologicalSort(options = {}) {
        const { edgeTypes = null } = options;
        const indegree = new Map();

        for (const nodeId of this.nodes.keys()) {
            indegree.set(nodeId, 0);
        }

        for (const edge of this.edges.values()) {
            if (
                edgeTypes &&
                !new Set(
                    Array.isArray(edgeTypes)
                        ? edgeTypes
                        : [edgeTypes]
                ).has(edge.type)
            ) {
                continue;
            }

            indegree.set(
                edge.to,
                (indegree.get(edge.to) || 0) + 1
            );
        }

        const queue = [];

        for (const [nodeId, degree] of indegree.entries()) {
            if (degree === 0) {
                queue.push(nodeId);
            }
        }

        const result = [];

        while (queue.length > 0) {
            const nodeId = queue.shift();
            result.push(this.nodes.get(nodeId));

            for (const edge of this.getOutgoing(nodeId, { edgeTypes })) {
                const nextDegree = indegree.get(edge.to) - 1;
                indegree.set(edge.to, nextDegree);

                if (nextDegree === 0) {
                    queue.push(edge.to);
                }
            }
        }

        if (result.length !== this.nodes.size) {
            const cycleNodes = [...indegree.entries()]
                .filter(([, degree]) => degree > 0)
                .map(([id]) => this.nodes.get(id));

            const error = new Error(
                "Topological sort failed because the graph contains a directed cycle."
            );

            error.cycleNodes = cycleNodes;
            throw error;
        }

        return result;
    }

    weaklyConnectedComponents(options = {}) {
        const { edgeTypes = null } = options;
        const visited = new Set();
        const components = [];

        for (const nodeId of this.nodes.keys()) {
            if (visited.has(nodeId)) {
                continue;
            }

            const component = [];
            const queue = [nodeId];
            visited.add(nodeId);

            while (queue.length > 0) {
                const currentId = queue.shift();
                component.push(this.nodes.get(currentId));

                const neighbors = this.getNeighbors(currentId, {
                    direction: "both",
                    edgeTypes
                });

                for (const neighbor of neighbors) {
                    if (visited.has(neighbor.id)) {
                        continue;
                    }

                    visited.add(neighbor.id);
                    queue.push(neighbor.id);
                }
            }

            components.push(component);
        }

        return components;
    }

    subgraph(nodeIds, options = {}) {
        const {
            includeConnectingEdges = true
        } = options;

        const selected = new Set(nodeIds);
        const graph = new ConflictGraph();

        for (const nodeId of selected) {
            const node = this.nodes.get(nodeId);

            if (node) {
                graph.addNode(new ConflictNode(node.toJSON()));
            }
        }

        if (includeConnectingEdges) {
            for (const edge of this.edges.values()) {
                if (
                    selected.has(edge.from) &&
                    selected.has(edge.to)
                ) {
                    graph.addEdge(new ConflictEdge(edge.toJSON()));
                }
            }
        }

        return graph;
    }

    toJSON() {
        return {
            version: 1,
            nodes: [...this.nodes.values()].map(node => node.toJSON()),
            edges: [...this.edges.values()].map(edge => edge.toJSON())
        };
    }

    static fromJSON(data) {
        if (!data || typeof data !== "object") {
            throw new TypeError("Graph data must be an object.");
        }

        if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
            throw new TypeError("Graph data must include nodes and edges arrays.");
        }

        const graph = new ConflictGraph();

        for (const nodeData of data.nodes) {
            graph.addNode(new ConflictNode(nodeData));
        }

        for (const edgeData of data.edges) {
            graph.addEdge(new ConflictEdge(edgeData));
        }

        return graph;
    }
}

export default ConflictGraph;
