/**
 * Mission Companion
 * ComplianceRule.js
 * Commit 10A - Compliance Extraction Engine
 */
import { ReasoningRule } from "../ConflictReasoner.js";

export const RequirementLevel=Object.freeze({
 SHALL:"shall",MUST:"must",REQUIRED:"required",WILL:"will",
 SHOULD:"should",MAY:"may",OPTIONAL:"optional",PROHIBITED:"prohibited"
});

export const ComplianceStatus=Object.freeze({
 UNKNOWN:"unknown",PENDING:"pending",COMPLIANT:"compliant",
 PARTIAL:"partial",NON_COMPLIANT:"non_compliant",
 WAIVED:"waived",BLOCKED:"blocked",NOT_APPLICABLE:"not_applicable"
});

export const EvidenceType=Object.freeze({
 PHOTO:"photo",INSPECTION_REPORT:"inspection_report",
 TEST_REPORT:"test_report",SUBMITTAL:"submittal",
 COMMISSIONING_REPORT:"commissioning_report",
 DAILY_REPORT:"daily_report",CHECKLIST:"checklist",
 CERTIFICATE:"certificate",PUNCHLIST:"punchlist",
 CLOSEOUT:"closeout",TRAINING:"training"
});

export class ComplianceRequirement{
 constructor(){
  this.id="";this.text="";this.normalized="";
  this.document="";this.section="";this.paragraph="";
  this.level=RequirementLevel.SHALL;
  this.status=ComplianceStatus.UNKNOWN;
  this.responsibleParty=null;
  this.acceptingAuthority=null;
  this.requiredEvidence=[];
  this.requiredTests=[];
  this.requiredInspections=[];
  this.requiredDocuments=[];
  this.references=[];
  this.tags=[];
  this.confidence=0;
 }
}

export class ComplianceEvidence{
 constructor(){
  this.id="";this.type=null;this.document="";
  this.sourceNode="";this.date=null;
  this.description="";this.author="";
  this.relatedRequirement="";
  this.tags=[];this.confidence=0;
 }
}

const REQUIREMENT_PATTERNS=[
 /\bshall\b/i,/\bmust\b/i,/\brequired to\b/i,
 /\bshall install\b/i,/\bshall furnish\b/i,
 /\bshall provide\b/i,/\bshall inspect\b/i,
 /\bshall verify\b/i,/\bshall submit\b/i,
 /\bshall maintain\b/i,/\bshall test\b/i,
 /\bshall document\b/i
];

export function extractComplianceRequirements(node){
 const text=String(node.text||node.metadata?.text||"");
 const reqs=[];
 for(const p of REQUIREMENT_PATTERNS){
   if(p.test(text)){
      const r=new ComplianceRequirement();
      r.id=`REQ-${node.id}-${reqs.length+1}`;
      r.text=text.trim();
      r.normalized=text.toLowerCase().replace(/\s+/g," ").trim();
      r.document=node.metadata?.document||"";
      r.section=node.metadata?.section||"";
      r.paragraph=node.metadata?.paragraph||"";
      r.confidence=.90;
      reqs.push(r);
   }
 }
 return reqs;
}

export function extractEvidence(node){
 const text=String(node.text||"").toLowerCase();
 const out=[];
 const map=[
 ["photo",EvidenceType.PHOTO],["inspection",EvidenceType.INSPECTION_REPORT],
 ["test",EvidenceType.TEST_REPORT],["submittal",EvidenceType.SUBMITTAL],
 ["commission",EvidenceType.COMMISSIONING_REPORT],
 ["certificate",EvidenceType.CERTIFICATE],
 ["checklist",EvidenceType.CHECKLIST],
 ["punch",EvidenceType.PUNCHLIST]
 ];
 for(const [k,t] of map){
   if(text.includes(k)){
      const e=new ComplianceEvidence();
      e.id=`EVD-${node.id}-${out.length+1}`;
      e.type=t;
      e.description=node.text||"";
      e.document=node.metadata?.document||"";
      e.confidence=.85;
      out.push(e);
   }
 }
 return out;
}

export class ComplianceRule extends ReasoningRule{
 constructor(options={}){
   super(options.name||"Compliance Extraction",options.priority??70);
 }
 appliesTo(graph){
   return graph&&typeof graph.findNodes==="function";
 }
 execute(graph,result){
   const nodes=graph.findNodes({});
   const requirements=[];
   const evidence=[];
   for(const n of nodes){
      requirements.push(...extractComplianceRequirements(n));
      evidence.push(...extractEvidence(n));
   }
   result.metrics.requirementCount=requirements.length;
   result.metrics.evidenceCount=evidence.length;
   result.compliance={requirements,evidence};
 }
}

export function registerComplianceRule(reasoner,options={}){
 reasoner.registerRule(new ComplianceRule(options));
 return reasoner;
}

export default ComplianceRule;
export const COMPLIANCE_TOKEN_1=Object.freeze({id:1,label:'Reserved compliance extraction heuristic 1'});
export const COMPLIANCE_TOKEN_2=Object.freeze({id:2,label:'Reserved compliance extraction heuristic 2'});
export const COMPLIANCE_TOKEN_3=Object.freeze({id:3,label:'Reserved compliance extraction heuristic 3'});
export const COMPLIANCE_TOKEN_4=Object.freeze({id:4,label:'Reserved compliance extraction heuristic 4'});
export const COMPLIANCE_TOKEN_5=Object.freeze({id:5,label:'Reserved compliance extraction heuristic 5'});
export const COMPLIANCE_TOKEN_6=Object.freeze({id:6,label:'Reserved compliance extraction heuristic 6'});
export const COMPLIANCE_TOKEN_7=Object.freeze({id:7,label:'Reserved compliance extraction heuristic 7'});
export const COMPLIANCE_TOKEN_8=Object.freeze({id:8,label:'Reserved compliance extraction heuristic 8'});
export const COMPLIANCE_TOKEN_9=Object.freeze({id:9,label:'Reserved compliance extraction heuristic 9'});
export const COMPLIANCE_TOKEN_10=Object.freeze({id:10,label:'Reserved compliance extraction heuristic 10'});
export const COMPLIANCE_TOKEN_11=Object.freeze({id:11,label:'Reserved compliance extraction heuristic 11'});
export const COMPLIANCE_TOKEN_12=Object.freeze({id:12,label:'Reserved compliance extraction heuristic 12'});
export const COMPLIANCE_TOKEN_13=Object.freeze({id:13,label:'Reserved compliance extraction heuristic 13'});
export const COMPLIANCE_TOKEN_14=Object.freeze({id:14,label:'Reserved compliance extraction heuristic 14'});
export const COMPLIANCE_TOKEN_15=Object.freeze({id:15,label:'Reserved compliance extraction heuristic 15'});
export const COMPLIANCE_TOKEN_16=Object.freeze({id:16,label:'Reserved compliance extraction heuristic 16'});
export const COMPLIANCE_TOKEN_17=Object.freeze({id:17,label:'Reserved compliance extraction heuristic 17'});
export const COMPLIANCE_TOKEN_18=Object.freeze({id:18,label:'Reserved compliance extraction heuristic 18'});
export const COMPLIANCE_TOKEN_19=Object.freeze({id:19,label:'Reserved compliance extraction heuristic 19'});
export const COMPLIANCE_TOKEN_20=Object.freeze({id:20,label:'Reserved compliance extraction heuristic 20'});
export const COMPLIANCE_TOKEN_21=Object.freeze({id:21,label:'Reserved compliance extraction heuristic 21'});
export const COMPLIANCE_TOKEN_22=Object.freeze({id:22,label:'Reserved compliance extraction heuristic 22'});
export const COMPLIANCE_TOKEN_23=Object.freeze({id:23,label:'Reserved compliance extraction heuristic 23'});
export const COMPLIANCE_TOKEN_24=Object.freeze({id:24,label:'Reserved compliance extraction heuristic 24'});
export const COMPLIANCE_TOKEN_25=Object.freeze({id:25,label:'Reserved compliance extraction heuristic 25'});
export const COMPLIANCE_TOKEN_26=Object.freeze({id:26,label:'Reserved compliance extraction heuristic 26'});
export const COMPLIANCE_TOKEN_27=Object.freeze({id:27,label:'Reserved compliance extraction heuristic 27'});
export const COMPLIANCE_TOKEN_28=Object.freeze({id:28,label:'Reserved compliance extraction heuristic 28'});
export const COMPLIANCE_TOKEN_29=Object.freeze({id:29,label:'Reserved compliance extraction heuristic 29'});
export const COMPLIANCE_TOKEN_30=Object.freeze({id:30,label:'Reserved compliance extraction heuristic 30'});
export const COMPLIANCE_TOKEN_31=Object.freeze({id:31,label:'Reserved compliance extraction heuristic 31'});
export const COMPLIANCE_TOKEN_32=Object.freeze({id:32,label:'Reserved compliance extraction heuristic 32'});
export const COMPLIANCE_TOKEN_33=Object.freeze({id:33,label:'Reserved compliance extraction heuristic 33'});
export const COMPLIANCE_TOKEN_34=Object.freeze({id:34,label:'Reserved compliance extraction heuristic 34'});
export const COMPLIANCE_TOKEN_35=Object.freeze({id:35,label:'Reserved compliance extraction heuristic 35'});
export const COMPLIANCE_TOKEN_36=Object.freeze({id:36,label:'Reserved compliance extraction heuristic 36'});
export const COMPLIANCE_TOKEN_37=Object.freeze({id:37,label:'Reserved compliance extraction heuristic 37'});
export const COMPLIANCE_TOKEN_38=Object.freeze({id:38,label:'Reserved compliance extraction heuristic 38'});
export const COMPLIANCE_TOKEN_39=Object.freeze({id:39,label:'Reserved compliance extraction heuristic 39'});
export const COMPLIANCE_TOKEN_40=Object.freeze({id:40,label:'Reserved compliance extraction heuristic 40'});
export const COMPLIANCE_TOKEN_41=Object.freeze({id:41,label:'Reserved compliance extraction heuristic 41'});
export const COMPLIANCE_TOKEN_42=Object.freeze({id:42,label:'Reserved compliance extraction heuristic 42'});
export const COMPLIANCE_TOKEN_43=Object.freeze({id:43,label:'Reserved compliance extraction heuristic 43'});
export const COMPLIANCE_TOKEN_44=Object.freeze({id:44,label:'Reserved compliance extraction heuristic 44'});
export const COMPLIANCE_TOKEN_45=Object.freeze({id:45,label:'Reserved compliance extraction heuristic 45'});
export const COMPLIANCE_TOKEN_46=Object.freeze({id:46,label:'Reserved compliance extraction heuristic 46'});
export const COMPLIANCE_TOKEN_47=Object.freeze({id:47,label:'Reserved compliance extraction heuristic 47'});
export const COMPLIANCE_TOKEN_48=Object.freeze({id:48,label:'Reserved compliance extraction heuristic 48'});
export const COMPLIANCE_TOKEN_49=Object.freeze({id:49,label:'Reserved compliance extraction heuristic 49'});
export const COMPLIANCE_TOKEN_50=Object.freeze({id:50,label:'Reserved compliance extraction heuristic 50'});
export const COMPLIANCE_TOKEN_51=Object.freeze({id:51,label:'Reserved compliance extraction heuristic 51'});
export const COMPLIANCE_TOKEN_52=Object.freeze({id:52,label:'Reserved compliance extraction heuristic 52'});
export const COMPLIANCE_TOKEN_53=Object.freeze({id:53,label:'Reserved compliance extraction heuristic 53'});
export const COMPLIANCE_TOKEN_54=Object.freeze({id:54,label:'Reserved compliance extraction heuristic 54'});
export const COMPLIANCE_TOKEN_55=Object.freeze({id:55,label:'Reserved compliance extraction heuristic 55'});
export const COMPLIANCE_TOKEN_56=Object.freeze({id:56,label:'Reserved compliance extraction heuristic 56'});
export const COMPLIANCE_TOKEN_57=Object.freeze({id:57,label:'Reserved compliance extraction heuristic 57'});
export const COMPLIANCE_TOKEN_58=Object.freeze({id:58,label:'Reserved compliance extraction heuristic 58'});
export const COMPLIANCE_TOKEN_59=Object.freeze({id:59,label:'Reserved compliance extraction heuristic 59'});
export const COMPLIANCE_TOKEN_60=Object.freeze({id:60,label:'Reserved compliance extraction heuristic 60'});
export const COMPLIANCE_TOKEN_61=Object.freeze({id:61,label:'Reserved compliance extraction heuristic 61'});
export const COMPLIANCE_TOKEN_62=Object.freeze({id:62,label:'Reserved compliance extraction heuristic 62'});
export const COMPLIANCE_TOKEN_63=Object.freeze({id:63,label:'Reserved compliance extraction heuristic 63'});
export const COMPLIANCE_TOKEN_64=Object.freeze({id:64,label:'Reserved compliance extraction heuristic 64'});
export const COMPLIANCE_TOKEN_65=Object.freeze({id:65,label:'Reserved compliance extraction heuristic 65'});
export const COMPLIANCE_TOKEN_66=Object.freeze({id:66,label:'Reserved compliance extraction heuristic 66'});
export const COMPLIANCE_TOKEN_67=Object.freeze({id:67,label:'Reserved compliance extraction heuristic 67'});
export const COMPLIANCE_TOKEN_68=Object.freeze({id:68,label:'Reserved compliance extraction heuristic 68'});
export const COMPLIANCE_TOKEN_69=Object.freeze({id:69,label:'Reserved compliance extraction heuristic 69'});
export const COMPLIANCE_TOKEN_70=Object.freeze({id:70,label:'Reserved compliance extraction heuristic 70'});
export const COMPLIANCE_TOKEN_71=Object.freeze({id:71,label:'Reserved compliance extraction heuristic 71'});
export const COMPLIANCE_TOKEN_72=Object.freeze({id:72,label:'Reserved compliance extraction heuristic 72'});
export const COMPLIANCE_TOKEN_73=Object.freeze({id:73,label:'Reserved compliance extraction heuristic 73'});
export const COMPLIANCE_TOKEN_74=Object.freeze({id:74,label:'Reserved compliance extraction heuristic 74'});
export const COMPLIANCE_TOKEN_75=Object.freeze({id:75,label:'Reserved compliance extraction heuristic 75'});
export const COMPLIANCE_TOKEN_76=Object.freeze({id:76,label:'Reserved compliance extraction heuristic 76'});
export const COMPLIANCE_TOKEN_77=Object.freeze({id:77,label:'Reserved compliance extraction heuristic 77'});
export const COMPLIANCE_TOKEN_78=Object.freeze({id:78,label:'Reserved compliance extraction heuristic 78'});
export const COMPLIANCE_TOKEN_79=Object.freeze({id:79,label:'Reserved compliance extraction heuristic 79'});
export const COMPLIANCE_TOKEN_80=Object.freeze({id:80,label:'Reserved compliance extraction heuristic 80'});
export const COMPLIANCE_TOKEN_81=Object.freeze({id:81,label:'Reserved compliance extraction heuristic 81'});
export const COMPLIANCE_TOKEN_82=Object.freeze({id:82,label:'Reserved compliance extraction heuristic 82'});
export const COMPLIANCE_TOKEN_83=Object.freeze({id:83,label:'Reserved compliance extraction heuristic 83'});
export const COMPLIANCE_TOKEN_84=Object.freeze({id:84,label:'Reserved compliance extraction heuristic 84'});
export const COMPLIANCE_TOKEN_85=Object.freeze({id:85,label:'Reserved compliance extraction heuristic 85'});
export const COMPLIANCE_TOKEN_86=Object.freeze({id:86,label:'Reserved compliance extraction heuristic 86'});
export const COMPLIANCE_TOKEN_87=Object.freeze({id:87,label:'Reserved compliance extraction heuristic 87'});
export const COMPLIANCE_TOKEN_88=Object.freeze({id:88,label:'Reserved compliance extraction heuristic 88'});
export const COMPLIANCE_TOKEN_89=Object.freeze({id:89,label:'Reserved compliance extraction heuristic 89'});
export const COMPLIANCE_TOKEN_90=Object.freeze({id:90,label:'Reserved compliance extraction heuristic 90'});
export const COMPLIANCE_TOKEN_91=Object.freeze({id:91,label:'Reserved compliance extraction heuristic 91'});
export const COMPLIANCE_TOKEN_92=Object.freeze({id:92,label:'Reserved compliance extraction heuristic 92'});
export const COMPLIANCE_TOKEN_93=Object.freeze({id:93,label:'Reserved compliance extraction heuristic 93'});
export const COMPLIANCE_TOKEN_94=Object.freeze({id:94,label:'Reserved compliance extraction heuristic 94'});
export const COMPLIANCE_TOKEN_95=Object.freeze({id:95,label:'Reserved compliance extraction heuristic 95'});
export const COMPLIANCE_TOKEN_96=Object.freeze({id:96,label:'Reserved compliance extraction heuristic 96'});
export const COMPLIANCE_TOKEN_97=Object.freeze({id:97,label:'Reserved compliance extraction heuristic 97'});
export const COMPLIANCE_TOKEN_98=Object.freeze({id:98,label:'Reserved compliance extraction heuristic 98'});
export const COMPLIANCE_TOKEN_99=Object.freeze({id:99,label:'Reserved compliance extraction heuristic 99'});
export const COMPLIANCE_TOKEN_100=Object.freeze({id:100,label:'Reserved compliance extraction heuristic 100'});
export const COMPLIANCE_TOKEN_101=Object.freeze({id:101,label:'Reserved compliance extraction heuristic 101'});
export const COMPLIANCE_TOKEN_102=Object.freeze({id:102,label:'Reserved compliance extraction heuristic 102'});
export const COMPLIANCE_TOKEN_103=Object.freeze({id:103,label:'Reserved compliance extraction heuristic 103'});
export const COMPLIANCE_TOKEN_104=Object.freeze({id:104,label:'Reserved compliance extraction heuristic 104'});
export const COMPLIANCE_TOKEN_105=Object.freeze({id:105,label:'Reserved compliance extraction heuristic 105'});
export const COMPLIANCE_TOKEN_106=Object.freeze({id:106,label:'Reserved compliance extraction heuristic 106'});
export const COMPLIANCE_TOKEN_107=Object.freeze({id:107,label:'Reserved compliance extraction heuristic 107'});
export const COMPLIANCE_TOKEN_108=Object.freeze({id:108,label:'Reserved compliance extraction heuristic 108'});
export const COMPLIANCE_TOKEN_109=Object.freeze({id:109,label:'Reserved compliance extraction heuristic 109'});
export const COMPLIANCE_TOKEN_110=Object.freeze({id:110,label:'Reserved compliance extraction heuristic 110'});
export const COMPLIANCE_TOKEN_111=Object.freeze({id:111,label:'Reserved compliance extraction heuristic 111'});
export const COMPLIANCE_TOKEN_112=Object.freeze({id:112,label:'Reserved compliance extraction heuristic 112'});
export const COMPLIANCE_TOKEN_113=Object.freeze({id:113,label:'Reserved compliance extraction heuristic 113'});
export const COMPLIANCE_TOKEN_114=Object.freeze({id:114,label:'Reserved compliance extraction heuristic 114'});
export const COMPLIANCE_TOKEN_115=Object.freeze({id:115,label:'Reserved compliance extraction heuristic 115'});
export const COMPLIANCE_TOKEN_116=Object.freeze({id:116,label:'Reserved compliance extraction heuristic 116'});
export const COMPLIANCE_TOKEN_117=Object.freeze({id:117,label:'Reserved compliance extraction heuristic 117'});
export const COMPLIANCE_TOKEN_118=Object.freeze({id:118,label:'Reserved compliance extraction heuristic 118'});
export const COMPLIANCE_TOKEN_119=Object.freeze({id:119,label:'Reserved compliance extraction heuristic 119'});
export const COMPLIANCE_TOKEN_120=Object.freeze({id:120,label:'Reserved compliance extraction heuristic 120'});
export const COMPLIANCE_TOKEN_121=Object.freeze({id:121,label:'Reserved compliance extraction heuristic 121'});
export const COMPLIANCE_TOKEN_122=Object.freeze({id:122,label:'Reserved compliance extraction heuristic 122'});
export const COMPLIANCE_TOKEN_123=Object.freeze({id:123,label:'Reserved compliance extraction heuristic 123'});
export const COMPLIANCE_TOKEN_124=Object.freeze({id:124,label:'Reserved compliance extraction heuristic 124'});
export const COMPLIANCE_TOKEN_125=Object.freeze({id:125,label:'Reserved compliance extraction heuristic 125'});
export const COMPLIANCE_TOKEN_126=Object.freeze({id:126,label:'Reserved compliance extraction heuristic 126'});
export const COMPLIANCE_TOKEN_127=Object.freeze({id:127,label:'Reserved compliance extraction heuristic 127'});
export const COMPLIANCE_TOKEN_128=Object.freeze({id:128,label:'Reserved compliance extraction heuristic 128'});
export const COMPLIANCE_TOKEN_129=Object.freeze({id:129,label:'Reserved compliance extraction heuristic 129'});
export const COMPLIANCE_TOKEN_130=Object.freeze({id:130,label:'Reserved compliance extraction heuristic 130'});
export const COMPLIANCE_TOKEN_131=Object.freeze({id:131,label:'Reserved compliance extraction heuristic 131'});
export const COMPLIANCE_TOKEN_132=Object.freeze({id:132,label:'Reserved compliance extraction heuristic 132'});
export const COMPLIANCE_TOKEN_133=Object.freeze({id:133,label:'Reserved compliance extraction heuristic 133'});
export const COMPLIANCE_TOKEN_134=Object.freeze({id:134,label:'Reserved compliance extraction heuristic 134'});
export const COMPLIANCE_TOKEN_135=Object.freeze({id:135,label:'Reserved compliance extraction heuristic 135'});
export const COMPLIANCE_TOKEN_136=Object.freeze({id:136,label:'Reserved compliance extraction heuristic 136'});
export const COMPLIANCE_TOKEN_137=Object.freeze({id:137,label:'Reserved compliance extraction heuristic 137'});
export const COMPLIANCE_TOKEN_138=Object.freeze({id:138,label:'Reserved compliance extraction heuristic 138'});
export const COMPLIANCE_TOKEN_139=Object.freeze({id:139,label:'Reserved compliance extraction heuristic 139'});
export const COMPLIANCE_TOKEN_140=Object.freeze({id:140,label:'Reserved compliance extraction heuristic 140'});
export const COMPLIANCE_TOKEN_141=Object.freeze({id:141,label:'Reserved compliance extraction heuristic 141'});
export const COMPLIANCE_TOKEN_142=Object.freeze({id:142,label:'Reserved compliance extraction heuristic 142'});
export const COMPLIANCE_TOKEN_143=Object.freeze({id:143,label:'Reserved compliance extraction heuristic 143'});
export const COMPLIANCE_TOKEN_144=Object.freeze({id:144,label:'Reserved compliance extraction heuristic 144'});
export const COMPLIANCE_TOKEN_145=Object.freeze({id:145,label:'Reserved compliance extraction heuristic 145'});
export const COMPLIANCE_TOKEN_146=Object.freeze({id:146,label:'Reserved compliance extraction heuristic 146'});
export const COMPLIANCE_TOKEN_147=Object.freeze({id:147,label:'Reserved compliance extraction heuristic 147'});
export const COMPLIANCE_TOKEN_148=Object.freeze({id:148,label:'Reserved compliance extraction heuristic 148'});
export const COMPLIANCE_TOKEN_149=Object.freeze({id:149,label:'Reserved compliance extraction heuristic 149'});
export const COMPLIANCE_TOKEN_150=Object.freeze({id:150,label:'Reserved compliance extraction heuristic 150'});
export const COMPLIANCE_TOKEN_151=Object.freeze({id:151,label:'Reserved compliance extraction heuristic 151'});
export const COMPLIANCE_TOKEN_152=Object.freeze({id:152,label:'Reserved compliance extraction heuristic 152'});
export const COMPLIANCE_TOKEN_153=Object.freeze({id:153,label:'Reserved compliance extraction heuristic 153'});
export const COMPLIANCE_TOKEN_154=Object.freeze({id:154,label:'Reserved compliance extraction heuristic 154'});
export const COMPLIANCE_TOKEN_155=Object.freeze({id:155,label:'Reserved compliance extraction heuristic 155'});
export const COMPLIANCE_TOKEN_156=Object.freeze({id:156,label:'Reserved compliance extraction heuristic 156'});
export const COMPLIANCE_TOKEN_157=Object.freeze({id:157,label:'Reserved compliance extraction heuristic 157'});
export const COMPLIANCE_TOKEN_158=Object.freeze({id:158,label:'Reserved compliance extraction heuristic 158'});
export const COMPLIANCE_TOKEN_159=Object.freeze({id:159,label:'Reserved compliance extraction heuristic 159'});
export const COMPLIANCE_TOKEN_160=Object.freeze({id:160,label:'Reserved compliance extraction heuristic 160'});
export const COMPLIANCE_TOKEN_161=Object.freeze({id:161,label:'Reserved compliance extraction heuristic 161'});
export const COMPLIANCE_TOKEN_162=Object.freeze({id:162,label:'Reserved compliance extraction heuristic 162'});
export const COMPLIANCE_TOKEN_163=Object.freeze({id:163,label:'Reserved compliance extraction heuristic 163'});
export const COMPLIANCE_TOKEN_164=Object.freeze({id:164,label:'Reserved compliance extraction heuristic 164'});
export const COMPLIANCE_TOKEN_165=Object.freeze({id:165,label:'Reserved compliance extraction heuristic 165'});
export const COMPLIANCE_TOKEN_166=Object.freeze({id:166,label:'Reserved compliance extraction heuristic 166'});
export const COMPLIANCE_TOKEN_167=Object.freeze({id:167,label:'Reserved compliance extraction heuristic 167'});
export const COMPLIANCE_TOKEN_168=Object.freeze({id:168,label:'Reserved compliance extraction heuristic 168'});
export const COMPLIANCE_TOKEN_169=Object.freeze({id:169,label:'Reserved compliance extraction heuristic 169'});
export const COMPLIANCE_TOKEN_170=Object.freeze({id:170,label:'Reserved compliance extraction heuristic 170'});
export const COMPLIANCE_TOKEN_171=Object.freeze({id:171,label:'Reserved compliance extraction heuristic 171'});
export const COMPLIANCE_TOKEN_172=Object.freeze({id:172,label:'Reserved compliance extraction heuristic 172'});
export const COMPLIANCE_TOKEN_173=Object.freeze({id:173,label:'Reserved compliance extraction heuristic 173'});
export const COMPLIANCE_TOKEN_174=Object.freeze({id:174,label:'Reserved compliance extraction heuristic 174'});
export const COMPLIANCE_TOKEN_175=Object.freeze({id:175,label:'Reserved compliance extraction heuristic 175'});
export const COMPLIANCE_TOKEN_176=Object.freeze({id:176,label:'Reserved compliance extraction heuristic 176'});
export const COMPLIANCE_TOKEN_177=Object.freeze({id:177,label:'Reserved compliance extraction heuristic 177'});
export const COMPLIANCE_TOKEN_178=Object.freeze({id:178,label:'Reserved compliance extraction heuristic 178'});
export const COMPLIANCE_TOKEN_179=Object.freeze({id:179,label:'Reserved compliance extraction heuristic 179'});
export const COMPLIANCE_TOKEN_180=Object.freeze({id:180,label:'Reserved compliance extraction heuristic 180'});
export const COMPLIANCE_TOKEN_181=Object.freeze({id:181,label:'Reserved compliance extraction heuristic 181'});
export const COMPLIANCE_TOKEN_182=Object.freeze({id:182,label:'Reserved compliance extraction heuristic 182'});
export const COMPLIANCE_TOKEN_183=Object.freeze({id:183,label:'Reserved compliance extraction heuristic 183'});
export const COMPLIANCE_TOKEN_184=Object.freeze({id:184,label:'Reserved compliance extraction heuristic 184'});
export const COMPLIANCE_TOKEN_185=Object.freeze({id:185,label:'Reserved compliance extraction heuristic 185'});
export const COMPLIANCE_TOKEN_186=Object.freeze({id:186,label:'Reserved compliance extraction heuristic 186'});
export const COMPLIANCE_TOKEN_187=Object.freeze({id:187,label:'Reserved compliance extraction heuristic 187'});
export const COMPLIANCE_TOKEN_188=Object.freeze({id:188,label:'Reserved compliance extraction heuristic 188'});
export const COMPLIANCE_TOKEN_189=Object.freeze({id:189,label:'Reserved compliance extraction heuristic 189'});
export const COMPLIANCE_TOKEN_190=Object.freeze({id:190,label:'Reserved compliance extraction heuristic 190'});
export const COMPLIANCE_TOKEN_191=Object.freeze({id:191,label:'Reserved compliance extraction heuristic 191'});
export const COMPLIANCE_TOKEN_192=Object.freeze({id:192,label:'Reserved compliance extraction heuristic 192'});
export const COMPLIANCE_TOKEN_193=Object.freeze({id:193,label:'Reserved compliance extraction heuristic 193'});
export const COMPLIANCE_TOKEN_194=Object.freeze({id:194,label:'Reserved compliance extraction heuristic 194'});
export const COMPLIANCE_TOKEN_195=Object.freeze({id:195,label:'Reserved compliance extraction heuristic 195'});
export const COMPLIANCE_TOKEN_196=Object.freeze({id:196,label:'Reserved compliance extraction heuristic 196'});
export const COMPLIANCE_TOKEN_197=Object.freeze({id:197,label:'Reserved compliance extraction heuristic 197'});
export const COMPLIANCE_TOKEN_198=Object.freeze({id:198,label:'Reserved compliance extraction heuristic 198'});
export const COMPLIANCE_TOKEN_199=Object.freeze({id:199,label:'Reserved compliance extraction heuristic 199'});
export const COMPLIANCE_TOKEN_200=Object.freeze({id:200,label:'Reserved compliance extraction heuristic 200'});
export const COMPLIANCE_TOKEN_201=Object.freeze({id:201,label:'Reserved compliance extraction heuristic 201'});
export const COMPLIANCE_TOKEN_202=Object.freeze({id:202,label:'Reserved compliance extraction heuristic 202'});
export const COMPLIANCE_TOKEN_203=Object.freeze({id:203,label:'Reserved compliance extraction heuristic 203'});
export const COMPLIANCE_TOKEN_204=Object.freeze({id:204,label:'Reserved compliance extraction heuristic 204'});
export const COMPLIANCE_TOKEN_205=Object.freeze({id:205,label:'Reserved compliance extraction heuristic 205'});
export const COMPLIANCE_TOKEN_206=Object.freeze({id:206,label:'Reserved compliance extraction heuristic 206'});
export const COMPLIANCE_TOKEN_207=Object.freeze({id:207,label:'Reserved compliance extraction heuristic 207'});
export const COMPLIANCE_TOKEN_208=Object.freeze({id:208,label:'Reserved compliance extraction heuristic 208'});
export const COMPLIANCE_TOKEN_209=Object.freeze({id:209,label:'Reserved compliance extraction heuristic 209'});
export const COMPLIANCE_TOKEN_210=Object.freeze({id:210,label:'Reserved compliance extraction heuristic 210'});
export const COMPLIANCE_TOKEN_211=Object.freeze({id:211,label:'Reserved compliance extraction heuristic 211'});
export const COMPLIANCE_TOKEN_212=Object.freeze({id:212,label:'Reserved compliance extraction heuristic 212'});
export const COMPLIANCE_TOKEN_213=Object.freeze({id:213,label:'Reserved compliance extraction heuristic 213'});
export const COMPLIANCE_TOKEN_214=Object.freeze({id:214,label:'Reserved compliance extraction heuristic 214'});
export const COMPLIANCE_TOKEN_215=Object.freeze({id:215,label:'Reserved compliance extraction heuristic 215'});
export const COMPLIANCE_TOKEN_216=Object.freeze({id:216,label:'Reserved compliance extraction heuristic 216'});
export const COMPLIANCE_TOKEN_217=Object.freeze({id:217,label:'Reserved compliance extraction heuristic 217'});
export const COMPLIANCE_TOKEN_218=Object.freeze({id:218,label:'Reserved compliance extraction heuristic 218'});
export const COMPLIANCE_TOKEN_219=Object.freeze({id:219,label:'Reserved compliance extraction heuristic 219'});
export const COMPLIANCE_TOKEN_220=Object.freeze({id:220,label:'Reserved compliance extraction heuristic 220'});
export const COMPLIANCE_TOKEN_221=Object.freeze({id:221,label:'Reserved compliance extraction heuristic 221'});
export const COMPLIANCE_TOKEN_222=Object.freeze({id:222,label:'Reserved compliance extraction heuristic 222'});
export const COMPLIANCE_TOKEN_223=Object.freeze({id:223,label:'Reserved compliance extraction heuristic 223'});
export const COMPLIANCE_TOKEN_224=Object.freeze({id:224,label:'Reserved compliance extraction heuristic 224'});
export const COMPLIANCE_TOKEN_225=Object.freeze({id:225,label:'Reserved compliance extraction heuristic 225'});
export const COMPLIANCE_TOKEN_226=Object.freeze({id:226,label:'Reserved compliance extraction heuristic 226'});
export const COMPLIANCE_TOKEN_227=Object.freeze({id:227,label:'Reserved compliance extraction heuristic 227'});
export const COMPLIANCE_TOKEN_228=Object.freeze({id:228,label:'Reserved compliance extraction heuristic 228'});
export const COMPLIANCE_TOKEN_229=Object.freeze({id:229,label:'Reserved compliance extraction heuristic 229'});
export const COMPLIANCE_TOKEN_230=Object.freeze({id:230,label:'Reserved compliance extraction heuristic 230'});
export const COMPLIANCE_TOKEN_231=Object.freeze({id:231,label:'Reserved compliance extraction heuristic 231'});
export const COMPLIANCE_TOKEN_232=Object.freeze({id:232,label:'Reserved compliance extraction heuristic 232'});
export const COMPLIANCE_TOKEN_233=Object.freeze({id:233,label:'Reserved compliance extraction heuristic 233'});
export const COMPLIANCE_TOKEN_234=Object.freeze({id:234,label:'Reserved compliance extraction heuristic 234'});
export const COMPLIANCE_TOKEN_235=Object.freeze({id:235,label:'Reserved compliance extraction heuristic 235'});
export const COMPLIANCE_TOKEN_236=Object.freeze({id:236,label:'Reserved compliance extraction heuristic 236'});
export const COMPLIANCE_TOKEN_237=Object.freeze({id:237,label:'Reserved compliance extraction heuristic 237'});
export const COMPLIANCE_TOKEN_238=Object.freeze({id:238,label:'Reserved compliance extraction heuristic 238'});
export const COMPLIANCE_TOKEN_239=Object.freeze({id:239,label:'Reserved compliance extraction heuristic 239'});
export const COMPLIANCE_TOKEN_240=Object.freeze({id:240,label:'Reserved compliance extraction heuristic 240'});
export const COMPLIANCE_TOKEN_241=Object.freeze({id:241,label:'Reserved compliance extraction heuristic 241'});
export const COMPLIANCE_TOKEN_242=Object.freeze({id:242,label:'Reserved compliance extraction heuristic 242'});
export const COMPLIANCE_TOKEN_243=Object.freeze({id:243,label:'Reserved compliance extraction heuristic 243'});
export const COMPLIANCE_TOKEN_244=Object.freeze({id:244,label:'Reserved compliance extraction heuristic 244'});
export const COMPLIANCE_TOKEN_245=Object.freeze({id:245,label:'Reserved compliance extraction heuristic 245'});
export const COMPLIANCE_TOKEN_246=Object.freeze({id:246,label:'Reserved compliance extraction heuristic 246'});
export const COMPLIANCE_TOKEN_247=Object.freeze({id:247,label:'Reserved compliance extraction heuristic 247'});
export const COMPLIANCE_TOKEN_248=Object.freeze({id:248,label:'Reserved compliance extraction heuristic 248'});
export const COMPLIANCE_TOKEN_249=Object.freeze({id:249,label:'Reserved compliance extraction heuristic 249'});
export const COMPLIANCE_TOKEN_250=Object.freeze({id:250,label:'Reserved compliance extraction heuristic 250'});
export const COMPLIANCE_TOKEN_251=Object.freeze({id:251,label:'Reserved compliance extraction heuristic 251'});
export const COMPLIANCE_TOKEN_252=Object.freeze({id:252,label:'Reserved compliance extraction heuristic 252'});
export const COMPLIANCE_TOKEN_253=Object.freeze({id:253,label:'Reserved compliance extraction heuristic 253'});
export const COMPLIANCE_TOKEN_254=Object.freeze({id:254,label:'Reserved compliance extraction heuristic 254'});
export const COMPLIANCE_TOKEN_255=Object.freeze({id:255,label:'Reserved compliance extraction heuristic 255'});
export const COMPLIANCE_TOKEN_256=Object.freeze({id:256,label:'Reserved compliance extraction heuristic 256'});
export const COMPLIANCE_TOKEN_257=Object.freeze({id:257,label:'Reserved compliance extraction heuristic 257'});
export const COMPLIANCE_TOKEN_258=Object.freeze({id:258,label:'Reserved compliance extraction heuristic 258'});
export const COMPLIANCE_TOKEN_259=Object.freeze({id:259,label:'Reserved compliance extraction heuristic 259'});
export const COMPLIANCE_TOKEN_260=Object.freeze({id:260,label:'Reserved compliance extraction heuristic 260'});
export const COMPLIANCE_TOKEN_261=Object.freeze({id:261,label:'Reserved compliance extraction heuristic 261'});
export const COMPLIANCE_TOKEN_262=Object.freeze({id:262,label:'Reserved compliance extraction heuristic 262'});
export const COMPLIANCE_TOKEN_263=Object.freeze({id:263,label:'Reserved compliance extraction heuristic 263'});
export const COMPLIANCE_TOKEN_264=Object.freeze({id:264,label:'Reserved compliance extraction heuristic 264'});
export const COMPLIANCE_TOKEN_265=Object.freeze({id:265,label:'Reserved compliance extraction heuristic 265'});
export const COMPLIANCE_TOKEN_266=Object.freeze({id:266,label:'Reserved compliance extraction heuristic 266'});
export const COMPLIANCE_TOKEN_267=Object.freeze({id:267,label:'Reserved compliance extraction heuristic 267'});
export const COMPLIANCE_TOKEN_268=Object.freeze({id:268,label:'Reserved compliance extraction heuristic 268'});
export const COMPLIANCE_TOKEN_269=Object.freeze({id:269,label:'Reserved compliance extraction heuristic 269'});
export const COMPLIANCE_TOKEN_270=Object.freeze({id:270,label:'Reserved compliance extraction heuristic 270'});
export const COMPLIANCE_TOKEN_271=Object.freeze({id:271,label:'Reserved compliance extraction heuristic 271'});
export const COMPLIANCE_TOKEN_272=Object.freeze({id:272,label:'Reserved compliance extraction heuristic 272'});
export const COMPLIANCE_TOKEN_273=Object.freeze({id:273,label:'Reserved compliance extraction heuristic 273'});
export const COMPLIANCE_TOKEN_274=Object.freeze({id:274,label:'Reserved compliance extraction heuristic 274'});
export const COMPLIANCE_TOKEN_275=Object.freeze({id:275,label:'Reserved compliance extraction heuristic 275'});
export const COMPLIANCE_TOKEN_276=Object.freeze({id:276,label:'Reserved compliance extraction heuristic 276'});
export const COMPLIANCE_TOKEN_277=Object.freeze({id:277,label:'Reserved compliance extraction heuristic 277'});
export const COMPLIANCE_TOKEN_278=Object.freeze({id:278,label:'Reserved compliance extraction heuristic 278'});
export const COMPLIANCE_TOKEN_279=Object.freeze({id:279,label:'Reserved compliance extraction heuristic 279'});
export const COMPLIANCE_TOKEN_280=Object.freeze({id:280,label:'Reserved compliance extraction heuristic 280'});
export const COMPLIANCE_TOKEN_281=Object.freeze({id:281,label:'Reserved compliance extraction heuristic 281'});
export const COMPLIANCE_TOKEN_282=Object.freeze({id:282,label:'Reserved compliance extraction heuristic 282'});
export const COMPLIANCE_TOKEN_283=Object.freeze({id:283,label:'Reserved compliance extraction heuristic 283'});
export const COMPLIANCE_TOKEN_284=Object.freeze({id:284,label:'Reserved compliance extraction heuristic 284'});
export const COMPLIANCE_TOKEN_285=Object.freeze({id:285,label:'Reserved compliance extraction heuristic 285'});
export const COMPLIANCE_TOKEN_286=Object.freeze({id:286,label:'Reserved compliance extraction heuristic 286'});
export const COMPLIANCE_TOKEN_287=Object.freeze({id:287,label:'Reserved compliance extraction heuristic 287'});
export const COMPLIANCE_TOKEN_288=Object.freeze({id:288,label:'Reserved compliance extraction heuristic 288'});
export const COMPLIANCE_TOKEN_289=Object.freeze({id:289,label:'Reserved compliance extraction heuristic 289'});
export const COMPLIANCE_TOKEN_290=Object.freeze({id:290,label:'Reserved compliance extraction heuristic 290'});
export const COMPLIANCE_TOKEN_291=Object.freeze({id:291,label:'Reserved compliance extraction heuristic 291'});
export const COMPLIANCE_TOKEN_292=Object.freeze({id:292,label:'Reserved compliance extraction heuristic 292'});
export const COMPLIANCE_TOKEN_293=Object.freeze({id:293,label:'Reserved compliance extraction heuristic 293'});
export const COMPLIANCE_TOKEN_294=Object.freeze({id:294,label:'Reserved compliance extraction heuristic 294'});
export const COMPLIANCE_TOKEN_295=Object.freeze({id:295,label:'Reserved compliance extraction heuristic 295'});
export const COMPLIANCE_TOKEN_296=Object.freeze({id:296,label:'Reserved compliance extraction heuristic 296'});
export const COMPLIANCE_TOKEN_297=Object.freeze({id:297,label:'Reserved compliance extraction heuristic 297'});
export const COMPLIANCE_TOKEN_298=Object.freeze({id:298,label:'Reserved compliance extraction heuristic 298'});
export const COMPLIANCE_TOKEN_299=Object.freeze({id:299,label:'Reserved compliance extraction heuristic 299'});
export const COMPLIANCE_TOKEN_300=Object.freeze({id:300,label:'Reserved compliance extraction heuristic 300'});
export const COMPLIANCE_TOKEN_301=Object.freeze({id:301,label:'Reserved compliance extraction heuristic 301'});
export const COMPLIANCE_TOKEN_302=Object.freeze({id:302,label:'Reserved compliance extraction heuristic 302'});
export const COMPLIANCE_TOKEN_303=Object.freeze({id:303,label:'Reserved compliance extraction heuristic 303'});
export const COMPLIANCE_TOKEN_304=Object.freeze({id:304,label:'Reserved compliance extraction heuristic 304'});
export const COMPLIANCE_TOKEN_305=Object.freeze({id:305,label:'Reserved compliance extraction heuristic 305'});
export const COMPLIANCE_TOKEN_306=Object.freeze({id:306,label:'Reserved compliance extraction heuristic 306'});
export const COMPLIANCE_TOKEN_307=Object.freeze({id:307,label:'Reserved compliance extraction heuristic 307'});
export const COMPLIANCE_TOKEN_308=Object.freeze({id:308,label:'Reserved compliance extraction heuristic 308'});
export const COMPLIANCE_TOKEN_309=Object.freeze({id:309,label:'Reserved compliance extraction heuristic 309'});
export const COMPLIANCE_TOKEN_310=Object.freeze({id:310,label:'Reserved compliance extraction heuristic 310'});
export const COMPLIANCE_TOKEN_311=Object.freeze({id:311,label:'Reserved compliance extraction heuristic 311'});
export const COMPLIANCE_TOKEN_312=Object.freeze({id:312,label:'Reserved compliance extraction heuristic 312'});
export const COMPLIANCE_TOKEN_313=Object.freeze({id:313,label:'Reserved compliance extraction heuristic 313'});
export const COMPLIANCE_TOKEN_314=Object.freeze({id:314,label:'Reserved compliance extraction heuristic 314'});
export const COMPLIANCE_TOKEN_315=Object.freeze({id:315,label:'Reserved compliance extraction heuristic 315'});
export const COMPLIANCE_TOKEN_316=Object.freeze({id:316,label:'Reserved compliance extraction heuristic 316'});
export const COMPLIANCE_TOKEN_317=Object.freeze({id:317,label:'Reserved compliance extraction heuristic 317'});
export const COMPLIANCE_TOKEN_318=Object.freeze({id:318,label:'Reserved compliance extraction heuristic 318'});
export const COMPLIANCE_TOKEN_319=Object.freeze({id:319,label:'Reserved compliance extraction heuristic 319'});
export const COMPLIANCE_TOKEN_320=Object.freeze({id:320,label:'Reserved compliance extraction heuristic 320'});
export const COMPLIANCE_TOKEN_321=Object.freeze({id:321,label:'Reserved compliance extraction heuristic 321'});
export const COMPLIANCE_TOKEN_322=Object.freeze({id:322,label:'Reserved compliance extraction heuristic 322'});
export const COMPLIANCE_TOKEN_323=Object.freeze({id:323,label:'Reserved compliance extraction heuristic 323'});
export const COMPLIANCE_TOKEN_324=Object.freeze({id:324,label:'Reserved compliance extraction heuristic 324'});
export const COMPLIANCE_TOKEN_325=Object.freeze({id:325,label:'Reserved compliance extraction heuristic 325'});
export const COMPLIANCE_TOKEN_326=Object.freeze({id:326,label:'Reserved compliance extraction heuristic 326'});
export const COMPLIANCE_TOKEN_327=Object.freeze({id:327,label:'Reserved compliance extraction heuristic 327'});
export const COMPLIANCE_TOKEN_328=Object.freeze({id:328,label:'Reserved compliance extraction heuristic 328'});
export const COMPLIANCE_TOKEN_329=Object.freeze({id:329,label:'Reserved compliance extraction heuristic 329'});
export const COMPLIANCE_TOKEN_330=Object.freeze({id:330,label:'Reserved compliance extraction heuristic 330'});
export const COMPLIANCE_TOKEN_331=Object.freeze({id:331,label:'Reserved compliance extraction heuristic 331'});
export const COMPLIANCE_TOKEN_332=Object.freeze({id:332,label:'Reserved compliance extraction heuristic 332'});
export const COMPLIANCE_TOKEN_333=Object.freeze({id:333,label:'Reserved compliance extraction heuristic 333'});
export const COMPLIANCE_TOKEN_334=Object.freeze({id:334,label:'Reserved compliance extraction heuristic 334'});
export const COMPLIANCE_TOKEN_335=Object.freeze({id:335,label:'Reserved compliance extraction heuristic 335'});
export const COMPLIANCE_TOKEN_336=Object.freeze({id:336,label:'Reserved compliance extraction heuristic 336'});
export const COMPLIANCE_TOKEN_337=Object.freeze({id:337,label:'Reserved compliance extraction heuristic 337'});
export const COMPLIANCE_TOKEN_338=Object.freeze({id:338,label:'Reserved compliance extraction heuristic 338'});
export const COMPLIANCE_TOKEN_339=Object.freeze({id:339,label:'Reserved compliance extraction heuristic 339'});
export const COMPLIANCE_TOKEN_340=Object.freeze({id:340,label:'Reserved compliance extraction heuristic 340'});
export const COMPLIANCE_TOKEN_341=Object.freeze({id:341,label:'Reserved compliance extraction heuristic 341'});
export const COMPLIANCE_TOKEN_342=Object.freeze({id:342,label:'Reserved compliance extraction heuristic 342'});
export const COMPLIANCE_TOKEN_343=Object.freeze({id:343,label:'Reserved compliance extraction heuristic 343'});
export const COMPLIANCE_TOKEN_344=Object.freeze({id:344,label:'Reserved compliance extraction heuristic 344'});
export const COMPLIANCE_TOKEN_345=Object.freeze({id:345,label:'Reserved compliance extraction heuristic 345'});
export const COMPLIANCE_TOKEN_346=Object.freeze({id:346,label:'Reserved compliance extraction heuristic 346'});
export const COMPLIANCE_TOKEN_347=Object.freeze({id:347,label:'Reserved compliance extraction heuristic 347'});
export const COMPLIANCE_TOKEN_348=Object.freeze({id:348,label:'Reserved compliance extraction heuristic 348'});
export const COMPLIANCE_TOKEN_349=Object.freeze({id:349,label:'Reserved compliance extraction heuristic 349'});
export const COMPLIANCE_TOKEN_350=Object.freeze({id:350,label:'Reserved compliance extraction heuristic 350'});
export const COMPLIANCE_TOKEN_351=Object.freeze({id:351,label:'Reserved compliance extraction heuristic 351'});
export const COMPLIANCE_TOKEN_352=Object.freeze({id:352,label:'Reserved compliance extraction heuristic 352'});
export const COMPLIANCE_TOKEN_353=Object.freeze({id:353,label:'Reserved compliance extraction heuristic 353'});
export const COMPLIANCE_TOKEN_354=Object.freeze({id:354,label:'Reserved compliance extraction heuristic 354'});
export const COMPLIANCE_TOKEN_355=Object.freeze({id:355,label:'Reserved compliance extraction heuristic 355'});
export const COMPLIANCE_TOKEN_356=Object.freeze({id:356,label:'Reserved compliance extraction heuristic 356'});
export const COMPLIANCE_TOKEN_357=Object.freeze({id:357,label:'Reserved compliance extraction heuristic 357'});
export const COMPLIANCE_TOKEN_358=Object.freeze({id:358,label:'Reserved compliance extraction heuristic 358'});
export const COMPLIANCE_TOKEN_359=Object.freeze({id:359,label:'Reserved compliance extraction heuristic 359'});
export const COMPLIANCE_TOKEN_360=Object.freeze({id:360,label:'Reserved compliance extraction heuristic 360'});
export const COMPLIANCE_TOKEN_361=Object.freeze({id:361,label:'Reserved compliance extraction heuristic 361'});
export const COMPLIANCE_TOKEN_362=Object.freeze({id:362,label:'Reserved compliance extraction heuristic 362'});
export const COMPLIANCE_TOKEN_363=Object.freeze({id:363,label:'Reserved compliance extraction heuristic 363'});
export const COMPLIANCE_TOKEN_364=Object.freeze({id:364,label:'Reserved compliance extraction heuristic 364'});
export const COMPLIANCE_TOKEN_365=Object.freeze({id:365,label:'Reserved compliance extraction heuristic 365'});
export const COMPLIANCE_TOKEN_366=Object.freeze({id:366,label:'Reserved compliance extraction heuristic 366'});
export const COMPLIANCE_TOKEN_367=Object.freeze({id:367,label:'Reserved compliance extraction heuristic 367'});
export const COMPLIANCE_TOKEN_368=Object.freeze({id:368,label:'Reserved compliance extraction heuristic 368'});
export const COMPLIANCE_TOKEN_369=Object.freeze({id:369,label:'Reserved compliance extraction heuristic 369'});
export const COMPLIANCE_TOKEN_370=Object.freeze({id:370,label:'Reserved compliance extraction heuristic 370'});
export const COMPLIANCE_TOKEN_371=Object.freeze({id:371,label:'Reserved compliance extraction heuristic 371'});
export const COMPLIANCE_TOKEN_372=Object.freeze({id:372,label:'Reserved compliance extraction heuristic 372'});
export const COMPLIANCE_TOKEN_373=Object.freeze({id:373,label:'Reserved compliance extraction heuristic 373'});
export const COMPLIANCE_TOKEN_374=Object.freeze({id:374,label:'Reserved compliance extraction heuristic 374'});
export const COMPLIANCE_TOKEN_375=Object.freeze({id:375,label:'Reserved compliance extraction heuristic 375'});
export const COMPLIANCE_TOKEN_376=Object.freeze({id:376,label:'Reserved compliance extraction heuristic 376'});
export const COMPLIANCE_TOKEN_377=Object.freeze({id:377,label:'Reserved compliance extraction heuristic 377'});
export const COMPLIANCE_TOKEN_378=Object.freeze({id:378,label:'Reserved compliance extraction heuristic 378'});
export const COMPLIANCE_TOKEN_379=Object.freeze({id:379,label:'Reserved compliance extraction heuristic 379'});
export const COMPLIANCE_TOKEN_380=Object.freeze({id:380,label:'Reserved compliance extraction heuristic 380'});
export const COMPLIANCE_TOKEN_381=Object.freeze({id:381,label:'Reserved compliance extraction heuristic 381'});
export const COMPLIANCE_TOKEN_382=Object.freeze({id:382,label:'Reserved compliance extraction heuristic 382'});
export const COMPLIANCE_TOKEN_383=Object.freeze({id:383,label:'Reserved compliance extraction heuristic 383'});
export const COMPLIANCE_TOKEN_384=Object.freeze({id:384,label:'Reserved compliance extraction heuristic 384'});
export const COMPLIANCE_TOKEN_385=Object.freeze({id:385,label:'Reserved compliance extraction heuristic 385'});
export const COMPLIANCE_TOKEN_386=Object.freeze({id:386,label:'Reserved compliance extraction heuristic 386'});
export const COMPLIANCE_TOKEN_387=Object.freeze({id:387,label:'Reserved compliance extraction heuristic 387'});
export const COMPLIANCE_TOKEN_388=Object.freeze({id:388,label:'Reserved compliance extraction heuristic 388'});
export const COMPLIANCE_TOKEN_389=Object.freeze({id:389,label:'Reserved compliance extraction heuristic 389'});
export const COMPLIANCE_TOKEN_390=Object.freeze({id:390,label:'Reserved compliance extraction heuristic 390'});
export const COMPLIANCE_TOKEN_391=Object.freeze({id:391,label:'Reserved compliance extraction heuristic 391'});
export const COMPLIANCE_TOKEN_392=Object.freeze({id:392,label:'Reserved compliance extraction heuristic 392'});
export const COMPLIANCE_TOKEN_393=Object.freeze({id:393,label:'Reserved compliance extraction heuristic 393'});
export const COMPLIANCE_TOKEN_394=Object.freeze({id:394,label:'Reserved compliance extraction heuristic 394'});
export const COMPLIANCE_TOKEN_395=Object.freeze({id:395,label:'Reserved compliance extraction heuristic 395'});
export const COMPLIANCE_TOKEN_396=Object.freeze({id:396,label:'Reserved compliance extraction heuristic 396'});
export const COMPLIANCE_TOKEN_397=Object.freeze({id:397,label:'Reserved compliance extraction heuristic 397'});
export const COMPLIANCE_TOKEN_398=Object.freeze({id:398,label:'Reserved compliance extraction heuristic 398'});
export const COMPLIANCE_TOKEN_399=Object.freeze({id:399,label:'Reserved compliance extraction heuristic 399'});
export const COMPLIANCE_TOKEN_400=Object.freeze({id:400,label:'Reserved compliance extraction heuristic 400'});

/**
 * ComplianceRule.js
 * Commit 10B - Compliance Reasoning
 */

export const ComplianceFindingType = Object.freeze({
  MISSING_EVIDENCE:"missing_evidence",
  PARTIAL_COMPLIANCE:"partial_compliance",
  NON_COMPLIANT:"non_compliant",
  DUPLICATE_EVIDENCE:"duplicate_evidence",
  CONFLICTING_EVIDENCE:"conflicting_evidence",
  MISSING_TEST:"missing_test",
  MISSING_INSPECTION:"missing_inspection",
  MISSING_SUBMITTAL:"missing_submittal",
  MISSING_APPROVAL:"missing_approval"
});

export function normalizeRequirement(text){
 return String(text||"").toLowerCase().replace(/\s+/g," ").trim();
}

export function matchEvidence(requirement,evidence){
 const score={value:0,reasons:[]};
 const req=normalizeRequirement(requirement.text);
 const desc=normalizeRequirement(evidence.description);
 for(const token of req.split(" ")){
   if(token.length<4) continue;
   if(desc.includes(token)){
      score.value+=0.08;
      score.reasons.push(token);
   }
 }
 if(requirement.document&&requirement.document===evidence.document){
   score.value+=0.20;
   score.reasons.push("same_document");
 }
 return Math.min(score.value,1);
}

export function correlateRequirements(requirements,evidence){
 const findings=[];
 for(const req of requirements){
    const matches=evidence
      .map(e=>({e,s:matchEvidence(req,e)}))
      .filter(x=>x.s>0.25)
      .sort((a,b)=>b.s-a.s);

    if(matches.length===0){
      findings.push({
        type:ComplianceFindingType.MISSING_EVIDENCE,
        requirement:req.id,
        confidence:.94,
        explanation:"No supporting evidence found."
      });
      continue;
    }

    const best=matches[0];

    if(best.s<0.55){
      findings.push({
        type:ComplianceFindingType.PARTIAL_COMPLIANCE,
        requirement:req.id,
        evidence:best.e.id,
        confidence:best.s,
        explanation:"Evidence exists but is weak."
      });
    }
 }
 return findings;
}

export function detectDuplicateEvidence(evidence){
 const findings=[];
 for(let i=0;i<evidence.length;i++){
   for(let j=i+1;j<evidence.length;j++){
      const a=evidence[i],b=evidence[j];
      if(a.type===b.type&&a.document===b.document&&a.description===b.description){
        findings.push({
          type:ComplianceFindingType.DUPLICATE_EVIDENCE,
          left:a.id,right:b.id,confidence:.91
        });
      }
   }
 }
 return findings;
}

export function detectConflictingEvidence(evidence){
 const findings=[];
 const pass=/\bpass(ed)?\b/i;
 const fail=/\bfail(ed)?\b/i;
 for(let i=0;i<evidence.length;i++){
   for(let j=i+1;j<evidence.length;j++){
      const a=evidence[i],b=evidence[j];
      if(a.document!==b.document) continue;
      const ap=pass.test(a.description), af=fail.test(a.description);
      const bp=pass.test(b.description), bf=fail.test(b.description);
      if((ap&&bf)||(af&&bp)){
        findings.push({
          type:ComplianceFindingType.CONFLICTING_EVIDENCE,
          left:a.id,right:b.id,confidence:.96
        });
      }
   }
 }
 return findings;
}
export const COMPLIANCE_REASONING_RULE_1=Object.freeze({id:1,note:'Reserved reasoning heuristic 1'});
export const COMPLIANCE_REASONING_RULE_2=Object.freeze({id:2,note:'Reserved reasoning heuristic 2'});
export const COMPLIANCE_REASONING_RULE_3=Object.freeze({id:3,note:'Reserved reasoning heuristic 3'});
export const COMPLIANCE_REASONING_RULE_4=Object.freeze({id:4,note:'Reserved reasoning heuristic 4'});
export const COMPLIANCE_REASONING_RULE_5=Object.freeze({id:5,note:'Reserved reasoning heuristic 5'});
export const COMPLIANCE_REASONING_RULE_6=Object.freeze({id:6,note:'Reserved reasoning heuristic 6'});
export const COMPLIANCE_REASONING_RULE_7=Object.freeze({id:7,note:'Reserved reasoning heuristic 7'});
export const COMPLIANCE_REASONING_RULE_8=Object.freeze({id:8,note:'Reserved reasoning heuristic 8'});
export const COMPLIANCE_REASONING_RULE_9=Object.freeze({id:9,note:'Reserved reasoning heuristic 9'});
export const COMPLIANCE_REASONING_RULE_10=Object.freeze({id:10,note:'Reserved reasoning heuristic 10'});
export const COMPLIANCE_REASONING_RULE_11=Object.freeze({id:11,note:'Reserved reasoning heuristic 11'});
export const COMPLIANCE_REASONING_RULE_12=Object.freeze({id:12,note:'Reserved reasoning heuristic 12'});
export const COMPLIANCE_REASONING_RULE_13=Object.freeze({id:13,note:'Reserved reasoning heuristic 13'});
export const COMPLIANCE_REASONING_RULE_14=Object.freeze({id:14,note:'Reserved reasoning heuristic 14'});
export const COMPLIANCE_REASONING_RULE_15=Object.freeze({id:15,note:'Reserved reasoning heuristic 15'});
export const COMPLIANCE_REASONING_RULE_16=Object.freeze({id:16,note:'Reserved reasoning heuristic 16'});
export const COMPLIANCE_REASONING_RULE_17=Object.freeze({id:17,note:'Reserved reasoning heuristic 17'});
export const COMPLIANCE_REASONING_RULE_18=Object.freeze({id:18,note:'Reserved reasoning heuristic 18'});
export const COMPLIANCE_REASONING_RULE_19=Object.freeze({id:19,note:'Reserved reasoning heuristic 19'});
export const COMPLIANCE_REASONING_RULE_20=Object.freeze({id:20,note:'Reserved reasoning heuristic 20'});
export const COMPLIANCE_REASONING_RULE_21=Object.freeze({id:21,note:'Reserved reasoning heuristic 21'});
export const COMPLIANCE_REASONING_RULE_22=Object.freeze({id:22,note:'Reserved reasoning heuristic 22'});
export const COMPLIANCE_REASONING_RULE_23=Object.freeze({id:23,note:'Reserved reasoning heuristic 23'});
export const COMPLIANCE_REASONING_RULE_24=Object.freeze({id:24,note:'Reserved reasoning heuristic 24'});
export const COMPLIANCE_REASONING_RULE_25=Object.freeze({id:25,note:'Reserved reasoning heuristic 25'});
export const COMPLIANCE_REASONING_RULE_26=Object.freeze({id:26,note:'Reserved reasoning heuristic 26'});
export const COMPLIANCE_REASONING_RULE_27=Object.freeze({id:27,note:'Reserved reasoning heuristic 27'});
export const COMPLIANCE_REASONING_RULE_28=Object.freeze({id:28,note:'Reserved reasoning heuristic 28'});
export const COMPLIANCE_REASONING_RULE_29=Object.freeze({id:29,note:'Reserved reasoning heuristic 29'});
export const COMPLIANCE_REASONING_RULE_30=Object.freeze({id:30,note:'Reserved reasoning heuristic 30'});
export const COMPLIANCE_REASONING_RULE_31=Object.freeze({id:31,note:'Reserved reasoning heuristic 31'});
export const COMPLIANCE_REASONING_RULE_32=Object.freeze({id:32,note:'Reserved reasoning heuristic 32'});
export const COMPLIANCE_REASONING_RULE_33=Object.freeze({id:33,note:'Reserved reasoning heuristic 33'});
export const COMPLIANCE_REASONING_RULE_34=Object.freeze({id:34,note:'Reserved reasoning heuristic 34'});
export const COMPLIANCE_REASONING_RULE_35=Object.freeze({id:35,note:'Reserved reasoning heuristic 35'});
export const COMPLIANCE_REASONING_RULE_36=Object.freeze({id:36,note:'Reserved reasoning heuristic 36'});
export const COMPLIANCE_REASONING_RULE_37=Object.freeze({id:37,note:'Reserved reasoning heuristic 37'});
export const COMPLIANCE_REASONING_RULE_38=Object.freeze({id:38,note:'Reserved reasoning heuristic 38'});
export const COMPLIANCE_REASONING_RULE_39=Object.freeze({id:39,note:'Reserved reasoning heuristic 39'});
export const COMPLIANCE_REASONING_RULE_40=Object.freeze({id:40,note:'Reserved reasoning heuristic 40'});
export const COMPLIANCE_REASONING_RULE_41=Object.freeze({id:41,note:'Reserved reasoning heuristic 41'});
export const COMPLIANCE_REASONING_RULE_42=Object.freeze({id:42,note:'Reserved reasoning heuristic 42'});
export const COMPLIANCE_REASONING_RULE_43=Object.freeze({id:43,note:'Reserved reasoning heuristic 43'});
export const COMPLIANCE_REASONING_RULE_44=Object.freeze({id:44,note:'Reserved reasoning heuristic 44'});
export const COMPLIANCE_REASONING_RULE_45=Object.freeze({id:45,note:'Reserved reasoning heuristic 45'});
export const COMPLIANCE_REASONING_RULE_46=Object.freeze({id:46,note:'Reserved reasoning heuristic 46'});
export const COMPLIANCE_REASONING_RULE_47=Object.freeze({id:47,note:'Reserved reasoning heuristic 47'});
export const COMPLIANCE_REASONING_RULE_48=Object.freeze({id:48,note:'Reserved reasoning heuristic 48'});
export const COMPLIANCE_REASONING_RULE_49=Object.freeze({id:49,note:'Reserved reasoning heuristic 49'});
export const COMPLIANCE_REASONING_RULE_50=Object.freeze({id:50,note:'Reserved reasoning heuristic 50'});
export const COMPLIANCE_REASONING_RULE_51=Object.freeze({id:51,note:'Reserved reasoning heuristic 51'});
export const COMPLIANCE_REASONING_RULE_52=Object.freeze({id:52,note:'Reserved reasoning heuristic 52'});
export const COMPLIANCE_REASONING_RULE_53=Object.freeze({id:53,note:'Reserved reasoning heuristic 53'});
export const COMPLIANCE_REASONING_RULE_54=Object.freeze({id:54,note:'Reserved reasoning heuristic 54'});
export const COMPLIANCE_REASONING_RULE_55=Object.freeze({id:55,note:'Reserved reasoning heuristic 55'});
export const COMPLIANCE_REASONING_RULE_56=Object.freeze({id:56,note:'Reserved reasoning heuristic 56'});
export const COMPLIANCE_REASONING_RULE_57=Object.freeze({id:57,note:'Reserved reasoning heuristic 57'});
export const COMPLIANCE_REASONING_RULE_58=Object.freeze({id:58,note:'Reserved reasoning heuristic 58'});
export const COMPLIANCE_REASONING_RULE_59=Object.freeze({id:59,note:'Reserved reasoning heuristic 59'});
export const COMPLIANCE_REASONING_RULE_60=Object.freeze({id:60,note:'Reserved reasoning heuristic 60'});
export const COMPLIANCE_REASONING_RULE_61=Object.freeze({id:61,note:'Reserved reasoning heuristic 61'});
export const COMPLIANCE_REASONING_RULE_62=Object.freeze({id:62,note:'Reserved reasoning heuristic 62'});
export const COMPLIANCE_REASONING_RULE_63=Object.freeze({id:63,note:'Reserved reasoning heuristic 63'});
export const COMPLIANCE_REASONING_RULE_64=Object.freeze({id:64,note:'Reserved reasoning heuristic 64'});
export const COMPLIANCE_REASONING_RULE_65=Object.freeze({id:65,note:'Reserved reasoning heuristic 65'});
export const COMPLIANCE_REASONING_RULE_66=Object.freeze({id:66,note:'Reserved reasoning heuristic 66'});
export const COMPLIANCE_REASONING_RULE_67=Object.freeze({id:67,note:'Reserved reasoning heuristic 67'});
export const COMPLIANCE_REASONING_RULE_68=Object.freeze({id:68,note:'Reserved reasoning heuristic 68'});
export const COMPLIANCE_REASONING_RULE_69=Object.freeze({id:69,note:'Reserved reasoning heuristic 69'});
export const COMPLIANCE_REASONING_RULE_70=Object.freeze({id:70,note:'Reserved reasoning heuristic 70'});
export const COMPLIANCE_REASONING_RULE_71=Object.freeze({id:71,note:'Reserved reasoning heuristic 71'});
export const COMPLIANCE_REASONING_RULE_72=Object.freeze({id:72,note:'Reserved reasoning heuristic 72'});
export const COMPLIANCE_REASONING_RULE_73=Object.freeze({id:73,note:'Reserved reasoning heuristic 73'});
export const COMPLIANCE_REASONING_RULE_74=Object.freeze({id:74,note:'Reserved reasoning heuristic 74'});
export const COMPLIANCE_REASONING_RULE_75=Object.freeze({id:75,note:'Reserved reasoning heuristic 75'});
export const COMPLIANCE_REASONING_RULE_76=Object.freeze({id:76,note:'Reserved reasoning heuristic 76'});
export const COMPLIANCE_REASONING_RULE_77=Object.freeze({id:77,note:'Reserved reasoning heuristic 77'});
export const COMPLIANCE_REASONING_RULE_78=Object.freeze({id:78,note:'Reserved reasoning heuristic 78'});
export const COMPLIANCE_REASONING_RULE_79=Object.freeze({id:79,note:'Reserved reasoning heuristic 79'});
export const COMPLIANCE_REASONING_RULE_80=Object.freeze({id:80,note:'Reserved reasoning heuristic 80'});
export const COMPLIANCE_REASONING_RULE_81=Object.freeze({id:81,note:'Reserved reasoning heuristic 81'});
export const COMPLIANCE_REASONING_RULE_82=Object.freeze({id:82,note:'Reserved reasoning heuristic 82'});
export const COMPLIANCE_REASONING_RULE_83=Object.freeze({id:83,note:'Reserved reasoning heuristic 83'});
export const COMPLIANCE_REASONING_RULE_84=Object.freeze({id:84,note:'Reserved reasoning heuristic 84'});
export const COMPLIANCE_REASONING_RULE_85=Object.freeze({id:85,note:'Reserved reasoning heuristic 85'});
export const COMPLIANCE_REASONING_RULE_86=Object.freeze({id:86,note:'Reserved reasoning heuristic 86'});
export const COMPLIANCE_REASONING_RULE_87=Object.freeze({id:87,note:'Reserved reasoning heuristic 87'});
export const COMPLIANCE_REASONING_RULE_88=Object.freeze({id:88,note:'Reserved reasoning heuristic 88'});
export const COMPLIANCE_REASONING_RULE_89=Object.freeze({id:89,note:'Reserved reasoning heuristic 89'});
export const COMPLIANCE_REASONING_RULE_90=Object.freeze({id:90,note:'Reserved reasoning heuristic 90'});
export const COMPLIANCE_REASONING_RULE_91=Object.freeze({id:91,note:'Reserved reasoning heuristic 91'});
export const COMPLIANCE_REASONING_RULE_92=Object.freeze({id:92,note:'Reserved reasoning heuristic 92'});
export const COMPLIANCE_REASONING_RULE_93=Object.freeze({id:93,note:'Reserved reasoning heuristic 93'});
export const COMPLIANCE_REASONING_RULE_94=Object.freeze({id:94,note:'Reserved reasoning heuristic 94'});
export const COMPLIANCE_REASONING_RULE_95=Object.freeze({id:95,note:'Reserved reasoning heuristic 95'});
export const COMPLIANCE_REASONING_RULE_96=Object.freeze({id:96,note:'Reserved reasoning heuristic 96'});
export const COMPLIANCE_REASONING_RULE_97=Object.freeze({id:97,note:'Reserved reasoning heuristic 97'});
export const COMPLIANCE_REASONING_RULE_98=Object.freeze({id:98,note:'Reserved reasoning heuristic 98'});
export const COMPLIANCE_REASONING_RULE_99=Object.freeze({id:99,note:'Reserved reasoning heuristic 99'});
export const COMPLIANCE_REASONING_RULE_100=Object.freeze({id:100,note:'Reserved reasoning heuristic 100'});
export const COMPLIANCE_REASONING_RULE_101=Object.freeze({id:101,note:'Reserved reasoning heuristic 101'});
export const COMPLIANCE_REASONING_RULE_102=Object.freeze({id:102,note:'Reserved reasoning heuristic 102'});
export const COMPLIANCE_REASONING_RULE_103=Object.freeze({id:103,note:'Reserved reasoning heuristic 103'});
export const COMPLIANCE_REASONING_RULE_104=Object.freeze({id:104,note:'Reserved reasoning heuristic 104'});
export const COMPLIANCE_REASONING_RULE_105=Object.freeze({id:105,note:'Reserved reasoning heuristic 105'});
export const COMPLIANCE_REASONING_RULE_106=Object.freeze({id:106,note:'Reserved reasoning heuristic 106'});
export const COMPLIANCE_REASONING_RULE_107=Object.freeze({id:107,note:'Reserved reasoning heuristic 107'});
export const COMPLIANCE_REASONING_RULE_108=Object.freeze({id:108,note:'Reserved reasoning heuristic 108'});
export const COMPLIANCE_REASONING_RULE_109=Object.freeze({id:109,note:'Reserved reasoning heuristic 109'});
export const COMPLIANCE_REASONING_RULE_110=Object.freeze({id:110,note:'Reserved reasoning heuristic 110'});
export const COMPLIANCE_REASONING_RULE_111=Object.freeze({id:111,note:'Reserved reasoning heuristic 111'});
export const COMPLIANCE_REASONING_RULE_112=Object.freeze({id:112,note:'Reserved reasoning heuristic 112'});
export const COMPLIANCE_REASONING_RULE_113=Object.freeze({id:113,note:'Reserved reasoning heuristic 113'});
export const COMPLIANCE_REASONING_RULE_114=Object.freeze({id:114,note:'Reserved reasoning heuristic 114'});
export const COMPLIANCE_REASONING_RULE_115=Object.freeze({id:115,note:'Reserved reasoning heuristic 115'});
export const COMPLIANCE_REASONING_RULE_116=Object.freeze({id:116,note:'Reserved reasoning heuristic 116'});
export const COMPLIANCE_REASONING_RULE_117=Object.freeze({id:117,note:'Reserved reasoning heuristic 117'});
export const COMPLIANCE_REASONING_RULE_118=Object.freeze({id:118,note:'Reserved reasoning heuristic 118'});
export const COMPLIANCE_REASONING_RULE_119=Object.freeze({id:119,note:'Reserved reasoning heuristic 119'});
export const COMPLIANCE_REASONING_RULE_120=Object.freeze({id:120,note:'Reserved reasoning heuristic 120'});
export const COMPLIANCE_REASONING_RULE_121=Object.freeze({id:121,note:'Reserved reasoning heuristic 121'});
export const COMPLIANCE_REASONING_RULE_122=Object.freeze({id:122,note:'Reserved reasoning heuristic 122'});
export const COMPLIANCE_REASONING_RULE_123=Object.freeze({id:123,note:'Reserved reasoning heuristic 123'});
export const COMPLIANCE_REASONING_RULE_124=Object.freeze({id:124,note:'Reserved reasoning heuristic 124'});
export const COMPLIANCE_REASONING_RULE_125=Object.freeze({id:125,note:'Reserved reasoning heuristic 125'});
export const COMPLIANCE_REASONING_RULE_126=Object.freeze({id:126,note:'Reserved reasoning heuristic 126'});
export const COMPLIANCE_REASONING_RULE_127=Object.freeze({id:127,note:'Reserved reasoning heuristic 127'});
export const COMPLIANCE_REASONING_RULE_128=Object.freeze({id:128,note:'Reserved reasoning heuristic 128'});
export const COMPLIANCE_REASONING_RULE_129=Object.freeze({id:129,note:'Reserved reasoning heuristic 129'});
export const COMPLIANCE_REASONING_RULE_130=Object.freeze({id:130,note:'Reserved reasoning heuristic 130'});
export const COMPLIANCE_REASONING_RULE_131=Object.freeze({id:131,note:'Reserved reasoning heuristic 131'});
export const COMPLIANCE_REASONING_RULE_132=Object.freeze({id:132,note:'Reserved reasoning heuristic 132'});
export const COMPLIANCE_REASONING_RULE_133=Object.freeze({id:133,note:'Reserved reasoning heuristic 133'});
export const COMPLIANCE_REASONING_RULE_134=Object.freeze({id:134,note:'Reserved reasoning heuristic 134'});
export const COMPLIANCE_REASONING_RULE_135=Object.freeze({id:135,note:'Reserved reasoning heuristic 135'});
export const COMPLIANCE_REASONING_RULE_136=Object.freeze({id:136,note:'Reserved reasoning heuristic 136'});
export const COMPLIANCE_REASONING_RULE_137=Object.freeze({id:137,note:'Reserved reasoning heuristic 137'});
export const COMPLIANCE_REASONING_RULE_138=Object.freeze({id:138,note:'Reserved reasoning heuristic 138'});
export const COMPLIANCE_REASONING_RULE_139=Object.freeze({id:139,note:'Reserved reasoning heuristic 139'});
export const COMPLIANCE_REASONING_RULE_140=Object.freeze({id:140,note:'Reserved reasoning heuristic 140'});
export const COMPLIANCE_REASONING_RULE_141=Object.freeze({id:141,note:'Reserved reasoning heuristic 141'});
export const COMPLIANCE_REASONING_RULE_142=Object.freeze({id:142,note:'Reserved reasoning heuristic 142'});
export const COMPLIANCE_REASONING_RULE_143=Object.freeze({id:143,note:'Reserved reasoning heuristic 143'});
export const COMPLIANCE_REASONING_RULE_144=Object.freeze({id:144,note:'Reserved reasoning heuristic 144'});
export const COMPLIANCE_REASONING_RULE_145=Object.freeze({id:145,note:'Reserved reasoning heuristic 145'});
export const COMPLIANCE_REASONING_RULE_146=Object.freeze({id:146,note:'Reserved reasoning heuristic 146'});
export const COMPLIANCE_REASONING_RULE_147=Object.freeze({id:147,note:'Reserved reasoning heuristic 147'});
export const COMPLIANCE_REASONING_RULE_148=Object.freeze({id:148,note:'Reserved reasoning heuristic 148'});
export const COMPLIANCE_REASONING_RULE_149=Object.freeze({id:149,note:'Reserved reasoning heuristic 149'});
export const COMPLIANCE_REASONING_RULE_150=Object.freeze({id:150,note:'Reserved reasoning heuristic 150'});
export const COMPLIANCE_REASONING_RULE_151=Object.freeze({id:151,note:'Reserved reasoning heuristic 151'});
export const COMPLIANCE_REASONING_RULE_152=Object.freeze({id:152,note:'Reserved reasoning heuristic 152'});
export const COMPLIANCE_REASONING_RULE_153=Object.freeze({id:153,note:'Reserved reasoning heuristic 153'});
export const COMPLIANCE_REASONING_RULE_154=Object.freeze({id:154,note:'Reserved reasoning heuristic 154'});
export const COMPLIANCE_REASONING_RULE_155=Object.freeze({id:155,note:'Reserved reasoning heuristic 155'});
export const COMPLIANCE_REASONING_RULE_156=Object.freeze({id:156,note:'Reserved reasoning heuristic 156'});
export const COMPLIANCE_REASONING_RULE_157=Object.freeze({id:157,note:'Reserved reasoning heuristic 157'});
export const COMPLIANCE_REASONING_RULE_158=Object.freeze({id:158,note:'Reserved reasoning heuristic 158'});
export const COMPLIANCE_REASONING_RULE_159=Object.freeze({id:159,note:'Reserved reasoning heuristic 159'});
export const COMPLIANCE_REASONING_RULE_160=Object.freeze({id:160,note:'Reserved reasoning heuristic 160'});
export const COMPLIANCE_REASONING_RULE_161=Object.freeze({id:161,note:'Reserved reasoning heuristic 161'});
export const COMPLIANCE_REASONING_RULE_162=Object.freeze({id:162,note:'Reserved reasoning heuristic 162'});
export const COMPLIANCE_REASONING_RULE_163=Object.freeze({id:163,note:'Reserved reasoning heuristic 163'});
export const COMPLIANCE_REASONING_RULE_164=Object.freeze({id:164,note:'Reserved reasoning heuristic 164'});
export const COMPLIANCE_REASONING_RULE_165=Object.freeze({id:165,note:'Reserved reasoning heuristic 165'});
export const COMPLIANCE_REASONING_RULE_166=Object.freeze({id:166,note:'Reserved reasoning heuristic 166'});
export const COMPLIANCE_REASONING_RULE_167=Object.freeze({id:167,note:'Reserved reasoning heuristic 167'});
export const COMPLIANCE_REASONING_RULE_168=Object.freeze({id:168,note:'Reserved reasoning heuristic 168'});
export const COMPLIANCE_REASONING_RULE_169=Object.freeze({id:169,note:'Reserved reasoning heuristic 169'});
export const COMPLIANCE_REASONING_RULE_170=Object.freeze({id:170,note:'Reserved reasoning heuristic 170'});
export const COMPLIANCE_REASONING_RULE_171=Object.freeze({id:171,note:'Reserved reasoning heuristic 171'});
export const COMPLIANCE_REASONING_RULE_172=Object.freeze({id:172,note:'Reserved reasoning heuristic 172'});
export const COMPLIANCE_REASONING_RULE_173=Object.freeze({id:173,note:'Reserved reasoning heuristic 173'});
export const COMPLIANCE_REASONING_RULE_174=Object.freeze({id:174,note:'Reserved reasoning heuristic 174'});
export const COMPLIANCE_REASONING_RULE_175=Object.freeze({id:175,note:'Reserved reasoning heuristic 175'});
export const COMPLIANCE_REASONING_RULE_176=Object.freeze({id:176,note:'Reserved reasoning heuristic 176'});
export const COMPLIANCE_REASONING_RULE_177=Object.freeze({id:177,note:'Reserved reasoning heuristic 177'});
export const COMPLIANCE_REASONING_RULE_178=Object.freeze({id:178,note:'Reserved reasoning heuristic 178'});
export const COMPLIANCE_REASONING_RULE_179=Object.freeze({id:179,note:'Reserved reasoning heuristic 179'});
export const COMPLIANCE_REASONING_RULE_180=Object.freeze({id:180,note:'Reserved reasoning heuristic 180'});
export const COMPLIANCE_REASONING_RULE_181=Object.freeze({id:181,note:'Reserved reasoning heuristic 181'});
export const COMPLIANCE_REASONING_RULE_182=Object.freeze({id:182,note:'Reserved reasoning heuristic 182'});
export const COMPLIANCE_REASONING_RULE_183=Object.freeze({id:183,note:'Reserved reasoning heuristic 183'});
export const COMPLIANCE_REASONING_RULE_184=Object.freeze({id:184,note:'Reserved reasoning heuristic 184'});
export const COMPLIANCE_REASONING_RULE_185=Object.freeze({id:185,note:'Reserved reasoning heuristic 185'});
export const COMPLIANCE_REASONING_RULE_186=Object.freeze({id:186,note:'Reserved reasoning heuristic 186'});
export const COMPLIANCE_REASONING_RULE_187=Object.freeze({id:187,note:'Reserved reasoning heuristic 187'});
export const COMPLIANCE_REASONING_RULE_188=Object.freeze({id:188,note:'Reserved reasoning heuristic 188'});
export const COMPLIANCE_REASONING_RULE_189=Object.freeze({id:189,note:'Reserved reasoning heuristic 189'});
export const COMPLIANCE_REASONING_RULE_190=Object.freeze({id:190,note:'Reserved reasoning heuristic 190'});
export const COMPLIANCE_REASONING_RULE_191=Object.freeze({id:191,note:'Reserved reasoning heuristic 191'});
export const COMPLIANCE_REASONING_RULE_192=Object.freeze({id:192,note:'Reserved reasoning heuristic 192'});
export const COMPLIANCE_REASONING_RULE_193=Object.freeze({id:193,note:'Reserved reasoning heuristic 193'});
export const COMPLIANCE_REASONING_RULE_194=Object.freeze({id:194,note:'Reserved reasoning heuristic 194'});
export const COMPLIANCE_REASONING_RULE_195=Object.freeze({id:195,note:'Reserved reasoning heuristic 195'});
export const COMPLIANCE_REASONING_RULE_196=Object.freeze({id:196,note:'Reserved reasoning heuristic 196'});
export const COMPLIANCE_REASONING_RULE_197=Object.freeze({id:197,note:'Reserved reasoning heuristic 197'});
export const COMPLIANCE_REASONING_RULE_198=Object.freeze({id:198,note:'Reserved reasoning heuristic 198'});
export const COMPLIANCE_REASONING_RULE_199=Object.freeze({id:199,note:'Reserved reasoning heuristic 199'});
export const COMPLIANCE_REASONING_RULE_200=Object.freeze({id:200,note:'Reserved reasoning heuristic 200'});
export const COMPLIANCE_REASONING_RULE_201=Object.freeze({id:201,note:'Reserved reasoning heuristic 201'});
export const COMPLIANCE_REASONING_RULE_202=Object.freeze({id:202,note:'Reserved reasoning heuristic 202'});
export const COMPLIANCE_REASONING_RULE_203=Object.freeze({id:203,note:'Reserved reasoning heuristic 203'});
export const COMPLIANCE_REASONING_RULE_204=Object.freeze({id:204,note:'Reserved reasoning heuristic 204'});
export const COMPLIANCE_REASONING_RULE_205=Object.freeze({id:205,note:'Reserved reasoning heuristic 205'});
export const COMPLIANCE_REASONING_RULE_206=Object.freeze({id:206,note:'Reserved reasoning heuristic 206'});
export const COMPLIANCE_REASONING_RULE_207=Object.freeze({id:207,note:'Reserved reasoning heuristic 207'});
export const COMPLIANCE_REASONING_RULE_208=Object.freeze({id:208,note:'Reserved reasoning heuristic 208'});
export const COMPLIANCE_REASONING_RULE_209=Object.freeze({id:209,note:'Reserved reasoning heuristic 209'});
export const COMPLIANCE_REASONING_RULE_210=Object.freeze({id:210,note:'Reserved reasoning heuristic 210'});
export const COMPLIANCE_REASONING_RULE_211=Object.freeze({id:211,note:'Reserved reasoning heuristic 211'});
export const COMPLIANCE_REASONING_RULE_212=Object.freeze({id:212,note:'Reserved reasoning heuristic 212'});
export const COMPLIANCE_REASONING_RULE_213=Object.freeze({id:213,note:'Reserved reasoning heuristic 213'});
export const COMPLIANCE_REASONING_RULE_214=Object.freeze({id:214,note:'Reserved reasoning heuristic 214'});
export const COMPLIANCE_REASONING_RULE_215=Object.freeze({id:215,note:'Reserved reasoning heuristic 215'});
export const COMPLIANCE_REASONING_RULE_216=Object.freeze({id:216,note:'Reserved reasoning heuristic 216'});
export const COMPLIANCE_REASONING_RULE_217=Object.freeze({id:217,note:'Reserved reasoning heuristic 217'});
export const COMPLIANCE_REASONING_RULE_218=Object.freeze({id:218,note:'Reserved reasoning heuristic 218'});
export const COMPLIANCE_REASONING_RULE_219=Object.freeze({id:219,note:'Reserved reasoning heuristic 219'});
export const COMPLIANCE_REASONING_RULE_220=Object.freeze({id:220,note:'Reserved reasoning heuristic 220'});
export const COMPLIANCE_REASONING_RULE_221=Object.freeze({id:221,note:'Reserved reasoning heuristic 221'});
export const COMPLIANCE_REASONING_RULE_222=Object.freeze({id:222,note:'Reserved reasoning heuristic 222'});
export const COMPLIANCE_REASONING_RULE_223=Object.freeze({id:223,note:'Reserved reasoning heuristic 223'});
export const COMPLIANCE_REASONING_RULE_224=Object.freeze({id:224,note:'Reserved reasoning heuristic 224'});
export const COMPLIANCE_REASONING_RULE_225=Object.freeze({id:225,note:'Reserved reasoning heuristic 225'});
export const COMPLIANCE_REASONING_RULE_226=Object.freeze({id:226,note:'Reserved reasoning heuristic 226'});
export const COMPLIANCE_REASONING_RULE_227=Object.freeze({id:227,note:'Reserved reasoning heuristic 227'});
export const COMPLIANCE_REASONING_RULE_228=Object.freeze({id:228,note:'Reserved reasoning heuristic 228'});
export const COMPLIANCE_REASONING_RULE_229=Object.freeze({id:229,note:'Reserved reasoning heuristic 229'});
export const COMPLIANCE_REASONING_RULE_230=Object.freeze({id:230,note:'Reserved reasoning heuristic 230'});
export const COMPLIANCE_REASONING_RULE_231=Object.freeze({id:231,note:'Reserved reasoning heuristic 231'});
export const COMPLIANCE_REASONING_RULE_232=Object.freeze({id:232,note:'Reserved reasoning heuristic 232'});
export const COMPLIANCE_REASONING_RULE_233=Object.freeze({id:233,note:'Reserved reasoning heuristic 233'});
export const COMPLIANCE_REASONING_RULE_234=Object.freeze({id:234,note:'Reserved reasoning heuristic 234'});
export const COMPLIANCE_REASONING_RULE_235=Object.freeze({id:235,note:'Reserved reasoning heuristic 235'});
export const COMPLIANCE_REASONING_RULE_236=Object.freeze({id:236,note:'Reserved reasoning heuristic 236'});
export const COMPLIANCE_REASONING_RULE_237=Object.freeze({id:237,note:'Reserved reasoning heuristic 237'});
export const COMPLIANCE_REASONING_RULE_238=Object.freeze({id:238,note:'Reserved reasoning heuristic 238'});
export const COMPLIANCE_REASONING_RULE_239=Object.freeze({id:239,note:'Reserved reasoning heuristic 239'});
export const COMPLIANCE_REASONING_RULE_240=Object.freeze({id:240,note:'Reserved reasoning heuristic 240'});
export const COMPLIANCE_REASONING_RULE_241=Object.freeze({id:241,note:'Reserved reasoning heuristic 241'});
export const COMPLIANCE_REASONING_RULE_242=Object.freeze({id:242,note:'Reserved reasoning heuristic 242'});
export const COMPLIANCE_REASONING_RULE_243=Object.freeze({id:243,note:'Reserved reasoning heuristic 243'});
export const COMPLIANCE_REASONING_RULE_244=Object.freeze({id:244,note:'Reserved reasoning heuristic 244'});
export const COMPLIANCE_REASONING_RULE_245=Object.freeze({id:245,note:'Reserved reasoning heuristic 245'});
export const COMPLIANCE_REASONING_RULE_246=Object.freeze({id:246,note:'Reserved reasoning heuristic 246'});
export const COMPLIANCE_REASONING_RULE_247=Object.freeze({id:247,note:'Reserved reasoning heuristic 247'});
export const COMPLIANCE_REASONING_RULE_248=Object.freeze({id:248,note:'Reserved reasoning heuristic 248'});
export const COMPLIANCE_REASONING_RULE_249=Object.freeze({id:249,note:'Reserved reasoning heuristic 249'});
export const COMPLIANCE_REASONING_RULE_250=Object.freeze({id:250,note:'Reserved reasoning heuristic 250'});
export const COMPLIANCE_REASONING_RULE_251=Object.freeze({id:251,note:'Reserved reasoning heuristic 251'});
export const COMPLIANCE_REASONING_RULE_252=Object.freeze({id:252,note:'Reserved reasoning heuristic 252'});
export const COMPLIANCE_REASONING_RULE_253=Object.freeze({id:253,note:'Reserved reasoning heuristic 253'});
export const COMPLIANCE_REASONING_RULE_254=Object.freeze({id:254,note:'Reserved reasoning heuristic 254'});
export const COMPLIANCE_REASONING_RULE_255=Object.freeze({id:255,note:'Reserved reasoning heuristic 255'});
export const COMPLIANCE_REASONING_RULE_256=Object.freeze({id:256,note:'Reserved reasoning heuristic 256'});
export const COMPLIANCE_REASONING_RULE_257=Object.freeze({id:257,note:'Reserved reasoning heuristic 257'});
export const COMPLIANCE_REASONING_RULE_258=Object.freeze({id:258,note:'Reserved reasoning heuristic 258'});
export const COMPLIANCE_REASONING_RULE_259=Object.freeze({id:259,note:'Reserved reasoning heuristic 259'});
export const COMPLIANCE_REASONING_RULE_260=Object.freeze({id:260,note:'Reserved reasoning heuristic 260'});
export const COMPLIANCE_REASONING_RULE_261=Object.freeze({id:261,note:'Reserved reasoning heuristic 261'});
export const COMPLIANCE_REASONING_RULE_262=Object.freeze({id:262,note:'Reserved reasoning heuristic 262'});
export const COMPLIANCE_REASONING_RULE_263=Object.freeze({id:263,note:'Reserved reasoning heuristic 263'});
export const COMPLIANCE_REASONING_RULE_264=Object.freeze({id:264,note:'Reserved reasoning heuristic 264'});
export const COMPLIANCE_REASONING_RULE_265=Object.freeze({id:265,note:'Reserved reasoning heuristic 265'});
export const COMPLIANCE_REASONING_RULE_266=Object.freeze({id:266,note:'Reserved reasoning heuristic 266'});
export const COMPLIANCE_REASONING_RULE_267=Object.freeze({id:267,note:'Reserved reasoning heuristic 267'});
export const COMPLIANCE_REASONING_RULE_268=Object.freeze({id:268,note:'Reserved reasoning heuristic 268'});
export const COMPLIANCE_REASONING_RULE_269=Object.freeze({id:269,note:'Reserved reasoning heuristic 269'});
export const COMPLIANCE_REASONING_RULE_270=Object.freeze({id:270,note:'Reserved reasoning heuristic 270'});
export const COMPLIANCE_REASONING_RULE_271=Object.freeze({id:271,note:'Reserved reasoning heuristic 271'});
export const COMPLIANCE_REASONING_RULE_272=Object.freeze({id:272,note:'Reserved reasoning heuristic 272'});
export const COMPLIANCE_REASONING_RULE_273=Object.freeze({id:273,note:'Reserved reasoning heuristic 273'});
export const COMPLIANCE_REASONING_RULE_274=Object.freeze({id:274,note:'Reserved reasoning heuristic 274'});
export const COMPLIANCE_REASONING_RULE_275=Object.freeze({id:275,note:'Reserved reasoning heuristic 275'});
export const COMPLIANCE_REASONING_RULE_276=Object.freeze({id:276,note:'Reserved reasoning heuristic 276'});
export const COMPLIANCE_REASONING_RULE_277=Object.freeze({id:277,note:'Reserved reasoning heuristic 277'});
export const COMPLIANCE_REASONING_RULE_278=Object.freeze({id:278,note:'Reserved reasoning heuristic 278'});
export const COMPLIANCE_REASONING_RULE_279=Object.freeze({id:279,note:'Reserved reasoning heuristic 279'});
export const COMPLIANCE_REASONING_RULE_280=Object.freeze({id:280,note:'Reserved reasoning heuristic 280'});
export const COMPLIANCE_REASONING_RULE_281=Object.freeze({id:281,note:'Reserved reasoning heuristic 281'});
export const COMPLIANCE_REASONING_RULE_282=Object.freeze({id:282,note:'Reserved reasoning heuristic 282'});
export const COMPLIANCE_REASONING_RULE_283=Object.freeze({id:283,note:'Reserved reasoning heuristic 283'});
export const COMPLIANCE_REASONING_RULE_284=Object.freeze({id:284,note:'Reserved reasoning heuristic 284'});
export const COMPLIANCE_REASONING_RULE_285=Object.freeze({id:285,note:'Reserved reasoning heuristic 285'});
export const COMPLIANCE_REASONING_RULE_286=Object.freeze({id:286,note:'Reserved reasoning heuristic 286'});
export const COMPLIANCE_REASONING_RULE_287=Object.freeze({id:287,note:'Reserved reasoning heuristic 287'});
export const COMPLIANCE_REASONING_RULE_288=Object.freeze({id:288,note:'Reserved reasoning heuristic 288'});
export const COMPLIANCE_REASONING_RULE_289=Object.freeze({id:289,note:'Reserved reasoning heuristic 289'});
export const COMPLIANCE_REASONING_RULE_290=Object.freeze({id:290,note:'Reserved reasoning heuristic 290'});
export const COMPLIANCE_REASONING_RULE_291=Object.freeze({id:291,note:'Reserved reasoning heuristic 291'});
export const COMPLIANCE_REASONING_RULE_292=Object.freeze({id:292,note:'Reserved reasoning heuristic 292'});
export const COMPLIANCE_REASONING_RULE_293=Object.freeze({id:293,note:'Reserved reasoning heuristic 293'});
export const COMPLIANCE_REASONING_RULE_294=Object.freeze({id:294,note:'Reserved reasoning heuristic 294'});
export const COMPLIANCE_REASONING_RULE_295=Object.freeze({id:295,note:'Reserved reasoning heuristic 295'});
export const COMPLIANCE_REASONING_RULE_296=Object.freeze({id:296,note:'Reserved reasoning heuristic 296'});
export const COMPLIANCE_REASONING_RULE_297=Object.freeze({id:297,note:'Reserved reasoning heuristic 297'});
export const COMPLIANCE_REASONING_RULE_298=Object.freeze({id:298,note:'Reserved reasoning heuristic 298'});
export const COMPLIANCE_REASONING_RULE_299=Object.freeze({id:299,note:'Reserved reasoning heuristic 299'});
export const COMPLIANCE_REASONING_RULE_300=Object.freeze({id:300,note:'Reserved reasoning heuristic 300'});
export const COMPLIANCE_REASONING_RULE_301=Object.freeze({id:301,note:'Reserved reasoning heuristic 301'});
export const COMPLIANCE_REASONING_RULE_302=Object.freeze({id:302,note:'Reserved reasoning heuristic 302'});
export const COMPLIANCE_REASONING_RULE_303=Object.freeze({id:303,note:'Reserved reasoning heuristic 303'});
export const COMPLIANCE_REASONING_RULE_304=Object.freeze({id:304,note:'Reserved reasoning heuristic 304'});
export const COMPLIANCE_REASONING_RULE_305=Object.freeze({id:305,note:'Reserved reasoning heuristic 305'});
export const COMPLIANCE_REASONING_RULE_306=Object.freeze({id:306,note:'Reserved reasoning heuristic 306'});
export const COMPLIANCE_REASONING_RULE_307=Object.freeze({id:307,note:'Reserved reasoning heuristic 307'});
export const COMPLIANCE_REASONING_RULE_308=Object.freeze({id:308,note:'Reserved reasoning heuristic 308'});
export const COMPLIANCE_REASONING_RULE_309=Object.freeze({id:309,note:'Reserved reasoning heuristic 309'});
export const COMPLIANCE_REASONING_RULE_310=Object.freeze({id:310,note:'Reserved reasoning heuristic 310'});
export const COMPLIANCE_REASONING_RULE_311=Object.freeze({id:311,note:'Reserved reasoning heuristic 311'});
export const COMPLIANCE_REASONING_RULE_312=Object.freeze({id:312,note:'Reserved reasoning heuristic 312'});
export const COMPLIANCE_REASONING_RULE_313=Object.freeze({id:313,note:'Reserved reasoning heuristic 313'});
export const COMPLIANCE_REASONING_RULE_314=Object.freeze({id:314,note:'Reserved reasoning heuristic 314'});
export const COMPLIANCE_REASONING_RULE_315=Object.freeze({id:315,note:'Reserved reasoning heuristic 315'});
export const COMPLIANCE_REASONING_RULE_316=Object.freeze({id:316,note:'Reserved reasoning heuristic 316'});
export const COMPLIANCE_REASONING_RULE_317=Object.freeze({id:317,note:'Reserved reasoning heuristic 317'});
export const COMPLIANCE_REASONING_RULE_318=Object.freeze({id:318,note:'Reserved reasoning heuristic 318'});
export const COMPLIANCE_REASONING_RULE_319=Object.freeze({id:319,note:'Reserved reasoning heuristic 319'});
export const COMPLIANCE_REASONING_RULE_320=Object.freeze({id:320,note:'Reserved reasoning heuristic 320'});
export const COMPLIANCE_REASONING_RULE_321=Object.freeze({id:321,note:'Reserved reasoning heuristic 321'});
export const COMPLIANCE_REASONING_RULE_322=Object.freeze({id:322,note:'Reserved reasoning heuristic 322'});
export const COMPLIANCE_REASONING_RULE_323=Object.freeze({id:323,note:'Reserved reasoning heuristic 323'});
export const COMPLIANCE_REASONING_RULE_324=Object.freeze({id:324,note:'Reserved reasoning heuristic 324'});
export const COMPLIANCE_REASONING_RULE_325=Object.freeze({id:325,note:'Reserved reasoning heuristic 325'});
export const COMPLIANCE_REASONING_RULE_326=Object.freeze({id:326,note:'Reserved reasoning heuristic 326'});
export const COMPLIANCE_REASONING_RULE_327=Object.freeze({id:327,note:'Reserved reasoning heuristic 327'});
export const COMPLIANCE_REASONING_RULE_328=Object.freeze({id:328,note:'Reserved reasoning heuristic 328'});
export const COMPLIANCE_REASONING_RULE_329=Object.freeze({id:329,note:'Reserved reasoning heuristic 329'});
export const COMPLIANCE_REASONING_RULE_330=Object.freeze({id:330,note:'Reserved reasoning heuristic 330'});
export const COMPLIANCE_REASONING_RULE_331=Object.freeze({id:331,note:'Reserved reasoning heuristic 331'});
export const COMPLIANCE_REASONING_RULE_332=Object.freeze({id:332,note:'Reserved reasoning heuristic 332'});
export const COMPLIANCE_REASONING_RULE_333=Object.freeze({id:333,note:'Reserved reasoning heuristic 333'});
export const COMPLIANCE_REASONING_RULE_334=Object.freeze({id:334,note:'Reserved reasoning heuristic 334'});
export const COMPLIANCE_REASONING_RULE_335=Object.freeze({id:335,note:'Reserved reasoning heuristic 335'});
export const COMPLIANCE_REASONING_RULE_336=Object.freeze({id:336,note:'Reserved reasoning heuristic 336'});
export const COMPLIANCE_REASONING_RULE_337=Object.freeze({id:337,note:'Reserved reasoning heuristic 337'});
export const COMPLIANCE_REASONING_RULE_338=Object.freeze({id:338,note:'Reserved reasoning heuristic 338'});
export const COMPLIANCE_REASONING_RULE_339=Object.freeze({id:339,note:'Reserved reasoning heuristic 339'});
export const COMPLIANCE_REASONING_RULE_340=Object.freeze({id:340,note:'Reserved reasoning heuristic 340'});
export const COMPLIANCE_REASONING_RULE_341=Object.freeze({id:341,note:'Reserved reasoning heuristic 341'});
export const COMPLIANCE_REASONING_RULE_342=Object.freeze({id:342,note:'Reserved reasoning heuristic 342'});
export const COMPLIANCE_REASONING_RULE_343=Object.freeze({id:343,note:'Reserved reasoning heuristic 343'});
export const COMPLIANCE_REASONING_RULE_344=Object.freeze({id:344,note:'Reserved reasoning heuristic 344'});
export const COMPLIANCE_REASONING_RULE_345=Object.freeze({id:345,note:'Reserved reasoning heuristic 345'});
export const COMPLIANCE_REASONING_RULE_346=Object.freeze({id:346,note:'Reserved reasoning heuristic 346'});
export const COMPLIANCE_REASONING_RULE_347=Object.freeze({id:347,note:'Reserved reasoning heuristic 347'});
export const COMPLIANCE_REASONING_RULE_348=Object.freeze({id:348,note:'Reserved reasoning heuristic 348'});
export const COMPLIANCE_REASONING_RULE_349=Object.freeze({id:349,note:'Reserved reasoning heuristic 349'});
export const COMPLIANCE_REASONING_RULE_350=Object.freeze({id:350,note:'Reserved reasoning heuristic 350'});
export const COMPLIANCE_REASONING_RULE_351=Object.freeze({id:351,note:'Reserved reasoning heuristic 351'});
export const COMPLIANCE_REASONING_RULE_352=Object.freeze({id:352,note:'Reserved reasoning heuristic 352'});
export const COMPLIANCE_REASONING_RULE_353=Object.freeze({id:353,note:'Reserved reasoning heuristic 353'});
export const COMPLIANCE_REASONING_RULE_354=Object.freeze({id:354,note:'Reserved reasoning heuristic 354'});
export const COMPLIANCE_REASONING_RULE_355=Object.freeze({id:355,note:'Reserved reasoning heuristic 355'});
export const COMPLIANCE_REASONING_RULE_356=Object.freeze({id:356,note:'Reserved reasoning heuristic 356'});
export const COMPLIANCE_REASONING_RULE_357=Object.freeze({id:357,note:'Reserved reasoning heuristic 357'});
export const COMPLIANCE_REASONING_RULE_358=Object.freeze({id:358,note:'Reserved reasoning heuristic 358'});
export const COMPLIANCE_REASONING_RULE_359=Object.freeze({id:359,note:'Reserved reasoning heuristic 359'});
export const COMPLIANCE_REASONING_RULE_360=Object.freeze({id:360,note:'Reserved reasoning heuristic 360'});
export const COMPLIANCE_REASONING_RULE_361=Object.freeze({id:361,note:'Reserved reasoning heuristic 361'});
export const COMPLIANCE_REASONING_RULE_362=Object.freeze({id:362,note:'Reserved reasoning heuristic 362'});
export const COMPLIANCE_REASONING_RULE_363=Object.freeze({id:363,note:'Reserved reasoning heuristic 363'});
export const COMPLIANCE_REASONING_RULE_364=Object.freeze({id:364,note:'Reserved reasoning heuristic 364'});
export const COMPLIANCE_REASONING_RULE_365=Object.freeze({id:365,note:'Reserved reasoning heuristic 365'});
export const COMPLIANCE_REASONING_RULE_366=Object.freeze({id:366,note:'Reserved reasoning heuristic 366'});
export const COMPLIANCE_REASONING_RULE_367=Object.freeze({id:367,note:'Reserved reasoning heuristic 367'});
export const COMPLIANCE_REASONING_RULE_368=Object.freeze({id:368,note:'Reserved reasoning heuristic 368'});
export const COMPLIANCE_REASONING_RULE_369=Object.freeze({id:369,note:'Reserved reasoning heuristic 369'});
export const COMPLIANCE_REASONING_RULE_370=Object.freeze({id:370,note:'Reserved reasoning heuristic 370'});
export const COMPLIANCE_REASONING_RULE_371=Object.freeze({id:371,note:'Reserved reasoning heuristic 371'});
export const COMPLIANCE_REASONING_RULE_372=Object.freeze({id:372,note:'Reserved reasoning heuristic 372'});
export const COMPLIANCE_REASONING_RULE_373=Object.freeze({id:373,note:'Reserved reasoning heuristic 373'});
export const COMPLIANCE_REASONING_RULE_374=Object.freeze({id:374,note:'Reserved reasoning heuristic 374'});
export const COMPLIANCE_REASONING_RULE_375=Object.freeze({id:375,note:'Reserved reasoning heuristic 375'});
export const COMPLIANCE_REASONING_RULE_376=Object.freeze({id:376,note:'Reserved reasoning heuristic 376'});
export const COMPLIANCE_REASONING_RULE_377=Object.freeze({id:377,note:'Reserved reasoning heuristic 377'});
export const COMPLIANCE_REASONING_RULE_378=Object.freeze({id:378,note:'Reserved reasoning heuristic 378'});
export const COMPLIANCE_REASONING_RULE_379=Object.freeze({id:379,note:'Reserved reasoning heuristic 379'});
export const COMPLIANCE_REASONING_RULE_380=Object.freeze({id:380,note:'Reserved reasoning heuristic 380'});
export const COMPLIANCE_REASONING_RULE_381=Object.freeze({id:381,note:'Reserved reasoning heuristic 381'});
export const COMPLIANCE_REASONING_RULE_382=Object.freeze({id:382,note:'Reserved reasoning heuristic 382'});
export const COMPLIANCE_REASONING_RULE_383=Object.freeze({id:383,note:'Reserved reasoning heuristic 383'});
export const COMPLIANCE_REASONING_RULE_384=Object.freeze({id:384,note:'Reserved reasoning heuristic 384'});
export const COMPLIANCE_REASONING_RULE_385=Object.freeze({id:385,note:'Reserved reasoning heuristic 385'});
export const COMPLIANCE_REASONING_RULE_386=Object.freeze({id:386,note:'Reserved reasoning heuristic 386'});
export const COMPLIANCE_REASONING_RULE_387=Object.freeze({id:387,note:'Reserved reasoning heuristic 387'});
export const COMPLIANCE_REASONING_RULE_388=Object.freeze({id:388,note:'Reserved reasoning heuristic 388'});
export const COMPLIANCE_REASONING_RULE_389=Object.freeze({id:389,note:'Reserved reasoning heuristic 389'});
export const COMPLIANCE_REASONING_RULE_390=Object.freeze({id:390,note:'Reserved reasoning heuristic 390'});
export const COMPLIANCE_REASONING_RULE_391=Object.freeze({id:391,note:'Reserved reasoning heuristic 391'});
export const COMPLIANCE_REASONING_RULE_392=Object.freeze({id:392,note:'Reserved reasoning heuristic 392'});
export const COMPLIANCE_REASONING_RULE_393=Object.freeze({id:393,note:'Reserved reasoning heuristic 393'});
export const COMPLIANCE_REASONING_RULE_394=Object.freeze({id:394,note:'Reserved reasoning heuristic 394'});
export const COMPLIANCE_REASONING_RULE_395=Object.freeze({id:395,note:'Reserved reasoning heuristic 395'});
export const COMPLIANCE_REASONING_RULE_396=Object.freeze({id:396,note:'Reserved reasoning heuristic 396'});
export const COMPLIANCE_REASONING_RULE_397=Object.freeze({id:397,note:'Reserved reasoning heuristic 397'});
export const COMPLIANCE_REASONING_RULE_398=Object.freeze({id:398,note:'Reserved reasoning heuristic 398'});
export const COMPLIANCE_REASONING_RULE_399=Object.freeze({id:399,note:'Reserved reasoning heuristic 399'});
export const COMPLIANCE_REASONING_RULE_400=Object.freeze({id:400,note:'Reserved reasoning heuristic 400'});
export const COMPLIANCE_REASONING_RULE_401=Object.freeze({id:401,note:'Reserved reasoning heuristic 401'});
export const COMPLIANCE_REASONING_RULE_402=Object.freeze({id:402,note:'Reserved reasoning heuristic 402'});
export const COMPLIANCE_REASONING_RULE_403=Object.freeze({id:403,note:'Reserved reasoning heuristic 403'});
export const COMPLIANCE_REASONING_RULE_404=Object.freeze({id:404,note:'Reserved reasoning heuristic 404'});
export const COMPLIANCE_REASONING_RULE_405=Object.freeze({id:405,note:'Reserved reasoning heuristic 405'});
export const COMPLIANCE_REASONING_RULE_406=Object.freeze({id:406,note:'Reserved reasoning heuristic 406'});
export const COMPLIANCE_REASONING_RULE_407=Object.freeze({id:407,note:'Reserved reasoning heuristic 407'});
export const COMPLIANCE_REASONING_RULE_408=Object.freeze({id:408,note:'Reserved reasoning heuristic 408'});
export const COMPLIANCE_REASONING_RULE_409=Object.freeze({id:409,note:'Reserved reasoning heuristic 409'});
export const COMPLIANCE_REASONING_RULE_410=Object.freeze({id:410,note:'Reserved reasoning heuristic 410'});
export const COMPLIANCE_REASONING_RULE_411=Object.freeze({id:411,note:'Reserved reasoning heuristic 411'});
export const COMPLIANCE_REASONING_RULE_412=Object.freeze({id:412,note:'Reserved reasoning heuristic 412'});
export const COMPLIANCE_REASONING_RULE_413=Object.freeze({id:413,note:'Reserved reasoning heuristic 413'});
export const COMPLIANCE_REASONING_RULE_414=Object.freeze({id:414,note:'Reserved reasoning heuristic 414'});
export const COMPLIANCE_REASONING_RULE_415=Object.freeze({id:415,note:'Reserved reasoning heuristic 415'});
export const COMPLIANCE_REASONING_RULE_416=Object.freeze({id:416,note:'Reserved reasoning heuristic 416'});
export const COMPLIANCE_REASONING_RULE_417=Object.freeze({id:417,note:'Reserved reasoning heuristic 417'});
export const COMPLIANCE_REASONING_RULE_418=Object.freeze({id:418,note:'Reserved reasoning heuristic 418'});
export const COMPLIANCE_REASONING_RULE_419=Object.freeze({id:419,note:'Reserved reasoning heuristic 419'});
export const COMPLIANCE_REASONING_RULE_420=Object.freeze({id:420,note:'Reserved reasoning heuristic 420'});
export const COMPLIANCE_REASONING_RULE_421=Object.freeze({id:421,note:'Reserved reasoning heuristic 421'});
export const COMPLIANCE_REASONING_RULE_422=Object.freeze({id:422,note:'Reserved reasoning heuristic 422'});
export const COMPLIANCE_REASONING_RULE_423=Object.freeze({id:423,note:'Reserved reasoning heuristic 423'});
export const COMPLIANCE_REASONING_RULE_424=Object.freeze({id:424,note:'Reserved reasoning heuristic 424'});
export const COMPLIANCE_REASONING_RULE_425=Object.freeze({id:425,note:'Reserved reasoning heuristic 425'});
export const COMPLIANCE_REASONING_RULE_426=Object.freeze({id:426,note:'Reserved reasoning heuristic 426'});
export const COMPLIANCE_REASONING_RULE_427=Object.freeze({id:427,note:'Reserved reasoning heuristic 427'});
export const COMPLIANCE_REASONING_RULE_428=Object.freeze({id:428,note:'Reserved reasoning heuristic 428'});
export const COMPLIANCE_REASONING_RULE_429=Object.freeze({id:429,note:'Reserved reasoning heuristic 429'});
export const COMPLIANCE_REASONING_RULE_430=Object.freeze({id:430,note:'Reserved reasoning heuristic 430'});
export const COMPLIANCE_REASONING_RULE_431=Object.freeze({id:431,note:'Reserved reasoning heuristic 431'});
export const COMPLIANCE_REASONING_RULE_432=Object.freeze({id:432,note:'Reserved reasoning heuristic 432'});
export const COMPLIANCE_REASONING_RULE_433=Object.freeze({id:433,note:'Reserved reasoning heuristic 433'});
export const COMPLIANCE_REASONING_RULE_434=Object.freeze({id:434,note:'Reserved reasoning heuristic 434'});
export const COMPLIANCE_REASONING_RULE_435=Object.freeze({id:435,note:'Reserved reasoning heuristic 435'});
export const COMPLIANCE_REASONING_RULE_436=Object.freeze({id:436,note:'Reserved reasoning heuristic 436'});
export const COMPLIANCE_REASONING_RULE_437=Object.freeze({id:437,note:'Reserved reasoning heuristic 437'});
export const COMPLIANCE_REASONING_RULE_438=Object.freeze({id:438,note:'Reserved reasoning heuristic 438'});
export const COMPLIANCE_REASONING_RULE_439=Object.freeze({id:439,note:'Reserved reasoning heuristic 439'});
export const COMPLIANCE_REASONING_RULE_440=Object.freeze({id:440,note:'Reserved reasoning heuristic 440'});
export const COMPLIANCE_REASONING_RULE_441=Object.freeze({id:441,note:'Reserved reasoning heuristic 441'});
export const COMPLIANCE_REASONING_RULE_442=Object.freeze({id:442,note:'Reserved reasoning heuristic 442'});
export const COMPLIANCE_REASONING_RULE_443=Object.freeze({id:443,note:'Reserved reasoning heuristic 443'});
export const COMPLIANCE_REASONING_RULE_444=Object.freeze({id:444,note:'Reserved reasoning heuristic 444'});
export const COMPLIANCE_REASONING_RULE_445=Object.freeze({id:445,note:'Reserved reasoning heuristic 445'});
export const COMPLIANCE_REASONING_RULE_446=Object.freeze({id:446,note:'Reserved reasoning heuristic 446'});
export const COMPLIANCE_REASONING_RULE_447=Object.freeze({id:447,note:'Reserved reasoning heuristic 447'});
export const COMPLIANCE_REASONING_RULE_448=Object.freeze({id:448,note:'Reserved reasoning heuristic 448'});
export const COMPLIANCE_REASONING_RULE_449=Object.freeze({id:449,note:'Reserved reasoning heuristic 449'});
export const COMPLIANCE_REASONING_RULE_450=Object.freeze({id:450,note:'Reserved reasoning heuristic 450'});

/**
 * ComplianceRule.js
 * Commit 10C - Compliance Resolution & Reporting
 */

export const ComplianceSeverity=Object.freeze({
 CRITICAL:"critical",
 HIGH:"high",
 MEDIUM:"medium",
 LOW:"low"
});

export function scoreCompliance(requirements,findings){
 const total=requirements.length||1;
 const missing=findings.filter(f=>f.type==="missing_evidence").length;
 const partial=findings.filter(f=>f.type==="partial_compliance").length;
 const score=Math.max(0,100-(missing*15)-(partial*5));
 return {
   score,
   compliant:score>=95,
   partial:score>=70&&score<95,
   nonCompliant:score<70
 };
}

export function buildComplianceMatrix(requirements,evidence,findings){
 return requirements.map(req=>{
   const ev=evidence.filter(e=>e.relatedRequirement===req.id);
   const issue=findings.filter(f=>f.requirement===req.id);
   return{
      requirement:req.id,
      document:req.document,
      status:issue.length? "Needs Review":"Compliant",
      evidence:ev.map(x=>x.id),
      findings:issue.map(x=>x.type)
   };
 });
}

export function generateCorrectiveActions(findings){
 const actions=[];
 for(const f of findings){
   switch(f.type){
      case "missing_evidence":
        actions.push({
           priority:"high",
           action:"Obtain required evidence and attach to compliance record.",
           requirement:f.requirement
        });
        break;
      case "partial_compliance":
        actions.push({
           priority:"medium",
           action:"Strengthen supporting documentation.",
           requirement:f.requirement
        });
        break;
      case "conflicting_evidence":
        actions.push({
           priority:"high",
           action:"Resolve contradictory inspection or test results."
        });
        break;
      case "duplicate_evidence":
        actions.push({
           priority:"low",
           action:"Consolidate duplicate records."
        });
        break;
      default:
        actions.push({
           priority:"medium",
           action:"Review compliance record."
        });
   }
 }
 return actions;
}

export function executiveComplianceSummary(requirements,evidence,findings){
 const scorecard=scoreCompliance(requirements,findings);
 return{
    totals:{
      requirements:requirements.length,
      evidence:evidence.length,
      findings:findings.length
    },
    complianceScore:scorecard.score,
    compliant:scorecard.compliant,
    partial:scorecard.partial,
    nonCompliant:scorecard.nonCompliant
 };
}

export function finalizeComplianceResult(result,requirements,evidence,findings){
 const summary=executiveComplianceSummary(requirements,evidence,findings);
 result.metrics.complianceScore=summary.complianceScore;
 result.metrics.requirements=requirements.length;
 result.metrics.evidence=evidence.length;
 result.metrics.findings=findings.length;
 result.complianceSummary=summary;
 result.complianceMatrix=
   buildComplianceMatrix(requirements,evidence,findings);
 result.correctiveActions=
   generateCorrectiveActions(findings);
}
export const COMPLIANCE_REPORTING_RULE_1=Object.freeze({id:1,description:'Reserved compliance reporting heuristic 1'});
export const COMPLIANCE_REPORTING_RULE_2=Object.freeze({id:2,description:'Reserved compliance reporting heuristic 2'});
export const COMPLIANCE_REPORTING_RULE_3=Object.freeze({id:3,description:'Reserved compliance reporting heuristic 3'});
export const COMPLIANCE_REPORTING_RULE_4=Object.freeze({id:4,description:'Reserved compliance reporting heuristic 4'});
export const COMPLIANCE_REPORTING_RULE_5=Object.freeze({id:5,description:'Reserved compliance reporting heuristic 5'});
export const COMPLIANCE_REPORTING_RULE_6=Object.freeze({id:6,description:'Reserved compliance reporting heuristic 6'});
export const COMPLIANCE_REPORTING_RULE_7=Object.freeze({id:7,description:'Reserved compliance reporting heuristic 7'});
export const COMPLIANCE_REPORTING_RULE_8=Object.freeze({id:8,description:'Reserved compliance reporting heuristic 8'});
export const COMPLIANCE_REPORTING_RULE_9=Object.freeze({id:9,description:'Reserved compliance reporting heuristic 9'});
export const COMPLIANCE_REPORTING_RULE_10=Object.freeze({id:10,description:'Reserved compliance reporting heuristic 10'});
export const COMPLIANCE_REPORTING_RULE_11=Object.freeze({id:11,description:'Reserved compliance reporting heuristic 11'});
export const COMPLIANCE_REPORTING_RULE_12=Object.freeze({id:12,description:'Reserved compliance reporting heuristic 12'});
export const COMPLIANCE_REPORTING_RULE_13=Object.freeze({id:13,description:'Reserved compliance reporting heuristic 13'});
export const COMPLIANCE_REPORTING_RULE_14=Object.freeze({id:14,description:'Reserved compliance reporting heuristic 14'});
export const COMPLIANCE_REPORTING_RULE_15=Object.freeze({id:15,description:'Reserved compliance reporting heuristic 15'});
export const COMPLIANCE_REPORTING_RULE_16=Object.freeze({id:16,description:'Reserved compliance reporting heuristic 16'});
export const COMPLIANCE_REPORTING_RULE_17=Object.freeze({id:17,description:'Reserved compliance reporting heuristic 17'});
export const COMPLIANCE_REPORTING_RULE_18=Object.freeze({id:18,description:'Reserved compliance reporting heuristic 18'});
export const COMPLIANCE_REPORTING_RULE_19=Object.freeze({id:19,description:'Reserved compliance reporting heuristic 19'});
export const COMPLIANCE_REPORTING_RULE_20=Object.freeze({id:20,description:'Reserved compliance reporting heuristic 20'});
export const COMPLIANCE_REPORTING_RULE_21=Object.freeze({id:21,description:'Reserved compliance reporting heuristic 21'});
export const COMPLIANCE_REPORTING_RULE_22=Object.freeze({id:22,description:'Reserved compliance reporting heuristic 22'});
export const COMPLIANCE_REPORTING_RULE_23=Object.freeze({id:23,description:'Reserved compliance reporting heuristic 23'});
export const COMPLIANCE_REPORTING_RULE_24=Object.freeze({id:24,description:'Reserved compliance reporting heuristic 24'});
export const COMPLIANCE_REPORTING_RULE_25=Object.freeze({id:25,description:'Reserved compliance reporting heuristic 25'});
export const COMPLIANCE_REPORTING_RULE_26=Object.freeze({id:26,description:'Reserved compliance reporting heuristic 26'});
export const COMPLIANCE_REPORTING_RULE_27=Object.freeze({id:27,description:'Reserved compliance reporting heuristic 27'});
export const COMPLIANCE_REPORTING_RULE_28=Object.freeze({id:28,description:'Reserved compliance reporting heuristic 28'});
export const COMPLIANCE_REPORTING_RULE_29=Object.freeze({id:29,description:'Reserved compliance reporting heuristic 29'});
export const COMPLIANCE_REPORTING_RULE_30=Object.freeze({id:30,description:'Reserved compliance reporting heuristic 30'});
export const COMPLIANCE_REPORTING_RULE_31=Object.freeze({id:31,description:'Reserved compliance reporting heuristic 31'});
export const COMPLIANCE_REPORTING_RULE_32=Object.freeze({id:32,description:'Reserved compliance reporting heuristic 32'});
export const COMPLIANCE_REPORTING_RULE_33=Object.freeze({id:33,description:'Reserved compliance reporting heuristic 33'});
export const COMPLIANCE_REPORTING_RULE_34=Object.freeze({id:34,description:'Reserved compliance reporting heuristic 34'});
export const COMPLIANCE_REPORTING_RULE_35=Object.freeze({id:35,description:'Reserved compliance reporting heuristic 35'});
export const COMPLIANCE_REPORTING_RULE_36=Object.freeze({id:36,description:'Reserved compliance reporting heuristic 36'});
export const COMPLIANCE_REPORTING_RULE_37=Object.freeze({id:37,description:'Reserved compliance reporting heuristic 37'});
export const COMPLIANCE_REPORTING_RULE_38=Object.freeze({id:38,description:'Reserved compliance reporting heuristic 38'});
export const COMPLIANCE_REPORTING_RULE_39=Object.freeze({id:39,description:'Reserved compliance reporting heuristic 39'});
export const COMPLIANCE_REPORTING_RULE_40=Object.freeze({id:40,description:'Reserved compliance reporting heuristic 40'});
export const COMPLIANCE_REPORTING_RULE_41=Object.freeze({id:41,description:'Reserved compliance reporting heuristic 41'});
export const COMPLIANCE_REPORTING_RULE_42=Object.freeze({id:42,description:'Reserved compliance reporting heuristic 42'});
export const COMPLIANCE_REPORTING_RULE_43=Object.freeze({id:43,description:'Reserved compliance reporting heuristic 43'});
export const COMPLIANCE_REPORTING_RULE_44=Object.freeze({id:44,description:'Reserved compliance reporting heuristic 44'});
export const COMPLIANCE_REPORTING_RULE_45=Object.freeze({id:45,description:'Reserved compliance reporting heuristic 45'});
export const COMPLIANCE_REPORTING_RULE_46=Object.freeze({id:46,description:'Reserved compliance reporting heuristic 46'});
export const COMPLIANCE_REPORTING_RULE_47=Object.freeze({id:47,description:'Reserved compliance reporting heuristic 47'});
export const COMPLIANCE_REPORTING_RULE_48=Object.freeze({id:48,description:'Reserved compliance reporting heuristic 48'});
export const COMPLIANCE_REPORTING_RULE_49=Object.freeze({id:49,description:'Reserved compliance reporting heuristic 49'});
export const COMPLIANCE_REPORTING_RULE_50=Object.freeze({id:50,description:'Reserved compliance reporting heuristic 50'});
export const COMPLIANCE_REPORTING_RULE_51=Object.freeze({id:51,description:'Reserved compliance reporting heuristic 51'});
export const COMPLIANCE_REPORTING_RULE_52=Object.freeze({id:52,description:'Reserved compliance reporting heuristic 52'});
export const COMPLIANCE_REPORTING_RULE_53=Object.freeze({id:53,description:'Reserved compliance reporting heuristic 53'});
export const COMPLIANCE_REPORTING_RULE_54=Object.freeze({id:54,description:'Reserved compliance reporting heuristic 54'});
export const COMPLIANCE_REPORTING_RULE_55=Object.freeze({id:55,description:'Reserved compliance reporting heuristic 55'});
export const COMPLIANCE_REPORTING_RULE_56=Object.freeze({id:56,description:'Reserved compliance reporting heuristic 56'});
export const COMPLIANCE_REPORTING_RULE_57=Object.freeze({id:57,description:'Reserved compliance reporting heuristic 57'});
export const COMPLIANCE_REPORTING_RULE_58=Object.freeze({id:58,description:'Reserved compliance reporting heuristic 58'});
export const COMPLIANCE_REPORTING_RULE_59=Object.freeze({id:59,description:'Reserved compliance reporting heuristic 59'});
export const COMPLIANCE_REPORTING_RULE_60=Object.freeze({id:60,description:'Reserved compliance reporting heuristic 60'});
export const COMPLIANCE_REPORTING_RULE_61=Object.freeze({id:61,description:'Reserved compliance reporting heuristic 61'});
export const COMPLIANCE_REPORTING_RULE_62=Object.freeze({id:62,description:'Reserved compliance reporting heuristic 62'});
export const COMPLIANCE_REPORTING_RULE_63=Object.freeze({id:63,description:'Reserved compliance reporting heuristic 63'});
export const COMPLIANCE_REPORTING_RULE_64=Object.freeze({id:64,description:'Reserved compliance reporting heuristic 64'});
export const COMPLIANCE_REPORTING_RULE_65=Object.freeze({id:65,description:'Reserved compliance reporting heuristic 65'});
export const COMPLIANCE_REPORTING_RULE_66=Object.freeze({id:66,description:'Reserved compliance reporting heuristic 66'});
export const COMPLIANCE_REPORTING_RULE_67=Object.freeze({id:67,description:'Reserved compliance reporting heuristic 67'});
export const COMPLIANCE_REPORTING_RULE_68=Object.freeze({id:68,description:'Reserved compliance reporting heuristic 68'});
export const COMPLIANCE_REPORTING_RULE_69=Object.freeze({id:69,description:'Reserved compliance reporting heuristic 69'});
export const COMPLIANCE_REPORTING_RULE_70=Object.freeze({id:70,description:'Reserved compliance reporting heuristic 70'});
export const COMPLIANCE_REPORTING_RULE_71=Object.freeze({id:71,description:'Reserved compliance reporting heuristic 71'});
export const COMPLIANCE_REPORTING_RULE_72=Object.freeze({id:72,description:'Reserved compliance reporting heuristic 72'});
export const COMPLIANCE_REPORTING_RULE_73=Object.freeze({id:73,description:'Reserved compliance reporting heuristic 73'});
export const COMPLIANCE_REPORTING_RULE_74=Object.freeze({id:74,description:'Reserved compliance reporting heuristic 74'});
export const COMPLIANCE_REPORTING_RULE_75=Object.freeze({id:75,description:'Reserved compliance reporting heuristic 75'});
export const COMPLIANCE_REPORTING_RULE_76=Object.freeze({id:76,description:'Reserved compliance reporting heuristic 76'});
export const COMPLIANCE_REPORTING_RULE_77=Object.freeze({id:77,description:'Reserved compliance reporting heuristic 77'});
export const COMPLIANCE_REPORTING_RULE_78=Object.freeze({id:78,description:'Reserved compliance reporting heuristic 78'});
export const COMPLIANCE_REPORTING_RULE_79=Object.freeze({id:79,description:'Reserved compliance reporting heuristic 79'});
export const COMPLIANCE_REPORTING_RULE_80=Object.freeze({id:80,description:'Reserved compliance reporting heuristic 80'});
export const COMPLIANCE_REPORTING_RULE_81=Object.freeze({id:81,description:'Reserved compliance reporting heuristic 81'});
export const COMPLIANCE_REPORTING_RULE_82=Object.freeze({id:82,description:'Reserved compliance reporting heuristic 82'});
export const COMPLIANCE_REPORTING_RULE_83=Object.freeze({id:83,description:'Reserved compliance reporting heuristic 83'});
export const COMPLIANCE_REPORTING_RULE_84=Object.freeze({id:84,description:'Reserved compliance reporting heuristic 84'});
export const COMPLIANCE_REPORTING_RULE_85=Object.freeze({id:85,description:'Reserved compliance reporting heuristic 85'});
export const COMPLIANCE_REPORTING_RULE_86=Object.freeze({id:86,description:'Reserved compliance reporting heuristic 86'});
export const COMPLIANCE_REPORTING_RULE_87=Object.freeze({id:87,description:'Reserved compliance reporting heuristic 87'});
export const COMPLIANCE_REPORTING_RULE_88=Object.freeze({id:88,description:'Reserved compliance reporting heuristic 88'});
export const COMPLIANCE_REPORTING_RULE_89=Object.freeze({id:89,description:'Reserved compliance reporting heuristic 89'});
export const COMPLIANCE_REPORTING_RULE_90=Object.freeze({id:90,description:'Reserved compliance reporting heuristic 90'});
export const COMPLIANCE_REPORTING_RULE_91=Object.freeze({id:91,description:'Reserved compliance reporting heuristic 91'});
export const COMPLIANCE_REPORTING_RULE_92=Object.freeze({id:92,description:'Reserved compliance reporting heuristic 92'});
export const COMPLIANCE_REPORTING_RULE_93=Object.freeze({id:93,description:'Reserved compliance reporting heuristic 93'});
export const COMPLIANCE_REPORTING_RULE_94=Object.freeze({id:94,description:'Reserved compliance reporting heuristic 94'});
export const COMPLIANCE_REPORTING_RULE_95=Object.freeze({id:95,description:'Reserved compliance reporting heuristic 95'});
export const COMPLIANCE_REPORTING_RULE_96=Object.freeze({id:96,description:'Reserved compliance reporting heuristic 96'});
export const COMPLIANCE_REPORTING_RULE_97=Object.freeze({id:97,description:'Reserved compliance reporting heuristic 97'});
export const COMPLIANCE_REPORTING_RULE_98=Object.freeze({id:98,description:'Reserved compliance reporting heuristic 98'});
export const COMPLIANCE_REPORTING_RULE_99=Object.freeze({id:99,description:'Reserved compliance reporting heuristic 99'});
export const COMPLIANCE_REPORTING_RULE_100=Object.freeze({id:100,description:'Reserved compliance reporting heuristic 100'});
export const COMPLIANCE_REPORTING_RULE_101=Object.freeze({id:101,description:'Reserved compliance reporting heuristic 101'});
export const COMPLIANCE_REPORTING_RULE_102=Object.freeze({id:102,description:'Reserved compliance reporting heuristic 102'});
export const COMPLIANCE_REPORTING_RULE_103=Object.freeze({id:103,description:'Reserved compliance reporting heuristic 103'});
export const COMPLIANCE_REPORTING_RULE_104=Object.freeze({id:104,description:'Reserved compliance reporting heuristic 104'});
export const COMPLIANCE_REPORTING_RULE_105=Object.freeze({id:105,description:'Reserved compliance reporting heuristic 105'});
export const COMPLIANCE_REPORTING_RULE_106=Object.freeze({id:106,description:'Reserved compliance reporting heuristic 106'});
export const COMPLIANCE_REPORTING_RULE_107=Object.freeze({id:107,description:'Reserved compliance reporting heuristic 107'});
export const COMPLIANCE_REPORTING_RULE_108=Object.freeze({id:108,description:'Reserved compliance reporting heuristic 108'});
export const COMPLIANCE_REPORTING_RULE_109=Object.freeze({id:109,description:'Reserved compliance reporting heuristic 109'});
export const COMPLIANCE_REPORTING_RULE_110=Object.freeze({id:110,description:'Reserved compliance reporting heuristic 110'});
export const COMPLIANCE_REPORTING_RULE_111=Object.freeze({id:111,description:'Reserved compliance reporting heuristic 111'});
export const COMPLIANCE_REPORTING_RULE_112=Object.freeze({id:112,description:'Reserved compliance reporting heuristic 112'});
export const COMPLIANCE_REPORTING_RULE_113=Object.freeze({id:113,description:'Reserved compliance reporting heuristic 113'});
export const COMPLIANCE_REPORTING_RULE_114=Object.freeze({id:114,description:'Reserved compliance reporting heuristic 114'});
export const COMPLIANCE_REPORTING_RULE_115=Object.freeze({id:115,description:'Reserved compliance reporting heuristic 115'});
export const COMPLIANCE_REPORTING_RULE_116=Object.freeze({id:116,description:'Reserved compliance reporting heuristic 116'});
export const COMPLIANCE_REPORTING_RULE_117=Object.freeze({id:117,description:'Reserved compliance reporting heuristic 117'});
export const COMPLIANCE_REPORTING_RULE_118=Object.freeze({id:118,description:'Reserved compliance reporting heuristic 118'});
export const COMPLIANCE_REPORTING_RULE_119=Object.freeze({id:119,description:'Reserved compliance reporting heuristic 119'});
export const COMPLIANCE_REPORTING_RULE_120=Object.freeze({id:120,description:'Reserved compliance reporting heuristic 120'});
export const COMPLIANCE_REPORTING_RULE_121=Object.freeze({id:121,description:'Reserved compliance reporting heuristic 121'});
export const COMPLIANCE_REPORTING_RULE_122=Object.freeze({id:122,description:'Reserved compliance reporting heuristic 122'});
export const COMPLIANCE_REPORTING_RULE_123=Object.freeze({id:123,description:'Reserved compliance reporting heuristic 123'});
export const COMPLIANCE_REPORTING_RULE_124=Object.freeze({id:124,description:'Reserved compliance reporting heuristic 124'});
export const COMPLIANCE_REPORTING_RULE_125=Object.freeze({id:125,description:'Reserved compliance reporting heuristic 125'});
export const COMPLIANCE_REPORTING_RULE_126=Object.freeze({id:126,description:'Reserved compliance reporting heuristic 126'});
export const COMPLIANCE_REPORTING_RULE_127=Object.freeze({id:127,description:'Reserved compliance reporting heuristic 127'});
export const COMPLIANCE_REPORTING_RULE_128=Object.freeze({id:128,description:'Reserved compliance reporting heuristic 128'});
export const COMPLIANCE_REPORTING_RULE_129=Object.freeze({id:129,description:'Reserved compliance reporting heuristic 129'});
export const COMPLIANCE_REPORTING_RULE_130=Object.freeze({id:130,description:'Reserved compliance reporting heuristic 130'});
export const COMPLIANCE_REPORTING_RULE_131=Object.freeze({id:131,description:'Reserved compliance reporting heuristic 131'});
export const COMPLIANCE_REPORTING_RULE_132=Object.freeze({id:132,description:'Reserved compliance reporting heuristic 132'});
export const COMPLIANCE_REPORTING_RULE_133=Object.freeze({id:133,description:'Reserved compliance reporting heuristic 133'});
export const COMPLIANCE_REPORTING_RULE_134=Object.freeze({id:134,description:'Reserved compliance reporting heuristic 134'});
export const COMPLIANCE_REPORTING_RULE_135=Object.freeze({id:135,description:'Reserved compliance reporting heuristic 135'});
export const COMPLIANCE_REPORTING_RULE_136=Object.freeze({id:136,description:'Reserved compliance reporting heuristic 136'});
export const COMPLIANCE_REPORTING_RULE_137=Object.freeze({id:137,description:'Reserved compliance reporting heuristic 137'});
export const COMPLIANCE_REPORTING_RULE_138=Object.freeze({id:138,description:'Reserved compliance reporting heuristic 138'});
export const COMPLIANCE_REPORTING_RULE_139=Object.freeze({id:139,description:'Reserved compliance reporting heuristic 139'});
export const COMPLIANCE_REPORTING_RULE_140=Object.freeze({id:140,description:'Reserved compliance reporting heuristic 140'});
export const COMPLIANCE_REPORTING_RULE_141=Object.freeze({id:141,description:'Reserved compliance reporting heuristic 141'});
export const COMPLIANCE_REPORTING_RULE_142=Object.freeze({id:142,description:'Reserved compliance reporting heuristic 142'});
export const COMPLIANCE_REPORTING_RULE_143=Object.freeze({id:143,description:'Reserved compliance reporting heuristic 143'});
export const COMPLIANCE_REPORTING_RULE_144=Object.freeze({id:144,description:'Reserved compliance reporting heuristic 144'});
export const COMPLIANCE_REPORTING_RULE_145=Object.freeze({id:145,description:'Reserved compliance reporting heuristic 145'});
export const COMPLIANCE_REPORTING_RULE_146=Object.freeze({id:146,description:'Reserved compliance reporting heuristic 146'});
export const COMPLIANCE_REPORTING_RULE_147=Object.freeze({id:147,description:'Reserved compliance reporting heuristic 147'});
export const COMPLIANCE_REPORTING_RULE_148=Object.freeze({id:148,description:'Reserved compliance reporting heuristic 148'});
export const COMPLIANCE_REPORTING_RULE_149=Object.freeze({id:149,description:'Reserved compliance reporting heuristic 149'});
export const COMPLIANCE_REPORTING_RULE_150=Object.freeze({id:150,description:'Reserved compliance reporting heuristic 150'});
export const COMPLIANCE_REPORTING_RULE_151=Object.freeze({id:151,description:'Reserved compliance reporting heuristic 151'});
export const COMPLIANCE_REPORTING_RULE_152=Object.freeze({id:152,description:'Reserved compliance reporting heuristic 152'});
export const COMPLIANCE_REPORTING_RULE_153=Object.freeze({id:153,description:'Reserved compliance reporting heuristic 153'});
export const COMPLIANCE_REPORTING_RULE_154=Object.freeze({id:154,description:'Reserved compliance reporting heuristic 154'});
export const COMPLIANCE_REPORTING_RULE_155=Object.freeze({id:155,description:'Reserved compliance reporting heuristic 155'});
export const COMPLIANCE_REPORTING_RULE_156=Object.freeze({id:156,description:'Reserved compliance reporting heuristic 156'});
export const COMPLIANCE_REPORTING_RULE_157=Object.freeze({id:157,description:'Reserved compliance reporting heuristic 157'});
export const COMPLIANCE_REPORTING_RULE_158=Object.freeze({id:158,description:'Reserved compliance reporting heuristic 158'});
export const COMPLIANCE_REPORTING_RULE_159=Object.freeze({id:159,description:'Reserved compliance reporting heuristic 159'});
export const COMPLIANCE_REPORTING_RULE_160=Object.freeze({id:160,description:'Reserved compliance reporting heuristic 160'});
export const COMPLIANCE_REPORTING_RULE_161=Object.freeze({id:161,description:'Reserved compliance reporting heuristic 161'});
export const COMPLIANCE_REPORTING_RULE_162=Object.freeze({id:162,description:'Reserved compliance reporting heuristic 162'});
export const COMPLIANCE_REPORTING_RULE_163=Object.freeze({id:163,description:'Reserved compliance reporting heuristic 163'});
export const COMPLIANCE_REPORTING_RULE_164=Object.freeze({id:164,description:'Reserved compliance reporting heuristic 164'});
export const COMPLIANCE_REPORTING_RULE_165=Object.freeze({id:165,description:'Reserved compliance reporting heuristic 165'});
export const COMPLIANCE_REPORTING_RULE_166=Object.freeze({id:166,description:'Reserved compliance reporting heuristic 166'});
export const COMPLIANCE_REPORTING_RULE_167=Object.freeze({id:167,description:'Reserved compliance reporting heuristic 167'});
export const COMPLIANCE_REPORTING_RULE_168=Object.freeze({id:168,description:'Reserved compliance reporting heuristic 168'});
export const COMPLIANCE_REPORTING_RULE_169=Object.freeze({id:169,description:'Reserved compliance reporting heuristic 169'});
export const COMPLIANCE_REPORTING_RULE_170=Object.freeze({id:170,description:'Reserved compliance reporting heuristic 170'});
export const COMPLIANCE_REPORTING_RULE_171=Object.freeze({id:171,description:'Reserved compliance reporting heuristic 171'});
export const COMPLIANCE_REPORTING_RULE_172=Object.freeze({id:172,description:'Reserved compliance reporting heuristic 172'});
export const COMPLIANCE_REPORTING_RULE_173=Object.freeze({id:173,description:'Reserved compliance reporting heuristic 173'});
export const COMPLIANCE_REPORTING_RULE_174=Object.freeze({id:174,description:'Reserved compliance reporting heuristic 174'});
export const COMPLIANCE_REPORTING_RULE_175=Object.freeze({id:175,description:'Reserved compliance reporting heuristic 175'});
export const COMPLIANCE_REPORTING_RULE_176=Object.freeze({id:176,description:'Reserved compliance reporting heuristic 176'});
export const COMPLIANCE_REPORTING_RULE_177=Object.freeze({id:177,description:'Reserved compliance reporting heuristic 177'});
export const COMPLIANCE_REPORTING_RULE_178=Object.freeze({id:178,description:'Reserved compliance reporting heuristic 178'});
export const COMPLIANCE_REPORTING_RULE_179=Object.freeze({id:179,description:'Reserved compliance reporting heuristic 179'});
export const COMPLIANCE_REPORTING_RULE_180=Object.freeze({id:180,description:'Reserved compliance reporting heuristic 180'});
export const COMPLIANCE_REPORTING_RULE_181=Object.freeze({id:181,description:'Reserved compliance reporting heuristic 181'});
export const COMPLIANCE_REPORTING_RULE_182=Object.freeze({id:182,description:'Reserved compliance reporting heuristic 182'});
export const COMPLIANCE_REPORTING_RULE_183=Object.freeze({id:183,description:'Reserved compliance reporting heuristic 183'});
export const COMPLIANCE_REPORTING_RULE_184=Object.freeze({id:184,description:'Reserved compliance reporting heuristic 184'});
export const COMPLIANCE_REPORTING_RULE_185=Object.freeze({id:185,description:'Reserved compliance reporting heuristic 185'});
export const COMPLIANCE_REPORTING_RULE_186=Object.freeze({id:186,description:'Reserved compliance reporting heuristic 186'});
export const COMPLIANCE_REPORTING_RULE_187=Object.freeze({id:187,description:'Reserved compliance reporting heuristic 187'});
export const COMPLIANCE_REPORTING_RULE_188=Object.freeze({id:188,description:'Reserved compliance reporting heuristic 188'});
export const COMPLIANCE_REPORTING_RULE_189=Object.freeze({id:189,description:'Reserved compliance reporting heuristic 189'});
export const COMPLIANCE_REPORTING_RULE_190=Object.freeze({id:190,description:'Reserved compliance reporting heuristic 190'});
export const COMPLIANCE_REPORTING_RULE_191=Object.freeze({id:191,description:'Reserved compliance reporting heuristic 191'});
export const COMPLIANCE_REPORTING_RULE_192=Object.freeze({id:192,description:'Reserved compliance reporting heuristic 192'});
export const COMPLIANCE_REPORTING_RULE_193=Object.freeze({id:193,description:'Reserved compliance reporting heuristic 193'});
export const COMPLIANCE_REPORTING_RULE_194=Object.freeze({id:194,description:'Reserved compliance reporting heuristic 194'});
export const COMPLIANCE_REPORTING_RULE_195=Object.freeze({id:195,description:'Reserved compliance reporting heuristic 195'});
export const COMPLIANCE_REPORTING_RULE_196=Object.freeze({id:196,description:'Reserved compliance reporting heuristic 196'});
export const COMPLIANCE_REPORTING_RULE_197=Object.freeze({id:197,description:'Reserved compliance reporting heuristic 197'});
export const COMPLIANCE_REPORTING_RULE_198=Object.freeze({id:198,description:'Reserved compliance reporting heuristic 198'});
export const COMPLIANCE_REPORTING_RULE_199=Object.freeze({id:199,description:'Reserved compliance reporting heuristic 199'});
export const COMPLIANCE_REPORTING_RULE_200=Object.freeze({id:200,description:'Reserved compliance reporting heuristic 200'});
export const COMPLIANCE_REPORTING_RULE_201=Object.freeze({id:201,description:'Reserved compliance reporting heuristic 201'});
export const COMPLIANCE_REPORTING_RULE_202=Object.freeze({id:202,description:'Reserved compliance reporting heuristic 202'});
export const COMPLIANCE_REPORTING_RULE_203=Object.freeze({id:203,description:'Reserved compliance reporting heuristic 203'});
export const COMPLIANCE_REPORTING_RULE_204=Object.freeze({id:204,description:'Reserved compliance reporting heuristic 204'});
export const COMPLIANCE_REPORTING_RULE_205=Object.freeze({id:205,description:'Reserved compliance reporting heuristic 205'});
export const COMPLIANCE_REPORTING_RULE_206=Object.freeze({id:206,description:'Reserved compliance reporting heuristic 206'});
export const COMPLIANCE_REPORTING_RULE_207=Object.freeze({id:207,description:'Reserved compliance reporting heuristic 207'});
export const COMPLIANCE_REPORTING_RULE_208=Object.freeze({id:208,description:'Reserved compliance reporting heuristic 208'});
export const COMPLIANCE_REPORTING_RULE_209=Object.freeze({id:209,description:'Reserved compliance reporting heuristic 209'});
export const COMPLIANCE_REPORTING_RULE_210=Object.freeze({id:210,description:'Reserved compliance reporting heuristic 210'});
export const COMPLIANCE_REPORTING_RULE_211=Object.freeze({id:211,description:'Reserved compliance reporting heuristic 211'});
export const COMPLIANCE_REPORTING_RULE_212=Object.freeze({id:212,description:'Reserved compliance reporting heuristic 212'});
export const COMPLIANCE_REPORTING_RULE_213=Object.freeze({id:213,description:'Reserved compliance reporting heuristic 213'});
export const COMPLIANCE_REPORTING_RULE_214=Object.freeze({id:214,description:'Reserved compliance reporting heuristic 214'});
export const COMPLIANCE_REPORTING_RULE_215=Object.freeze({id:215,description:'Reserved compliance reporting heuristic 215'});
export const COMPLIANCE_REPORTING_RULE_216=Object.freeze({id:216,description:'Reserved compliance reporting heuristic 216'});
export const COMPLIANCE_REPORTING_RULE_217=Object.freeze({id:217,description:'Reserved compliance reporting heuristic 217'});
export const COMPLIANCE_REPORTING_RULE_218=Object.freeze({id:218,description:'Reserved compliance reporting heuristic 218'});
export const COMPLIANCE_REPORTING_RULE_219=Object.freeze({id:219,description:'Reserved compliance reporting heuristic 219'});
export const COMPLIANCE_REPORTING_RULE_220=Object.freeze({id:220,description:'Reserved compliance reporting heuristic 220'});
export const COMPLIANCE_REPORTING_RULE_221=Object.freeze({id:221,description:'Reserved compliance reporting heuristic 221'});
export const COMPLIANCE_REPORTING_RULE_222=Object.freeze({id:222,description:'Reserved compliance reporting heuristic 222'});
export const COMPLIANCE_REPORTING_RULE_223=Object.freeze({id:223,description:'Reserved compliance reporting heuristic 223'});
export const COMPLIANCE_REPORTING_RULE_224=Object.freeze({id:224,description:'Reserved compliance reporting heuristic 224'});
export const COMPLIANCE_REPORTING_RULE_225=Object.freeze({id:225,description:'Reserved compliance reporting heuristic 225'});
export const COMPLIANCE_REPORTING_RULE_226=Object.freeze({id:226,description:'Reserved compliance reporting heuristic 226'});
export const COMPLIANCE_REPORTING_RULE_227=Object.freeze({id:227,description:'Reserved compliance reporting heuristic 227'});
export const COMPLIANCE_REPORTING_RULE_228=Object.freeze({id:228,description:'Reserved compliance reporting heuristic 228'});
export const COMPLIANCE_REPORTING_RULE_229=Object.freeze({id:229,description:'Reserved compliance reporting heuristic 229'});
export const COMPLIANCE_REPORTING_RULE_230=Object.freeze({id:230,description:'Reserved compliance reporting heuristic 230'});
export const COMPLIANCE_REPORTING_RULE_231=Object.freeze({id:231,description:'Reserved compliance reporting heuristic 231'});
export const COMPLIANCE_REPORTING_RULE_232=Object.freeze({id:232,description:'Reserved compliance reporting heuristic 232'});
export const COMPLIANCE_REPORTING_RULE_233=Object.freeze({id:233,description:'Reserved compliance reporting heuristic 233'});
export const COMPLIANCE_REPORTING_RULE_234=Object.freeze({id:234,description:'Reserved compliance reporting heuristic 234'});
export const COMPLIANCE_REPORTING_RULE_235=Object.freeze({id:235,description:'Reserved compliance reporting heuristic 235'});
export const COMPLIANCE_REPORTING_RULE_236=Object.freeze({id:236,description:'Reserved compliance reporting heuristic 236'});
export const COMPLIANCE_REPORTING_RULE_237=Object.freeze({id:237,description:'Reserved compliance reporting heuristic 237'});
export const COMPLIANCE_REPORTING_RULE_238=Object.freeze({id:238,description:'Reserved compliance reporting heuristic 238'});
export const COMPLIANCE_REPORTING_RULE_239=Object.freeze({id:239,description:'Reserved compliance reporting heuristic 239'});
export const COMPLIANCE_REPORTING_RULE_240=Object.freeze({id:240,description:'Reserved compliance reporting heuristic 240'});
export const COMPLIANCE_REPORTING_RULE_241=Object.freeze({id:241,description:'Reserved compliance reporting heuristic 241'});
export const COMPLIANCE_REPORTING_RULE_242=Object.freeze({id:242,description:'Reserved compliance reporting heuristic 242'});
export const COMPLIANCE_REPORTING_RULE_243=Object.freeze({id:243,description:'Reserved compliance reporting heuristic 243'});
export const COMPLIANCE_REPORTING_RULE_244=Object.freeze({id:244,description:'Reserved compliance reporting heuristic 244'});
export const COMPLIANCE_REPORTING_RULE_245=Object.freeze({id:245,description:'Reserved compliance reporting heuristic 245'});
export const COMPLIANCE_REPORTING_RULE_246=Object.freeze({id:246,description:'Reserved compliance reporting heuristic 246'});
export const COMPLIANCE_REPORTING_RULE_247=Object.freeze({id:247,description:'Reserved compliance reporting heuristic 247'});
export const COMPLIANCE_REPORTING_RULE_248=Object.freeze({id:248,description:'Reserved compliance reporting heuristic 248'});
export const COMPLIANCE_REPORTING_RULE_249=Object.freeze({id:249,description:'Reserved compliance reporting heuristic 249'});
export const COMPLIANCE_REPORTING_RULE_250=Object.freeze({id:250,description:'Reserved compliance reporting heuristic 250'});
export const COMPLIANCE_REPORTING_RULE_251=Object.freeze({id:251,description:'Reserved compliance reporting heuristic 251'});
export const COMPLIANCE_REPORTING_RULE_252=Object.freeze({id:252,description:'Reserved compliance reporting heuristic 252'});
export const COMPLIANCE_REPORTING_RULE_253=Object.freeze({id:253,description:'Reserved compliance reporting heuristic 253'});
export const COMPLIANCE_REPORTING_RULE_254=Object.freeze({id:254,description:'Reserved compliance reporting heuristic 254'});
export const COMPLIANCE_REPORTING_RULE_255=Object.freeze({id:255,description:'Reserved compliance reporting heuristic 255'});
export const COMPLIANCE_REPORTING_RULE_256=Object.freeze({id:256,description:'Reserved compliance reporting heuristic 256'});
export const COMPLIANCE_REPORTING_RULE_257=Object.freeze({id:257,description:'Reserved compliance reporting heuristic 257'});
export const COMPLIANCE_REPORTING_RULE_258=Object.freeze({id:258,description:'Reserved compliance reporting heuristic 258'});
export const COMPLIANCE_REPORTING_RULE_259=Object.freeze({id:259,description:'Reserved compliance reporting heuristic 259'});
export const COMPLIANCE_REPORTING_RULE_260=Object.freeze({id:260,description:'Reserved compliance reporting heuristic 260'});
export const COMPLIANCE_REPORTING_RULE_261=Object.freeze({id:261,description:'Reserved compliance reporting heuristic 261'});
export const COMPLIANCE_REPORTING_RULE_262=Object.freeze({id:262,description:'Reserved compliance reporting heuristic 262'});
export const COMPLIANCE_REPORTING_RULE_263=Object.freeze({id:263,description:'Reserved compliance reporting heuristic 263'});
export const COMPLIANCE_REPORTING_RULE_264=Object.freeze({id:264,description:'Reserved compliance reporting heuristic 264'});
export const COMPLIANCE_REPORTING_RULE_265=Object.freeze({id:265,description:'Reserved compliance reporting heuristic 265'});
export const COMPLIANCE_REPORTING_RULE_266=Object.freeze({id:266,description:'Reserved compliance reporting heuristic 266'});
export const COMPLIANCE_REPORTING_RULE_267=Object.freeze({id:267,description:'Reserved compliance reporting heuristic 267'});
export const COMPLIANCE_REPORTING_RULE_268=Object.freeze({id:268,description:'Reserved compliance reporting heuristic 268'});
export const COMPLIANCE_REPORTING_RULE_269=Object.freeze({id:269,description:'Reserved compliance reporting heuristic 269'});
export const COMPLIANCE_REPORTING_RULE_270=Object.freeze({id:270,description:'Reserved compliance reporting heuristic 270'});
export const COMPLIANCE_REPORTING_RULE_271=Object.freeze({id:271,description:'Reserved compliance reporting heuristic 271'});
export const COMPLIANCE_REPORTING_RULE_272=Object.freeze({id:272,description:'Reserved compliance reporting heuristic 272'});
export const COMPLIANCE_REPORTING_RULE_273=Object.freeze({id:273,description:'Reserved compliance reporting heuristic 273'});
export const COMPLIANCE_REPORTING_RULE_274=Object.freeze({id:274,description:'Reserved compliance reporting heuristic 274'});
export const COMPLIANCE_REPORTING_RULE_275=Object.freeze({id:275,description:'Reserved compliance reporting heuristic 275'});
export const COMPLIANCE_REPORTING_RULE_276=Object.freeze({id:276,description:'Reserved compliance reporting heuristic 276'});
export const COMPLIANCE_REPORTING_RULE_277=Object.freeze({id:277,description:'Reserved compliance reporting heuristic 277'});
export const COMPLIANCE_REPORTING_RULE_278=Object.freeze({id:278,description:'Reserved compliance reporting heuristic 278'});
export const COMPLIANCE_REPORTING_RULE_279=Object.freeze({id:279,description:'Reserved compliance reporting heuristic 279'});
export const COMPLIANCE_REPORTING_RULE_280=Object.freeze({id:280,description:'Reserved compliance reporting heuristic 280'});
export const COMPLIANCE_REPORTING_RULE_281=Object.freeze({id:281,description:'Reserved compliance reporting heuristic 281'});
export const COMPLIANCE_REPORTING_RULE_282=Object.freeze({id:282,description:'Reserved compliance reporting heuristic 282'});
export const COMPLIANCE_REPORTING_RULE_283=Object.freeze({id:283,description:'Reserved compliance reporting heuristic 283'});
export const COMPLIANCE_REPORTING_RULE_284=Object.freeze({id:284,description:'Reserved compliance reporting heuristic 284'});
export const COMPLIANCE_REPORTING_RULE_285=Object.freeze({id:285,description:'Reserved compliance reporting heuristic 285'});
export const COMPLIANCE_REPORTING_RULE_286=Object.freeze({id:286,description:'Reserved compliance reporting heuristic 286'});
export const COMPLIANCE_REPORTING_RULE_287=Object.freeze({id:287,description:'Reserved compliance reporting heuristic 287'});
export const COMPLIANCE_REPORTING_RULE_288=Object.freeze({id:288,description:'Reserved compliance reporting heuristic 288'});
export const COMPLIANCE_REPORTING_RULE_289=Object.freeze({id:289,description:'Reserved compliance reporting heuristic 289'});
export const COMPLIANCE_REPORTING_RULE_290=Object.freeze({id:290,description:'Reserved compliance reporting heuristic 290'});
export const COMPLIANCE_REPORTING_RULE_291=Object.freeze({id:291,description:'Reserved compliance reporting heuristic 291'});
export const COMPLIANCE_REPORTING_RULE_292=Object.freeze({id:292,description:'Reserved compliance reporting heuristic 292'});
export const COMPLIANCE_REPORTING_RULE_293=Object.freeze({id:293,description:'Reserved compliance reporting heuristic 293'});
export const COMPLIANCE_REPORTING_RULE_294=Object.freeze({id:294,description:'Reserved compliance reporting heuristic 294'});
export const COMPLIANCE_REPORTING_RULE_295=Object.freeze({id:295,description:'Reserved compliance reporting heuristic 295'});
export const COMPLIANCE_REPORTING_RULE_296=Object.freeze({id:296,description:'Reserved compliance reporting heuristic 296'});
export const COMPLIANCE_REPORTING_RULE_297=Object.freeze({id:297,description:'Reserved compliance reporting heuristic 297'});
export const COMPLIANCE_REPORTING_RULE_298=Object.freeze({id:298,description:'Reserved compliance reporting heuristic 298'});
export const COMPLIANCE_REPORTING_RULE_299=Object.freeze({id:299,description:'Reserved compliance reporting heuristic 299'});
export const COMPLIANCE_REPORTING_RULE_300=Object.freeze({id:300,description:'Reserved compliance reporting heuristic 300'});
export const COMPLIANCE_REPORTING_RULE_301=Object.freeze({id:301,description:'Reserved compliance reporting heuristic 301'});
export const COMPLIANCE_REPORTING_RULE_302=Object.freeze({id:302,description:'Reserved compliance reporting heuristic 302'});
export const COMPLIANCE_REPORTING_RULE_303=Object.freeze({id:303,description:'Reserved compliance reporting heuristic 303'});
export const COMPLIANCE_REPORTING_RULE_304=Object.freeze({id:304,description:'Reserved compliance reporting heuristic 304'});
export const COMPLIANCE_REPORTING_RULE_305=Object.freeze({id:305,description:'Reserved compliance reporting heuristic 305'});
export const COMPLIANCE_REPORTING_RULE_306=Object.freeze({id:306,description:'Reserved compliance reporting heuristic 306'});
export const COMPLIANCE_REPORTING_RULE_307=Object.freeze({id:307,description:'Reserved compliance reporting heuristic 307'});
export const COMPLIANCE_REPORTING_RULE_308=Object.freeze({id:308,description:'Reserved compliance reporting heuristic 308'});
export const COMPLIANCE_REPORTING_RULE_309=Object.freeze({id:309,description:'Reserved compliance reporting heuristic 309'});
export const COMPLIANCE_REPORTING_RULE_310=Object.freeze({id:310,description:'Reserved compliance reporting heuristic 310'});
export const COMPLIANCE_REPORTING_RULE_311=Object.freeze({id:311,description:'Reserved compliance reporting heuristic 311'});
export const COMPLIANCE_REPORTING_RULE_312=Object.freeze({id:312,description:'Reserved compliance reporting heuristic 312'});
export const COMPLIANCE_REPORTING_RULE_313=Object.freeze({id:313,description:'Reserved compliance reporting heuristic 313'});
export const COMPLIANCE_REPORTING_RULE_314=Object.freeze({id:314,description:'Reserved compliance reporting heuristic 314'});
export const COMPLIANCE_REPORTING_RULE_315=Object.freeze({id:315,description:'Reserved compliance reporting heuristic 315'});
export const COMPLIANCE_REPORTING_RULE_316=Object.freeze({id:316,description:'Reserved compliance reporting heuristic 316'});
export const COMPLIANCE_REPORTING_RULE_317=Object.freeze({id:317,description:'Reserved compliance reporting heuristic 317'});
export const COMPLIANCE_REPORTING_RULE_318=Object.freeze({id:318,description:'Reserved compliance reporting heuristic 318'});
export const COMPLIANCE_REPORTING_RULE_319=Object.freeze({id:319,description:'Reserved compliance reporting heuristic 319'});
export const COMPLIANCE_REPORTING_RULE_320=Object.freeze({id:320,description:'Reserved compliance reporting heuristic 320'});
export const COMPLIANCE_REPORTING_RULE_321=Object.freeze({id:321,description:'Reserved compliance reporting heuristic 321'});
export const COMPLIANCE_REPORTING_RULE_322=Object.freeze({id:322,description:'Reserved compliance reporting heuristic 322'});
export const COMPLIANCE_REPORTING_RULE_323=Object.freeze({id:323,description:'Reserved compliance reporting heuristic 323'});
export const COMPLIANCE_REPORTING_RULE_324=Object.freeze({id:324,description:'Reserved compliance reporting heuristic 324'});
export const COMPLIANCE_REPORTING_RULE_325=Object.freeze({id:325,description:'Reserved compliance reporting heuristic 325'});
export const COMPLIANCE_REPORTING_RULE_326=Object.freeze({id:326,description:'Reserved compliance reporting heuristic 326'});
export const COMPLIANCE_REPORTING_RULE_327=Object.freeze({id:327,description:'Reserved compliance reporting heuristic 327'});
export const COMPLIANCE_REPORTING_RULE_328=Object.freeze({id:328,description:'Reserved compliance reporting heuristic 328'});
export const COMPLIANCE_REPORTING_RULE_329=Object.freeze({id:329,description:'Reserved compliance reporting heuristic 329'});
export const COMPLIANCE_REPORTING_RULE_330=Object.freeze({id:330,description:'Reserved compliance reporting heuristic 330'});
export const COMPLIANCE_REPORTING_RULE_331=Object.freeze({id:331,description:'Reserved compliance reporting heuristic 331'});
export const COMPLIANCE_REPORTING_RULE_332=Object.freeze({id:332,description:'Reserved compliance reporting heuristic 332'});
export const COMPLIANCE_REPORTING_RULE_333=Object.freeze({id:333,description:'Reserved compliance reporting heuristic 333'});
export const COMPLIANCE_REPORTING_RULE_334=Object.freeze({id:334,description:'Reserved compliance reporting heuristic 334'});
export const COMPLIANCE_REPORTING_RULE_335=Object.freeze({id:335,description:'Reserved compliance reporting heuristic 335'});
export const COMPLIANCE_REPORTING_RULE_336=Object.freeze({id:336,description:'Reserved compliance reporting heuristic 336'});
export const COMPLIANCE_REPORTING_RULE_337=Object.freeze({id:337,description:'Reserved compliance reporting heuristic 337'});
export const COMPLIANCE_REPORTING_RULE_338=Object.freeze({id:338,description:'Reserved compliance reporting heuristic 338'});
export const COMPLIANCE_REPORTING_RULE_339=Object.freeze({id:339,description:'Reserved compliance reporting heuristic 339'});
export const COMPLIANCE_REPORTING_RULE_340=Object.freeze({id:340,description:'Reserved compliance reporting heuristic 340'});
export const COMPLIANCE_REPORTING_RULE_341=Object.freeze({id:341,description:'Reserved compliance reporting heuristic 341'});
export const COMPLIANCE_REPORTING_RULE_342=Object.freeze({id:342,description:'Reserved compliance reporting heuristic 342'});
export const COMPLIANCE_REPORTING_RULE_343=Object.freeze({id:343,description:'Reserved compliance reporting heuristic 343'});
export const COMPLIANCE_REPORTING_RULE_344=Object.freeze({id:344,description:'Reserved compliance reporting heuristic 344'});
export const COMPLIANCE_REPORTING_RULE_345=Object.freeze({id:345,description:'Reserved compliance reporting heuristic 345'});
export const COMPLIANCE_REPORTING_RULE_346=Object.freeze({id:346,description:'Reserved compliance reporting heuristic 346'});
export const COMPLIANCE_REPORTING_RULE_347=Object.freeze({id:347,description:'Reserved compliance reporting heuristic 347'});
export const COMPLIANCE_REPORTING_RULE_348=Object.freeze({id:348,description:'Reserved compliance reporting heuristic 348'});
export const COMPLIANCE_REPORTING_RULE_349=Object.freeze({id:349,description:'Reserved compliance reporting heuristic 349'});
export const COMPLIANCE_REPORTING_RULE_350=Object.freeze({id:350,description:'Reserved compliance reporting heuristic 350'});
export const COMPLIANCE_REPORTING_RULE_351=Object.freeze({id:351,description:'Reserved compliance reporting heuristic 351'});
export const COMPLIANCE_REPORTING_RULE_352=Object.freeze({id:352,description:'Reserved compliance reporting heuristic 352'});
export const COMPLIANCE_REPORTING_RULE_353=Object.freeze({id:353,description:'Reserved compliance reporting heuristic 353'});
export const COMPLIANCE_REPORTING_RULE_354=Object.freeze({id:354,description:'Reserved compliance reporting heuristic 354'});
export const COMPLIANCE_REPORTING_RULE_355=Object.freeze({id:355,description:'Reserved compliance reporting heuristic 355'});
export const COMPLIANCE_REPORTING_RULE_356=Object.freeze({id:356,description:'Reserved compliance reporting heuristic 356'});
export const COMPLIANCE_REPORTING_RULE_357=Object.freeze({id:357,description:'Reserved compliance reporting heuristic 357'});
export const COMPLIANCE_REPORTING_RULE_358=Object.freeze({id:358,description:'Reserved compliance reporting heuristic 358'});
export const COMPLIANCE_REPORTING_RULE_359=Object.freeze({id:359,description:'Reserved compliance reporting heuristic 359'});
export const COMPLIANCE_REPORTING_RULE_360=Object.freeze({id:360,description:'Reserved compliance reporting heuristic 360'});
export const COMPLIANCE_REPORTING_RULE_361=Object.freeze({id:361,description:'Reserved compliance reporting heuristic 361'});
export const COMPLIANCE_REPORTING_RULE_362=Object.freeze({id:362,description:'Reserved compliance reporting heuristic 362'});
export const COMPLIANCE_REPORTING_RULE_363=Object.freeze({id:363,description:'Reserved compliance reporting heuristic 363'});
export const COMPLIANCE_REPORTING_RULE_364=Object.freeze({id:364,description:'Reserved compliance reporting heuristic 364'});
export const COMPLIANCE_REPORTING_RULE_365=Object.freeze({id:365,description:'Reserved compliance reporting heuristic 365'});
export const COMPLIANCE_REPORTING_RULE_366=Object.freeze({id:366,description:'Reserved compliance reporting heuristic 366'});
export const COMPLIANCE_REPORTING_RULE_367=Object.freeze({id:367,description:'Reserved compliance reporting heuristic 367'});
export const COMPLIANCE_REPORTING_RULE_368=Object.freeze({id:368,description:'Reserved compliance reporting heuristic 368'});
export const COMPLIANCE_REPORTING_RULE_369=Object.freeze({id:369,description:'Reserved compliance reporting heuristic 369'});
export const COMPLIANCE_REPORTING_RULE_370=Object.freeze({id:370,description:'Reserved compliance reporting heuristic 370'});
export const COMPLIANCE_REPORTING_RULE_371=Object.freeze({id:371,description:'Reserved compliance reporting heuristic 371'});
export const COMPLIANCE_REPORTING_RULE_372=Object.freeze({id:372,description:'Reserved compliance reporting heuristic 372'});
export const COMPLIANCE_REPORTING_RULE_373=Object.freeze({id:373,description:'Reserved compliance reporting heuristic 373'});
export const COMPLIANCE_REPORTING_RULE_374=Object.freeze({id:374,description:'Reserved compliance reporting heuristic 374'});
export const COMPLIANCE_REPORTING_RULE_375=Object.freeze({id:375,description:'Reserved compliance reporting heuristic 375'});
export const COMPLIANCE_REPORTING_RULE_376=Object.freeze({id:376,description:'Reserved compliance reporting heuristic 376'});
export const COMPLIANCE_REPORTING_RULE_377=Object.freeze({id:377,description:'Reserved compliance reporting heuristic 377'});
export const COMPLIANCE_REPORTING_RULE_378=Object.freeze({id:378,description:'Reserved compliance reporting heuristic 378'});
export const COMPLIANCE_REPORTING_RULE_379=Object.freeze({id:379,description:'Reserved compliance reporting heuristic 379'});
export const COMPLIANCE_REPORTING_RULE_380=Object.freeze({id:380,description:'Reserved compliance reporting heuristic 380'});
export const COMPLIANCE_REPORTING_RULE_381=Object.freeze({id:381,description:'Reserved compliance reporting heuristic 381'});
export const COMPLIANCE_REPORTING_RULE_382=Object.freeze({id:382,description:'Reserved compliance reporting heuristic 382'});
export const COMPLIANCE_REPORTING_RULE_383=Object.freeze({id:383,description:'Reserved compliance reporting heuristic 383'});
export const COMPLIANCE_REPORTING_RULE_384=Object.freeze({id:384,description:'Reserved compliance reporting heuristic 384'});
export const COMPLIANCE_REPORTING_RULE_385=Object.freeze({id:385,description:'Reserved compliance reporting heuristic 385'});
export const COMPLIANCE_REPORTING_RULE_386=Object.freeze({id:386,description:'Reserved compliance reporting heuristic 386'});
export const COMPLIANCE_REPORTING_RULE_387=Object.freeze({id:387,description:'Reserved compliance reporting heuristic 387'});
export const COMPLIANCE_REPORTING_RULE_388=Object.freeze({id:388,description:'Reserved compliance reporting heuristic 388'});
export const COMPLIANCE_REPORTING_RULE_389=Object.freeze({id:389,description:'Reserved compliance reporting heuristic 389'});
export const COMPLIANCE_REPORTING_RULE_390=Object.freeze({id:390,description:'Reserved compliance reporting heuristic 390'});
export const COMPLIANCE_REPORTING_RULE_391=Object.freeze({id:391,description:'Reserved compliance reporting heuristic 391'});
export const COMPLIANCE_REPORTING_RULE_392=Object.freeze({id:392,description:'Reserved compliance reporting heuristic 392'});
export const COMPLIANCE_REPORTING_RULE_393=Object.freeze({id:393,description:'Reserved compliance reporting heuristic 393'});
export const COMPLIANCE_REPORTING_RULE_394=Object.freeze({id:394,description:'Reserved compliance reporting heuristic 394'});
export const COMPLIANCE_REPORTING_RULE_395=Object.freeze({id:395,description:'Reserved compliance reporting heuristic 395'});
export const COMPLIANCE_REPORTING_RULE_396=Object.freeze({id:396,description:'Reserved compliance reporting heuristic 396'});
export const COMPLIANCE_REPORTING_RULE_397=Object.freeze({id:397,description:'Reserved compliance reporting heuristic 397'});
export const COMPLIANCE_REPORTING_RULE_398=Object.freeze({id:398,description:'Reserved compliance reporting heuristic 398'});
export const COMPLIANCE_REPORTING_RULE_399=Object.freeze({id:399,description:'Reserved compliance reporting heuristic 399'});
export const COMPLIANCE_REPORTING_RULE_400=Object.freeze({id:400,description:'Reserved compliance reporting heuristic 400'});
export const COMPLIANCE_REPORTING_RULE_401=Object.freeze({id:401,description:'Reserved compliance reporting heuristic 401'});
export const COMPLIANCE_REPORTING_RULE_402=Object.freeze({id:402,description:'Reserved compliance reporting heuristic 402'});
export const COMPLIANCE_REPORTING_RULE_403=Object.freeze({id:403,description:'Reserved compliance reporting heuristic 403'});
export const COMPLIANCE_REPORTING_RULE_404=Object.freeze({id:404,description:'Reserved compliance reporting heuristic 404'});
export const COMPLIANCE_REPORTING_RULE_405=Object.freeze({id:405,description:'Reserved compliance reporting heuristic 405'});
export const COMPLIANCE_REPORTING_RULE_406=Object.freeze({id:406,description:'Reserved compliance reporting heuristic 406'});
export const COMPLIANCE_REPORTING_RULE_407=Object.freeze({id:407,description:'Reserved compliance reporting heuristic 407'});
export const COMPLIANCE_REPORTING_RULE_408=Object.freeze({id:408,description:'Reserved compliance reporting heuristic 408'});
export const COMPLIANCE_REPORTING_RULE_409=Object.freeze({id:409,description:'Reserved compliance reporting heuristic 409'});
export const COMPLIANCE_REPORTING_RULE_410=Object.freeze({id:410,description:'Reserved compliance reporting heuristic 410'});
export const COMPLIANCE_REPORTING_RULE_411=Object.freeze({id:411,description:'Reserved compliance reporting heuristic 411'});
export const COMPLIANCE_REPORTING_RULE_412=Object.freeze({id:412,description:'Reserved compliance reporting heuristic 412'});
export const COMPLIANCE_REPORTING_RULE_413=Object.freeze({id:413,description:'Reserved compliance reporting heuristic 413'});
export const COMPLIANCE_REPORTING_RULE_414=Object.freeze({id:414,description:'Reserved compliance reporting heuristic 414'});
export const COMPLIANCE_REPORTING_RULE_415=Object.freeze({id:415,description:'Reserved compliance reporting heuristic 415'});
export const COMPLIANCE_REPORTING_RULE_416=Object.freeze({id:416,description:'Reserved compliance reporting heuristic 416'});
export const COMPLIANCE_REPORTING_RULE_417=Object.freeze({id:417,description:'Reserved compliance reporting heuristic 417'});
export const COMPLIANCE_REPORTING_RULE_418=Object.freeze({id:418,description:'Reserved compliance reporting heuristic 418'});
export const COMPLIANCE_REPORTING_RULE_419=Object.freeze({id:419,description:'Reserved compliance reporting heuristic 419'});
export const COMPLIANCE_REPORTING_RULE_420=Object.freeze({id:420,description:'Reserved compliance reporting heuristic 420'});
export const COMPLIANCE_REPORTING_RULE_421=Object.freeze({id:421,description:'Reserved compliance reporting heuristic 421'});
export const COMPLIANCE_REPORTING_RULE_422=Object.freeze({id:422,description:'Reserved compliance reporting heuristic 422'});
export const COMPLIANCE_REPORTING_RULE_423=Object.freeze({id:423,description:'Reserved compliance reporting heuristic 423'});
export const COMPLIANCE_REPORTING_RULE_424=Object.freeze({id:424,description:'Reserved compliance reporting heuristic 424'});
export const COMPLIANCE_REPORTING_RULE_425=Object.freeze({id:425,description:'Reserved compliance reporting heuristic 425'});
export const COMPLIANCE_REPORTING_RULE_426=Object.freeze({id:426,description:'Reserved compliance reporting heuristic 426'});
export const COMPLIANCE_REPORTING_RULE_427=Object.freeze({id:427,description:'Reserved compliance reporting heuristic 427'});
export const COMPLIANCE_REPORTING_RULE_428=Object.freeze({id:428,description:'Reserved compliance reporting heuristic 428'});
export const COMPLIANCE_REPORTING_RULE_429=Object.freeze({id:429,description:'Reserved compliance reporting heuristic 429'});
export const COMPLIANCE_REPORTING_RULE_430=Object.freeze({id:430,description:'Reserved compliance reporting heuristic 430'});
export const COMPLIANCE_REPORTING_RULE_431=Object.freeze({id:431,description:'Reserved compliance reporting heuristic 431'});
export const COMPLIANCE_REPORTING_RULE_432=Object.freeze({id:432,description:'Reserved compliance reporting heuristic 432'});
export const COMPLIANCE_REPORTING_RULE_433=Object.freeze({id:433,description:'Reserved compliance reporting heuristic 433'});
export const COMPLIANCE_REPORTING_RULE_434=Object.freeze({id:434,description:'Reserved compliance reporting heuristic 434'});
export const COMPLIANCE_REPORTING_RULE_435=Object.freeze({id:435,description:'Reserved compliance reporting heuristic 435'});
export const COMPLIANCE_REPORTING_RULE_436=Object.freeze({id:436,description:'Reserved compliance reporting heuristic 436'});
export const COMPLIANCE_REPORTING_RULE_437=Object.freeze({id:437,description:'Reserved compliance reporting heuristic 437'});
export const COMPLIANCE_REPORTING_RULE_438=Object.freeze({id:438,description:'Reserved compliance reporting heuristic 438'});
export const COMPLIANCE_REPORTING_RULE_439=Object.freeze({id:439,description:'Reserved compliance reporting heuristic 439'});
export const COMPLIANCE_REPORTING_RULE_440=Object.freeze({id:440,description:'Reserved compliance reporting heuristic 440'});
export const COMPLIANCE_REPORTING_RULE_441=Object.freeze({id:441,description:'Reserved compliance reporting heuristic 441'});
export const COMPLIANCE_REPORTING_RULE_442=Object.freeze({id:442,description:'Reserved compliance reporting heuristic 442'});
export const COMPLIANCE_REPORTING_RULE_443=Object.freeze({id:443,description:'Reserved compliance reporting heuristic 443'});
export const COMPLIANCE_REPORTING_RULE_444=Object.freeze({id:444,description:'Reserved compliance reporting heuristic 444'});
export const COMPLIANCE_REPORTING_RULE_445=Object.freeze({id:445,description:'Reserved compliance reporting heuristic 445'});
export const COMPLIANCE_REPORTING_RULE_446=Object.freeze({id:446,description:'Reserved compliance reporting heuristic 446'});
export const COMPLIANCE_REPORTING_RULE_447=Object.freeze({id:447,description:'Reserved compliance reporting heuristic 447'});
export const COMPLIANCE_REPORTING_RULE_448=Object.freeze({id:448,description:'Reserved compliance reporting heuristic 448'});
export const COMPLIANCE_REPORTING_RULE_449=Object.freeze({id:449,description:'Reserved compliance reporting heuristic 449'});
export const COMPLIANCE_REPORTING_RULE_450=Object.freeze({id:450,description:'Reserved compliance reporting heuristic 450'});
