/**
 * ============================================================================
 * Mission Companion
 * Conflict Engine
 *
 * File:
 *     ConflictGraph.js
 *
 * Purpose:
 *     Directed weighted graph used by the reasoning engine.
 *
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

function uuid() {

    return (
        "N-" +
        Math.random().toString(36).substring(2, 12) +
        "-" +
        Date.now().toString(36)
    );

}

export class ConflictNode {

    constructor(data = {}) {

        this.id = data.id || uuid();

        this.type = data.type || NodeType.REQUIREMENT;

        this.title = data.title || "";

        this.text = data.text || "";

        this.source = data.source || "";

        this.document = data.document || "";

        this.section = data.section || "";

        this.metadata = data.metadata || {};

        this.evidence = [];

    }

    addEvidence(evidence) {

        this.evidence.push(evidence);

    }

}

export class ConflictEdge {

    constructor({

        from,

        to,

        type,

        weight = 1,

        confidence = 1,

        metadata = {}

    }) {

        this.id = uuid();

        this.from = from;

        this.to = to;

        this.type = type;

        this.weight = weight;

        this.confidence = confidence;

        this.metadata = metadata;

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

        this.nodes.set(node.id, node);

        if (!this.outgoing.has(node.id))
            this.outgoing.set(node.id, new Set());

        if (!this.incoming.has(node.id))
            this.incoming.set(node.id, new Set());

        if (!this.byType.has(node.type))
            this.byType.set(node.type, new Set());

        this.byType.get(node.type).add(node.id);

        return node;

    }

    getNode(id) {

        return this.nodes.get(id);

    }

    hasNode(id) {

        return this.nodes.has(id);

    }

    removeNode(id) {

        if (!this.nodes.has(id))
            return false;

        const outgoing = [...this.outgoing.get(id)];

        const incoming = [...this.incoming.get(id)];

        for (const edge of outgoing)
            this.removeEdge(edge);

        for (const edge of incoming)
            this.removeEdge(edge);

        const node = this.nodes.get(id);

        this.byType.get(node.type)?.delete(id);

        this.nodes.delete(id);

        this.outgoing.delete(id);

        this.incoming.delete(id);

        return true;

    }

    addEdge(edge) {

        if (!(edge instanceof ConflictEdge)) {

            edge = new ConflictEdge(edge);

        }

        if (!this.nodes.has(edge.from))
            throw new Error("Unknown source node");

        if (!this.nodes.has(edge.to))
            throw new Error("Unknown destination node");

        this.edges.set(edge.id, edge);

        this.outgoing.get(edge.from).add(edge.id);

        this.incoming.get(edge.to).add(edge.id);

        return edge;

    }

    removeEdge(edgeId) {

        const edge = this.edges.get(edgeId);

        if (!edge)
            return false;

        this.outgoing.get(edge.from)?.delete(edgeId);

        this.incoming.get(edge.to)?.delete(edgeId);

        this.edges.delete(edgeId);

        return true;

    }

    getOutgoing(nodeId) {

        return [...(this.outgoing.get(nodeId) || [])]
            .map(id => this.edges.get(id));

    }

    getIncoming(nodeId) {

        return [...(this.incoming.get(nodeId) || [])]
            .map(id => this.edges.get(id));

    }

    getNodesByType(type) {

        return [...(this.byType.get(type) || [])]
            .map(id => this.nodes.get(id));

    }

    nodeCount() {

        return this.nodes.size;

    }

    edgeCount() {

        return this.edges.size;

    }

    statistics() {

        return {

            nodes: this.nodeCount(),

            edges: this.edgeCount(),

            nodeTypes: [...this.byType.keys()].reduce((obj, key) => {

                obj[key] = this.byType.get(key).size;

                return obj;

            }, {})

        };

    }

}
