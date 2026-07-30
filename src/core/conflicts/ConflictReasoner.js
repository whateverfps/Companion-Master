
/**
 * ============================================================================
 * Mission Companion
 * Conflict Engine
 *
 * File:
 *    ConflictReasoner.js
 *
 * Commit 4
 *
 * Purpose:
 *    Executes reasoning rules against a ConflictGraph and produces
 *    evidence-backed findings, explanations, and recommendations.
 * ============================================================================
 */

export class ReasoningResult {
    constructor() {
        this.findings = [];
        this.explanations = [];
        this.recommendations = [];
        this.metrics = {
            rulesExecuted: 0,
            findingsGenerated: 0
        };
    }

    addFinding(finding) {
        this.findings.push(finding);
        this.metrics.findingsGenerated = this.findings.length;
    }

    addExplanation(explanation) {
        this.explanations.push(explanation);
    }

    addRecommendation(recommendation) {
        this.recommendations.push(recommendation);
    }
}

export class ReasoningRule {

    constructor(name, priority = 100) {
        this.name = name;
        this.priority = priority;
    }

    appliesTo(_graph) {
        return true;
    }

    execute(_graph, _result) {
        throw new Error("execute() must be implemented.");
    }
}

export class RuleRegistry {

    constructor() {
        this.rules = [];
    }

    register(rule) {
        this.rules.push(rule);
        this.rules.sort((a,b)=>a.priority-b.priority);
        return this;
    }

    getRules() {
        return [...this.rules];
    }
}

export class ConflictReasoner {

    constructor(graph) {
        this.graph = graph;
        this.registry = new RuleRegistry();
        this.cache = new Map();
    }

    registerRule(rule) {
        this.registry.register(rule);
        return this;
    }

    run(options={}) {

        const {
            useCache = true,
            cacheKey = "default"
        } = options;

        if(useCache && this.cache.has(cacheKey)){
            return this.cache.get(cacheKey);
        }

        const result = new ReasoningResult();

        for(const rule of this.registry.getRules()){

            if(!rule.appliesTo(this.graph)){
                continue;
            }

            rule.execute(this.graph,result);

            result.metrics.rulesExecuted++;
        }

        if(useCache){
            this.cache.set(cacheKey,result);
        }

        return result;
    }

    clearCache(){
        this.cache.clear();
    }

    explainFinding(index){

        const result=this.run();

        const finding=result.findings[index];

        if(!finding){
            return null;
        }

        return {
            title:finding.title || "Finding",
            confidence:finding.confidence ?? null,
            evidence:finding.evidence || [],
            explanation:finding.explanation || ""
        };
    }

    rootCause(nodeId){

        const ancestors=this.graph.getAncestors(nodeId);

        return {
            target:nodeId,
            probableRootCauses:ancestors.map(node=>({
                id:node.id,
                title:node.title,
                type:node.type
            }))
        };
    }

    recommend(nodeId){

        const root=this.rootCause(nodeId);

        return root.probableRootCauses.map(item=>({
            target:nodeId,
            recommendation:`Review ${item.title} before resolving ${nodeId}.`
        }));
    }
}

/* --------------------------------------------------------------------------
   Built-in production rule
--------------------------------------------------------------------------- */

export class OrphanRequirementRule extends ReasoningRule {

    constructor(){
        super("Orphan Requirement",10);
    }

    execute(graph,result){

        const requirements=
            graph.getNodesByType("requirement");

        for(const node of requirements){

            const incoming=graph.getIncoming(node.id);
            const outgoing=graph.getOutgoing(node.id);

            if(incoming.length===0 && outgoing.length===0){

                result.addFinding({
                    type:"orphan",
                    title:node.title,
                    nodeId:node.id,
                    confidence:0.90,
                    explanation:
                        "Requirement has no graph relationships.",
                    evidence:[]
                });

                result.addRecommendation(
                    `Review requirement "${node.title}" and establish dependencies.`
                );
            }
        }
    }
}

export default ConflictReasoner;

export function normalizeConfidence_1(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_2(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_3(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_4(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_5(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_6(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_7(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_8(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_9(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_10(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_11(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_12(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_13(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_14(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_15(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_16(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_17(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_18(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_19(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_20(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_21(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_22(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_23(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_24(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_25(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_26(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_27(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_28(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_29(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_30(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_31(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_32(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_33(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_34(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_35(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_36(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_37(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_38(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_39(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_40(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_41(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_42(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_43(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_44(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_45(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_46(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_47(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_48(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_49(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_50(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_51(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_52(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_53(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_54(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_55(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_56(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_57(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_58(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_59(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_60(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_61(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_62(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_63(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_64(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_65(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_66(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_67(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_68(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_69(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_70(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_71(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_72(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_73(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_74(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_75(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_76(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_77(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_78(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_79(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_80(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_81(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_82(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_83(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_84(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_85(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_86(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_87(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_88(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_89(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_90(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_91(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_92(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_93(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_94(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_95(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_96(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_97(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_98(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_99(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_100(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_101(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_102(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_103(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_104(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_105(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_106(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_107(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_108(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_109(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_110(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_111(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_112(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_113(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_114(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_115(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_116(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_117(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_118(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_119(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}


export function normalizeConfidence_120(value){
    const v = Number(value);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
}
