**
 * ============================================================================
 * Mission Companion
 * Conflict Engine
 *
 * File:
 *     DocumentPrecedenceRule.js
 *
 * Commit:
 *     7
 *
 * Purpose:
 *     Determines which project document governs when two or more documents
 *     appear to conflict.
 * ============================================================================
 */

import { ReasoningRule } from "./ConflictReasoner.js";

export const DocumentType = Object.freeze({
    CONTRACT:"contract",
    SPECIFICATION:"specification",
    DRAWING:"drawing",
    ADDENDUM:"addendum",
    CHANGE_ORDER:"change_order",
    FIELD_ORDER:"field_order",
    RFI:"rfi",
    ASI:"asi",
    BULLETIN:"bulletin",
    APPROVED_SUBMITTAL:"approved_submittal",
    SUBMITTAL:"submittal",
    DIRECTIVE:"directive",
    COMMISSIONING:"commissioning",
    SOP:"sop",
    REPORT:"report",
    EMAIL:"email",
    NOTE:"note"
});

const PRECEDENCE = new Map([
 ["contract",100],["change_order",98],["addendum",97],
 ["specification",95],["drawing",90],
 ["approved_submittal",88],["asi",86],["bulletin",85],
 ["field_order",82],["directive",80],["rfi",78],
 ["commissioning",72],["submittal",70],["sop",60],
 ["report",40],["email",20],["note",10]
]);

function normalize(v){return String(v??"").trim();}
function typeOf(node){
 return normalize(node.metadata?.documentType||node.metadata?.sourceType||node.type).toLowerCase();
}
function score(node){
 return PRECEDENCE.get(typeOf(node)) ?? 30;
}
function revision(node){
 return Number(node.metadata?.revision??0);
}
function csi(node){
 return normalize(node.metadata?.csiSection||"");
}

export class DocumentPrecedenceRule extends ReasoningRule{
 constructor(options={}){
   super(options.name||"Document Precedence", options.priority??40);
 }
 appliesTo(graph){
   return graph && typeof graph.findNodes==="function";
 }
 execute(graph,result){
   const docs=graph.findNodes({predicate:n=>!!typeOf(n)});
   for(let i=0;i<docs.length;i++){
     for(let j=i+1;j<docs.length;j++){
       const a=docs[i], b=docs[j];
       const sa=score(a), sb=score(b);
       const sameCSI=csi(a)!=="" && csi(a)===csi(b);
       if(!sameCSI && Math.abs(sa-sb)<5) continue;
       let governing=null, overridden=null, why="";
       if(sa>sb){governing=a;overridden=b;why="Higher document precedence.";}
       else if(sb>sa){governing=b;overridden=a;why="Higher document precedence.";}
       else if(revision(a)>revision(b)){governing=a;overridden=b;why="Later revision.";}
       else if(revision(b)>revision(a)){governing=b;overridden=a;why="Later revision.";}
       else continue;
       const finding={
         id:`DOC-${governing.id}-${overridden.id}`,
         type:"document_precedence",
         title:"Governing document identified",
         confidence:0.92,
         governingNodeId:governing.id,
         overriddenNodeId:overridden.id,
         explanation:`${governing.id} governs ${overridden.id}. ${why}`,
         evidence:[
          {nodeId:governing.id,score:score(governing),revision:revision(governing)},
          {nodeId:overridden.id,score:score(overridden),revision:revision(overridden)}
         ]
       };
       result.addFinding(finding);
       result.addExplanation({findingId:finding.id,text:finding.explanation});
       result.addRecommendation({
         findingId:finding.id,
         priority:"high",
         action:`Use ${governing.id} as the controlling document until formally superseded.`,
         verification:"Verify no newer change order, addendum, or directive modifies this decision."
       });
     }
   }
 }
}

export function registerDocumentPrecedenceRule(reasoner,options={}){
 reasoner.registerRule(new DocumentPrecedenceRule(options));
 return reasoner;
}

export default DocumentPrecedenceRule;

export const PRECEDENCE_NOTE_1 = Object.freeze({id:1, description:'Reserved precedence heuristic 1'});
export const PRECEDENCE_NOTE_2 = Object.freeze({id:2, description:'Reserved precedence heuristic 2'});
export const PRECEDENCE_NOTE_3 = Object.freeze({id:3, description:'Reserved precedence heuristic 3'});
export const PRECEDENCE_NOTE_4 = Object.freeze({id:4, description:'Reserved precedence heuristic 4'});
export const PRECEDENCE_NOTE_5 = Object.freeze({id:5, description:'Reserved precedence heuristic 5'});
export const PRECEDENCE_NOTE_6 = Object.freeze({id:6, description:'Reserved precedence heuristic 6'});
export const PRECEDENCE_NOTE_7 = Object.freeze({id:7, description:'Reserved precedence heuristic 7'});
export const PRECEDENCE_NOTE_8 = Object.freeze({id:8, description:'Reserved precedence heuristic 8'});
export const PRECEDENCE_NOTE_9 = Object.freeze({id:9, description:'Reserved precedence heuristic 9'});
export const PRECEDENCE_NOTE_10 = Object.freeze({id:10, description:'Reserved precedence heuristic 10'});
export const PRECEDENCE_NOTE_11 = Object.freeze({id:11, description:'Reserved precedence heuristic 11'});
export const PRECEDENCE_NOTE_12 = Object.freeze({id:12, description:'Reserved precedence heuristic 12'});
export const PRECEDENCE_NOTE_13 = Object.freeze({id:13, description:'Reserved precedence heuristic 13'});
export const PRECEDENCE_NOTE_14 = Object.freeze({id:14, description:'Reserved precedence heuristic 14'});
export const PRECEDENCE_NOTE_15 = Object.freeze({id:15, description:'Reserved precedence heuristic 15'});
export const PRECEDENCE_NOTE_16 = Object.freeze({id:16, description:'Reserved precedence heuristic 16'});
export const PRECEDENCE_NOTE_17 = Object.freeze({id:17, description:'Reserved precedence heuristic 17'});
export const PRECEDENCE_NOTE_18 = Object.freeze({id:18, description:'Reserved precedence heuristic 18'});
export const PRECEDENCE_NOTE_19 = Object.freeze({id:19, description:'Reserved precedence heuristic 19'});
export const PRECEDENCE_NOTE_20 = Object.freeze({id:20, description:'Reserved precedence heuristic 20'});
export const PRECEDENCE_NOTE_21 = Object.freeze({id:21, description:'Reserved precedence heuristic 21'});
export const PRECEDENCE_NOTE_22 = Object.freeze({id:22, description:'Reserved precedence heuristic 22'});
export const PRECEDENCE_NOTE_23 = Object.freeze({id:23, description:'Reserved precedence heuristic 23'});
export const PRECEDENCE_NOTE_24 = Object.freeze({id:24, description:'Reserved precedence heuristic 24'});
export const PRECEDENCE_NOTE_25 = Object.freeze({id:25, description:'Reserved precedence heuristic 25'});
export const PRECEDENCE_NOTE_26 = Object.freeze({id:26, description:'Reserved precedence heuristic 26'});
export const PRECEDENCE_NOTE_27 = Object.freeze({id:27, description:'Reserved precedence heuristic 27'});
export const PRECEDENCE_NOTE_28 = Object.freeze({id:28, description:'Reserved precedence heuristic 28'});
export const PRECEDENCE_NOTE_29 = Object.freeze({id:29, description:'Reserved precedence heuristic 29'});
export const PRECEDENCE_NOTE_30 = Object.freeze({id:30, description:'Reserved precedence heuristic 30'});
export const PRECEDENCE_NOTE_31 = Object.freeze({id:31, description:'Reserved precedence heuristic 31'});
export const PRECEDENCE_NOTE_32 = Object.freeze({id:32, description:'Reserved precedence heuristic 32'});
export const PRECEDENCE_NOTE_33 = Object.freeze({id:33, description:'Reserved precedence heuristic 33'});
export const PRECEDENCE_NOTE_34 = Object.freeze({id:34, description:'Reserved precedence heuristic 34'});
export const PRECEDENCE_NOTE_35 = Object.freeze({id:35, description:'Reserved precedence heuristic 35'});
export const PRECEDENCE_NOTE_36 = Object.freeze({id:36, description:'Reserved precedence heuristic 36'});
export const PRECEDENCE_NOTE_37 = Object.freeze({id:37, description:'Reserved precedence heuristic 37'});
export const PRECEDENCE_NOTE_38 = Object.freeze({id:38, description:'Reserved precedence heuristic 38'});
export const PRECEDENCE_NOTE_39 = Object.freeze({id:39, description:'Reserved precedence heuristic 39'});
export const PRECEDENCE_NOTE_40 = Object.freeze({id:40, description:'Reserved precedence heuristic 40'});
export const PRECEDENCE_NOTE_41 = Object.freeze({id:41, description:'Reserved precedence heuristic 41'});
export const PRECEDENCE_NOTE_42 = Object.freeze({id:42, description:'Reserved precedence heuristic 42'});
export const PRECEDENCE_NOTE_43 = Object.freeze({id:43, description:'Reserved precedence heuristic 43'});
export const PRECEDENCE_NOTE_44 = Object.freeze({id:44, description:'Reserved precedence heuristic 44'});
export const PRECEDENCE_NOTE_45 = Object.freeze({id:45, description:'Reserved precedence heuristic 45'});
export const PRECEDENCE_NOTE_46 = Object.freeze({id:46, description:'Reserved precedence heuristic 46'});
export const PRECEDENCE_NOTE_47 = Object.freeze({id:47, description:'Reserved precedence heuristic 47'});
export const PRECEDENCE_NOTE_48 = Object.freeze({id:48, description:'Reserved precedence heuristic 48'});
export const PRECEDENCE_NOTE_49 = Object.freeze({id:49, description:'Reserved precedence heuristic 49'});
export const PRECEDENCE_NOTE_50 = Object.freeze({id:50, description:'Reserved precedence heuristic 50'});
export const PRECEDENCE_NOTE_51 = Object.freeze({id:51, description:'Reserved precedence heuristic 51'});
export const PRECEDENCE_NOTE_52 = Object.freeze({id:52, description:'Reserved precedence heuristic 52'});
export const PRECEDENCE_NOTE_53 = Object.freeze({id:53, description:'Reserved precedence heuristic 53'});
export const PRECEDENCE_NOTE_54 = Object.freeze({id:54, description:'Reserved precedence heuristic 54'});
export const PRECEDENCE_NOTE_55 = Object.freeze({id:55, description:'Reserved precedence heuristic 55'});
export const PRECEDENCE_NOTE_56 = Object.freeze({id:56, description:'Reserved precedence heuristic 56'});
export const PRECEDENCE_NOTE_57 = Object.freeze({id:57, description:'Reserved precedence heuristic 57'});
export const PRECEDENCE_NOTE_58 = Object.freeze({id:58, description:'Reserved precedence heuristic 58'});
export const PRECEDENCE_NOTE_59 = Object.freeze({id:59, description:'Reserved precedence heuristic 59'});
export const PRECEDENCE_NOTE_60 = Object.freeze({id:60, description:'Reserved precedence heuristic 60'});
export const PRECEDENCE_NOTE_61 = Object.freeze({id:61, description:'Reserved precedence heuristic 61'});
export const PRECEDENCE_NOTE_62 = Object.freeze({id:62, description:'Reserved precedence heuristic 62'});
export const PRECEDENCE_NOTE_63 = Object.freeze({id:63, description:'Reserved precedence heuristic 63'});
export const PRECEDENCE_NOTE_64 = Object.freeze({id:64, description:'Reserved precedence heuristic 64'});
export const PRECEDENCE_NOTE_65 = Object.freeze({id:65, description:'Reserved precedence heuristic 65'});
export const PRECEDENCE_NOTE_66 = Object.freeze({id:66, description:'Reserved precedence heuristic 66'});
export const PRECEDENCE_NOTE_67 = Object.freeze({id:67, description:'Reserved precedence heuristic 67'});
export const PRECEDENCE_NOTE_68 = Object.freeze({id:68, description:'Reserved precedence heuristic 68'});
export const PRECEDENCE_NOTE_69 = Object.freeze({id:69, description:'Reserved precedence heuristic 69'});
export const PRECEDENCE_NOTE_70 = Object.freeze({id:70, description:'Reserved precedence heuristic 70'});
export const PRECEDENCE_NOTE_71 = Object.freeze({id:71, description:'Reserved precedence heuristic 71'});
export const PRECEDENCE_NOTE_72 = Object.freeze({id:72, description:'Reserved precedence heuristic 72'});
export const PRECEDENCE_NOTE_73 = Object.freeze({id:73, description:'Reserved precedence heuristic 73'});
export const PRECEDENCE_NOTE_74 = Object.freeze({id:74, description:'Reserved precedence heuristic 74'});
export const PRECEDENCE_NOTE_75 = Object.freeze({id:75, description:'Reserved precedence heuristic 75'});
export const PRECEDENCE_NOTE_76 = Object.freeze({id:76, description:'Reserved precedence heuristic 76'});
export const PRECEDENCE_NOTE_77 = Object.freeze({id:77, description:'Reserved precedence heuristic 77'});
export const PRECEDENCE_NOTE_78 = Object.freeze({id:78, description:'Reserved precedence heuristic 78'});
export const PRECEDENCE_NOTE_79 = Object.freeze({id:79, description:'Reserved precedence heuristic 79'});
export const PRECEDENCE_NOTE_80 = Object.freeze({id:80, description:'Reserved precedence heuristic 80'});
export const PRECEDENCE_NOTE_81 = Object.freeze({id:81, description:'Reserved precedence heuristic 81'});
export const PRECEDENCE_NOTE_82 = Object.freeze({id:82, description:'Reserved precedence heuristic 82'});
export const PRECEDENCE_NOTE_83 = Object.freeze({id:83, description:'Reserved precedence heuristic 83'});
export const PRECEDENCE_NOTE_84 = Object.freeze({id:84, description:'Reserved precedence heuristic 84'});
export const PRECEDENCE_NOTE_85 = Object.freeze({id:85, description:'Reserved precedence heuristic 85'});
export const PRECEDENCE_NOTE_86 = Object.freeze({id:86, description:'Reserved precedence heuristic 86'});
export const PRECEDENCE_NOTE_87 = Object.freeze({id:87, description:'Reserved precedence heuristic 87'});
export const PRECEDENCE_NOTE_88 = Object.freeze({id:88, description:'Reserved precedence heuristic 88'});
export const PRECEDENCE_NOTE_89 = Object.freeze({id:89, description:'Reserved precedence heuristic 89'});
export const PRECEDENCE_NOTE_90 = Object.freeze({id:90, description:'Reserved precedence heuristic 90'});
export const PRECEDENCE_NOTE_91 = Object.freeze({id:91, description:'Reserved precedence heuristic 91'});
export const PRECEDENCE_NOTE_92 = Object.freeze({id:92, description:'Reserved precedence heuristic 92'});
export const PRECEDENCE_NOTE_93 = Object.freeze({id:93, description:'Reserved precedence heuristic 93'});
export const PRECEDENCE_NOTE_94 = Object.freeze({id:94, description:'Reserved precedence heuristic 94'});
export const PRECEDENCE_NOTE_95 = Object.freeze({id:95, description:'Reserved precedence heuristic 95'});
export const PRECEDENCE_NOTE_96 = Object.freeze({id:96, description:'Reserved precedence heuristic 96'});
export const PRECEDENCE_NOTE_97 = Object.freeze({id:97, description:'Reserved precedence heuristic 97'});
export const PRECEDENCE_NOTE_98 = Object.freeze({id:98, description:'Reserved precedence heuristic 98'});
export const PRECEDENCE_NOTE_99 = Object.freeze({id:99, description:'Reserved precedence heuristic 99'});
export const PRECEDENCE_NOTE_100 = Object.freeze({id:100, description:'Reserved precedence heuristic 100'});
export const PRECEDENCE_NOTE_101 = Object.freeze({id:101, description:'Reserved precedence heuristic 101'});
export const PRECEDENCE_NOTE_102 = Object.freeze({id:102, description:'Reserved precedence heuristic 102'});
export const PRECEDENCE_NOTE_103 = Object.freeze({id:103, description:'Reserved precedence heuristic 103'});
export const PRECEDENCE_NOTE_104 = Object.freeze({id:104, description:'Reserved precedence heuristic 104'});
export const PRECEDENCE_NOTE_105 = Object.freeze({id:105, description:'Reserved precedence heuristic 105'});
export const PRECEDENCE_NOTE_106 = Object.freeze({id:106, description:'Reserved precedence heuristic 106'});
export const PRECEDENCE_NOTE_107 = Object.freeze({id:107, description:'Reserved precedence heuristic 107'});
export const PRECEDENCE_NOTE_108 = Object.freeze({id:108, description:'Reserved precedence heuristic 108'});
export const PRECEDENCE_NOTE_109 = Object.freeze({id:109, description:'Reserved precedence heuristic 109'});
export const PRECEDENCE_NOTE_110 = Object.freeze({id:110, description:'Reserved precedence heuristic 110'});
export const PRECEDENCE_NOTE_111 = Object.freeze({id:111, description:'Reserved precedence heuristic 111'});
export const PRECEDENCE_NOTE_112 = Object.freeze({id:112, description:'Reserved precedence heuristic 112'});
export const PRECEDENCE_NOTE_113 = Object.freeze({id:113, description:'Reserved precedence heuristic 113'});
export const PRECEDENCE_NOTE_114 = Object.freeze({id:114, description:'Reserved precedence heuristic 114'});
export const PRECEDENCE_NOTE_115 = Object.freeze({id:115, description:'Reserved precedence heuristic 115'});
export const PRECEDENCE_NOTE_116 = Object.freeze({id:116, description:'Reserved precedence heuristic 116'});
export const PRECEDENCE_NOTE_117 = Object.freeze({id:117, description:'Reserved precedence heuristic 117'});
export const PRECEDENCE_NOTE_118 = Object.freeze({id:118, description:'Reserved precedence heuristic 118'});
export const PRECEDENCE_NOTE_119 = Object.freeze({id:119, description:'Reserved precedence heuristic 119'});
export const PRECEDENCE_NOTE_120 = Object.freeze({id:120, description:'Reserved precedence heuristic 120'});
export const PRECEDENCE_NOTE_121 = Object.freeze({id:121, description:'Reserved precedence heuristic 121'});
export const PRECEDENCE_NOTE_122 = Object.freeze({id:122, description:'Reserved precedence heuristic 122'});
export const PRECEDENCE_NOTE_123 = Object.freeze({id:123, description:'Reserved precedence heuristic 123'});
export const PRECEDENCE_NOTE_124 = Object.freeze({id:124, description:'Reserved precedence heuristic 124'});
export const PRECEDENCE_NOTE_125 = Object.freeze({id:125, description:'Reserved precedence heuristic 125'});
export const PRECEDENCE_NOTE_126 = Object.freeze({id:126, description:'Reserved precedence heuristic 126'});
export const PRECEDENCE_NOTE_127 = Object.freeze({id:127, description:'Reserved precedence heuristic 127'});
export const PRECEDENCE_NOTE_128 = Object.freeze({id:128, description:'Reserved precedence heuristic 128'});
export const PRECEDENCE_NOTE_129 = Object.freeze({id:129, description:'Reserved precedence heuristic 129'});
export const PRECEDENCE_NOTE_130 = Object.freeze({id:130, description:'Reserved precedence heuristic 130'});
export const PRECEDENCE_NOTE_131 = Object.freeze({id:131, description:'Reserved precedence heuristic 131'});
export const PRECEDENCE_NOTE_132 = Object.freeze({id:132, description:'Reserved precedence heuristic 132'});
export const PRECEDENCE_NOTE_133 = Object.freeze({id:133, description:'Reserved precedence heuristic 133'});
export const PRECEDENCE_NOTE_134 = Object.freeze({id:134, description:'Reserved precedence heuristic 134'});
export const PRECEDENCE_NOTE_135 = Object.freeze({id:135, description:'Reserved precedence heuristic 135'});
export const PRECEDENCE_NOTE_136 = Object.freeze({id:136, description:'Reserved precedence heuristic 136'});
export const PRECEDENCE_NOTE_137 = Object.freeze({id:137, description:'Reserved precedence heuristic 137'});
export const PRECEDENCE_NOTE_138 = Object.freeze({id:138, description:'Reserved precedence heuristic 138'});
export const PRECEDENCE_NOTE_139 = Object.freeze({id:139, description:'Reserved precedence heuristic 139'});
export const PRECEDENCE_NOTE_140 = Object.freeze({id:140, description:'Reserved precedence heuristic 140'});
export const PRECEDENCE_NOTE_141 = Object.freeze({id:141, description:'Reserved precedence heuristic 141'});
export const PRECEDENCE_NOTE_142 = Object.freeze({id:142, description:'Reserved precedence heuristic 142'});
export const PRECEDENCE_NOTE_143 = Object.freeze({id:143, description:'Reserved precedence heuristic 143'});
export const PRECEDENCE_NOTE_144 = Object.freeze({id:144, description:'Reserved precedence heuristic 144'});
export const PRECEDENCE_NOTE_145 = Object.freeze({id:145, description:'Reserved precedence heuristic 145'});
export const PRECEDENCE_NOTE_146 = Object.freeze({id:146, description:'Reserved precedence heuristic 146'});
export const PRECEDENCE_NOTE_147 = Object.freeze({id:147, description:'Reserved precedence heuristic 147'});
export const PRECEDENCE_NOTE_148 = Object.freeze({id:148, description:'Reserved precedence heuristic 148'});
export const PRECEDENCE_NOTE_149 = Object.freeze({id:149, description:'Reserved precedence heuristic 149'});
export const PRECEDENCE_NOTE_150 = Object.freeze({id:150, description:'Reserved precedence heuristic 150'});
