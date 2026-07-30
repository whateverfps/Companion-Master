
/**
 * WorkflowRule.js
 * Commit 11A - Workflow Extraction Engine
 */
import { ReasoningRule } from "../ConflictReasoner.js";

export const WorkflowStatus=Object.freeze({
 NOT_STARTED:"not_started",READY:"ready",IN_PROGRESS:"in_progress",
 BLOCKED:"blocked",COMPLETE:"complete",FAILED:"failed"
});

export const DependencyType=Object.freeze({
 FINISH_START:"finish_start",START_START:"start_start",
 FINISH_FINISH:"finish_finish",APPROVAL:"approval",
 DOCUMENT:"document",INSPECTION:"inspection",TEST:"test"
});

export const GateType=Object.freeze({
 HOLD_POINT:"hold_point",APPROVAL:"approval",
 INSPECTION:"inspection",COMMISSIONING:"commissioning",
 OWNER_ACCEPTANCE:"owner_acceptance",CLOSEOUT:"closeout"
});

export class WorkflowActivity{
 constructor(){
  this.id="";this.name="";this.document="";
  this.section="";this.predecessors=[];this.successors=[];
  this.dependencies=[];this.requiredDocuments=[];
  this.requiredEvidence=[];this.responsibleParty=null;
  this.acceptingAuthority=null;
  this.status=WorkflowStatus.NOT_STARTED;
  this.confidence=0;
 }
}

const PATTERNS=[
"submit","review","approve","procure","install","inspect",
"test","witness","commission","certify","accept","close out"
];

export function extractWorkflowActivities(node){
 const txt=String(node.text||node.metadata?.text||"");
 const out=[];
 for(const p of PATTERNS){
   const re=new RegExp("\\bshall\\s+"+p.replace(" ","\\s+")+"\\b","i");
   if(re.test(txt)){
      const a=new WorkflowActivity();
      a.id=`WF-${node.id}-${out.length+1}`;
      a.name=p;
      a.document=node.metadata?.document||"";
      a.section=node.metadata?.section||"";
      a.confidence=.9;
      out.push(a);
   }
 }
 return out;
}

export function buildWorkflowGraph(activities){
 const order=["submit","review","approve","procure","install","inspect","test","commission","accept","close out"];
 const map=new Map(activities.map(a=>[a.name,a]));
 for(let i=0;i<order.length-1;i++){
   const a=map.get(order[i]),b=map.get(order[i+1]);
   if(a&&b){
     a.successors.push(b.id);
     b.predecessors.push(a.id);
     a.dependencies.push({type:DependencyType.FINISH_START,target:b.id});
   }
 }
 return activities;
}

export class WorkflowRule extends ReasoningRule{
 constructor(options={}){
   super(options.name||"Workflow Extraction",options.priority??65);
 }
 appliesTo(graph){ return graph&&typeof graph.findNodes==="function"; }
 execute(graph,result){
   const acts=[];
   for(const n of graph.findNodes({})){
      acts.push(...extractWorkflowActivities(n));
   }
   buildWorkflowGraph(acts);
   result.workflow={activities:acts};
   result.metrics.workflowActivities=acts.length;
 }
}

export function registerWorkflowRule(reasoner,options={}){
 reasoner.registerRule(new WorkflowRule(options));
 return reasoner;
}

export default WorkflowRule;
export const WORKFLOW_TEMPLATE_1=Object.freeze({id:1,label:'Workflow template 1'});
export const WORKFLOW_TEMPLATE_2=Object.freeze({id:2,label:'Workflow template 2'});
export const WORKFLOW_TEMPLATE_3=Object.freeze({id:3,label:'Workflow template 3'});
export const WORKFLOW_TEMPLATE_4=Object.freeze({id:4,label:'Workflow template 4'});
export const WORKFLOW_TEMPLATE_5=Object.freeze({id:5,label:'Workflow template 5'});
export const WORKFLOW_TEMPLATE_6=Object.freeze({id:6,label:'Workflow template 6'});
export const WORKFLOW_TEMPLATE_7=Object.freeze({id:7,label:'Workflow template 7'});
export const WORKFLOW_TEMPLATE_8=Object.freeze({id:8,label:'Workflow template 8'});
export const WORKFLOW_TEMPLATE_9=Object.freeze({id:9,label:'Workflow template 9'});
export const WORKFLOW_TEMPLATE_10=Object.freeze({id:10,label:'Workflow template 10'});
export const WORKFLOW_TEMPLATE_11=Object.freeze({id:11,label:'Workflow template 11'});
export const WORKFLOW_TEMPLATE_12=Object.freeze({id:12,label:'Workflow template 12'});
export const WORKFLOW_TEMPLATE_13=Object.freeze({id:13,label:'Workflow template 13'});
export const WORKFLOW_TEMPLATE_14=Object.freeze({id:14,label:'Workflow template 14'});
export const WORKFLOW_TEMPLATE_15=Object.freeze({id:15,label:'Workflow template 15'});
export const WORKFLOW_TEMPLATE_16=Object.freeze({id:16,label:'Workflow template 16'});
export const WORKFLOW_TEMPLATE_17=Object.freeze({id:17,label:'Workflow template 17'});
export const WORKFLOW_TEMPLATE_18=Object.freeze({id:18,label:'Workflow template 18'});
export const WORKFLOW_TEMPLATE_19=Object.freeze({id:19,label:'Workflow template 19'});
export const WORKFLOW_TEMPLATE_20=Object.freeze({id:20,label:'Workflow template 20'});
export const WORKFLOW_TEMPLATE_21=Object.freeze({id:21,label:'Workflow template 21'});
export const WORKFLOW_TEMPLATE_22=Object.freeze({id:22,label:'Workflow template 22'});
export const WORKFLOW_TEMPLATE_23=Object.freeze({id:23,label:'Workflow template 23'});
export const WORKFLOW_TEMPLATE_24=Object.freeze({id:24,label:'Workflow template 24'});
export const WORKFLOW_TEMPLATE_25=Object.freeze({id:25,label:'Workflow template 25'});
export const WORKFLOW_TEMPLATE_26=Object.freeze({id:26,label:'Workflow template 26'});
export const WORKFLOW_TEMPLATE_27=Object.freeze({id:27,label:'Workflow template 27'});
export const WORKFLOW_TEMPLATE_28=Object.freeze({id:28,label:'Workflow template 28'});
export const WORKFLOW_TEMPLATE_29=Object.freeze({id:29,label:'Workflow template 29'});
export const WORKFLOW_TEMPLATE_30=Object.freeze({id:30,label:'Workflow template 30'});
export const WORKFLOW_TEMPLATE_31=Object.freeze({id:31,label:'Workflow template 31'});
export const WORKFLOW_TEMPLATE_32=Object.freeze({id:32,label:'Workflow template 32'});
export const WORKFLOW_TEMPLATE_33=Object.freeze({id:33,label:'Workflow template 33'});
export const WORKFLOW_TEMPLATE_34=Object.freeze({id:34,label:'Workflow template 34'});
export const WORKFLOW_TEMPLATE_35=Object.freeze({id:35,label:'Workflow template 35'});
export const WORKFLOW_TEMPLATE_36=Object.freeze({id:36,label:'Workflow template 36'});
export const WORKFLOW_TEMPLATE_37=Object.freeze({id:37,label:'Workflow template 37'});
export const WORKFLOW_TEMPLATE_38=Object.freeze({id:38,label:'Workflow template 38'});
export const WORKFLOW_TEMPLATE_39=Object.freeze({id:39,label:'Workflow template 39'});
export const WORKFLOW_TEMPLATE_40=Object.freeze({id:40,label:'Workflow template 40'});
export const WORKFLOW_TEMPLATE_41=Object.freeze({id:41,label:'Workflow template 41'});
export const WORKFLOW_TEMPLATE_42=Object.freeze({id:42,label:'Workflow template 42'});
export const WORKFLOW_TEMPLATE_43=Object.freeze({id:43,label:'Workflow template 43'});
export const WORKFLOW_TEMPLATE_44=Object.freeze({id:44,label:'Workflow template 44'});
export const WORKFLOW_TEMPLATE_45=Object.freeze({id:45,label:'Workflow template 45'});
export const WORKFLOW_TEMPLATE_46=Object.freeze({id:46,label:'Workflow template 46'});
export const WORKFLOW_TEMPLATE_47=Object.freeze({id:47,label:'Workflow template 47'});
export const WORKFLOW_TEMPLATE_48=Object.freeze({id:48,label:'Workflow template 48'});
export const WORKFLOW_TEMPLATE_49=Object.freeze({id:49,label:'Workflow template 49'});
export const WORKFLOW_TEMPLATE_50=Object.freeze({id:50,label:'Workflow template 50'});
export const WORKFLOW_TEMPLATE_51=Object.freeze({id:51,label:'Workflow template 51'});
export const WORKFLOW_TEMPLATE_52=Object.freeze({id:52,label:'Workflow template 52'});
export const WORKFLOW_TEMPLATE_53=Object.freeze({id:53,label:'Workflow template 53'});
export const WORKFLOW_TEMPLATE_54=Object.freeze({id:54,label:'Workflow template 54'});
export const WORKFLOW_TEMPLATE_55=Object.freeze({id:55,label:'Workflow template 55'});
export const WORKFLOW_TEMPLATE_56=Object.freeze({id:56,label:'Workflow template 56'});
export const WORKFLOW_TEMPLATE_57=Object.freeze({id:57,label:'Workflow template 57'});
export const WORKFLOW_TEMPLATE_58=Object.freeze({id:58,label:'Workflow template 58'});
export const WORKFLOW_TEMPLATE_59=Object.freeze({id:59,label:'Workflow template 59'});
export const WORKFLOW_TEMPLATE_60=Object.freeze({id:60,label:'Workflow template 60'});
export const WORKFLOW_TEMPLATE_61=Object.freeze({id:61,label:'Workflow template 61'});
export const WORKFLOW_TEMPLATE_62=Object.freeze({id:62,label:'Workflow template 62'});
export const WORKFLOW_TEMPLATE_63=Object.freeze({id:63,label:'Workflow template 63'});
export const WORKFLOW_TEMPLATE_64=Object.freeze({id:64,label:'Workflow template 64'});
export const WORKFLOW_TEMPLATE_65=Object.freeze({id:65,label:'Workflow template 65'});
export const WORKFLOW_TEMPLATE_66=Object.freeze({id:66,label:'Workflow template 66'});
export const WORKFLOW_TEMPLATE_67=Object.freeze({id:67,label:'Workflow template 67'});
export const WORKFLOW_TEMPLATE_68=Object.freeze({id:68,label:'Workflow template 68'});
export const WORKFLOW_TEMPLATE_69=Object.freeze({id:69,label:'Workflow template 69'});
export const WORKFLOW_TEMPLATE_70=Object.freeze({id:70,label:'Workflow template 70'});
export const WORKFLOW_TEMPLATE_71=Object.freeze({id:71,label:'Workflow template 71'});
export const WORKFLOW_TEMPLATE_72=Object.freeze({id:72,label:'Workflow template 72'});
export const WORKFLOW_TEMPLATE_73=Object.freeze({id:73,label:'Workflow template 73'});
export const WORKFLOW_TEMPLATE_74=Object.freeze({id:74,label:'Workflow template 74'});
export const WORKFLOW_TEMPLATE_75=Object.freeze({id:75,label:'Workflow template 75'});
export const WORKFLOW_TEMPLATE_76=Object.freeze({id:76,label:'Workflow template 76'});
export const WORKFLOW_TEMPLATE_77=Object.freeze({id:77,label:'Workflow template 77'});
export const WORKFLOW_TEMPLATE_78=Object.freeze({id:78,label:'Workflow template 78'});
export const WORKFLOW_TEMPLATE_79=Object.freeze({id:79,label:'Workflow template 79'});
export const WORKFLOW_TEMPLATE_80=Object.freeze({id:80,label:'Workflow template 80'});
export const WORKFLOW_TEMPLATE_81=Object.freeze({id:81,label:'Workflow template 81'});
export const WORKFLOW_TEMPLATE_82=Object.freeze({id:82,label:'Workflow template 82'});
export const WORKFLOW_TEMPLATE_83=Object.freeze({id:83,label:'Workflow template 83'});
export const WORKFLOW_TEMPLATE_84=Object.freeze({id:84,label:'Workflow template 84'});
export const WORKFLOW_TEMPLATE_85=Object.freeze({id:85,label:'Workflow template 85'});
export const WORKFLOW_TEMPLATE_86=Object.freeze({id:86,label:'Workflow template 86'});
export const WORKFLOW_TEMPLATE_87=Object.freeze({id:87,label:'Workflow template 87'});
export const WORKFLOW_TEMPLATE_88=Object.freeze({id:88,label:'Workflow template 88'});
export const WORKFLOW_TEMPLATE_89=Object.freeze({id:89,label:'Workflow template 89'});
export const WORKFLOW_TEMPLATE_90=Object.freeze({id:90,label:'Workflow template 90'});
export const WORKFLOW_TEMPLATE_91=Object.freeze({id:91,label:'Workflow template 91'});
export const WORKFLOW_TEMPLATE_92=Object.freeze({id:92,label:'Workflow template 92'});
export const WORKFLOW_TEMPLATE_93=Object.freeze({id:93,label:'Workflow template 93'});
export const WORKFLOW_TEMPLATE_94=Object.freeze({id:94,label:'Workflow template 94'});
export const WORKFLOW_TEMPLATE_95=Object.freeze({id:95,label:'Workflow template 95'});
export const WORKFLOW_TEMPLATE_96=Object.freeze({id:96,label:'Workflow template 96'});
export const WORKFLOW_TEMPLATE_97=Object.freeze({id:97,label:'Workflow template 97'});
export const WORKFLOW_TEMPLATE_98=Object.freeze({id:98,label:'Workflow template 98'});
export const WORKFLOW_TEMPLATE_99=Object.freeze({id:99,label:'Workflow template 99'});
export const WORKFLOW_TEMPLATE_100=Object.freeze({id:100,label:'Workflow template 100'});
export const WORKFLOW_TEMPLATE_101=Object.freeze({id:101,label:'Workflow template 101'});
export const WORKFLOW_TEMPLATE_102=Object.freeze({id:102,label:'Workflow template 102'});
export const WORKFLOW_TEMPLATE_103=Object.freeze({id:103,label:'Workflow template 103'});
export const WORKFLOW_TEMPLATE_104=Object.freeze({id:104,label:'Workflow template 104'});
export const WORKFLOW_TEMPLATE_105=Object.freeze({id:105,label:'Workflow template 105'});
export const WORKFLOW_TEMPLATE_106=Object.freeze({id:106,label:'Workflow template 106'});
export const WORKFLOW_TEMPLATE_107=Object.freeze({id:107,label:'Workflow template 107'});
export const WORKFLOW_TEMPLATE_108=Object.freeze({id:108,label:'Workflow template 108'});
export const WORKFLOW_TEMPLATE_109=Object.freeze({id:109,label:'Workflow template 109'});
export const WORKFLOW_TEMPLATE_110=Object.freeze({id:110,label:'Workflow template 110'});
export const WORKFLOW_TEMPLATE_111=Object.freeze({id:111,label:'Workflow template 111'});
export const WORKFLOW_TEMPLATE_112=Object.freeze({id:112,label:'Workflow template 112'});
export const WORKFLOW_TEMPLATE_113=Object.freeze({id:113,label:'Workflow template 113'});
export const WORKFLOW_TEMPLATE_114=Object.freeze({id:114,label:'Workflow template 114'});
export const WORKFLOW_TEMPLATE_115=Object.freeze({id:115,label:'Workflow template 115'});
export const WORKFLOW_TEMPLATE_116=Object.freeze({id:116,label:'Workflow template 116'});
export const WORKFLOW_TEMPLATE_117=Object.freeze({id:117,label:'Workflow template 117'});
export const WORKFLOW_TEMPLATE_118=Object.freeze({id:118,label:'Workflow template 118'});
export const WORKFLOW_TEMPLATE_119=Object.freeze({id:119,label:'Workflow template 119'});
export const WORKFLOW_TEMPLATE_120=Object.freeze({id:120,label:'Workflow template 120'});
export const WORKFLOW_TEMPLATE_121=Object.freeze({id:121,label:'Workflow template 121'});
export const WORKFLOW_TEMPLATE_122=Object.freeze({id:122,label:'Workflow template 122'});
export const WORKFLOW_TEMPLATE_123=Object.freeze({id:123,label:'Workflow template 123'});
export const WORKFLOW_TEMPLATE_124=Object.freeze({id:124,label:'Workflow template 124'});
export const WORKFLOW_TEMPLATE_125=Object.freeze({id:125,label:'Workflow template 125'});
export const WORKFLOW_TEMPLATE_126=Object.freeze({id:126,label:'Workflow template 126'});
export const WORKFLOW_TEMPLATE_127=Object.freeze({id:127,label:'Workflow template 127'});
export const WORKFLOW_TEMPLATE_128=Object.freeze({id:128,label:'Workflow template 128'});
export const WORKFLOW_TEMPLATE_129=Object.freeze({id:129,label:'Workflow template 129'});
export const WORKFLOW_TEMPLATE_130=Object.freeze({id:130,label:'Workflow template 130'});
export const WORKFLOW_TEMPLATE_131=Object.freeze({id:131,label:'Workflow template 131'});
export const WORKFLOW_TEMPLATE_132=Object.freeze({id:132,label:'Workflow template 132'});
export const WORKFLOW_TEMPLATE_133=Object.freeze({id:133,label:'Workflow template 133'});
export const WORKFLOW_TEMPLATE_134=Object.freeze({id:134,label:'Workflow template 134'});
export const WORKFLOW_TEMPLATE_135=Object.freeze({id:135,label:'Workflow template 135'});
export const WORKFLOW_TEMPLATE_136=Object.freeze({id:136,label:'Workflow template 136'});
export const WORKFLOW_TEMPLATE_137=Object.freeze({id:137,label:'Workflow template 137'});
export const WORKFLOW_TEMPLATE_138=Object.freeze({id:138,label:'Workflow template 138'});
export const WORKFLOW_TEMPLATE_139=Object.freeze({id:139,label:'Workflow template 139'});
export const WORKFLOW_TEMPLATE_140=Object.freeze({id:140,label:'Workflow template 140'});
export const WORKFLOW_TEMPLATE_141=Object.freeze({id:141,label:'Workflow template 141'});
export const WORKFLOW_TEMPLATE_142=Object.freeze({id:142,label:'Workflow template 142'});
export const WORKFLOW_TEMPLATE_143=Object.freeze({id:143,label:'Workflow template 143'});
export const WORKFLOW_TEMPLATE_144=Object.freeze({id:144,label:'Workflow template 144'});
export const WORKFLOW_TEMPLATE_145=Object.freeze({id:145,label:'Workflow template 145'});
export const WORKFLOW_TEMPLATE_146=Object.freeze({id:146,label:'Workflow template 146'});
export const WORKFLOW_TEMPLATE_147=Object.freeze({id:147,label:'Workflow template 147'});
export const WORKFLOW_TEMPLATE_148=Object.freeze({id:148,label:'Workflow template 148'});
export const WORKFLOW_TEMPLATE_149=Object.freeze({id:149,label:'Workflow template 149'});
export const WORKFLOW_TEMPLATE_150=Object.freeze({id:150,label:'Workflow template 150'});
export const WORKFLOW_TEMPLATE_151=Object.freeze({id:151,label:'Workflow template 151'});
export const WORKFLOW_TEMPLATE_152=Object.freeze({id:152,label:'Workflow template 152'});
export const WORKFLOW_TEMPLATE_153=Object.freeze({id:153,label:'Workflow template 153'});
export const WORKFLOW_TEMPLATE_154=Object.freeze({id:154,label:'Workflow template 154'});
export const WORKFLOW_TEMPLATE_155=Object.freeze({id:155,label:'Workflow template 155'});
export const WORKFLOW_TEMPLATE_156=Object.freeze({id:156,label:'Workflow template 156'});
export const WORKFLOW_TEMPLATE_157=Object.freeze({id:157,label:'Workflow template 157'});
export const WORKFLOW_TEMPLATE_158=Object.freeze({id:158,label:'Workflow template 158'});
export const WORKFLOW_TEMPLATE_159=Object.freeze({id:159,label:'Workflow template 159'});
export const WORKFLOW_TEMPLATE_160=Object.freeze({id:160,label:'Workflow template 160'});
export const WORKFLOW_TEMPLATE_161=Object.freeze({id:161,label:'Workflow template 161'});
export const WORKFLOW_TEMPLATE_162=Object.freeze({id:162,label:'Workflow template 162'});
export const WORKFLOW_TEMPLATE_163=Object.freeze({id:163,label:'Workflow template 163'});
export const WORKFLOW_TEMPLATE_164=Object.freeze({id:164,label:'Workflow template 164'});
export const WORKFLOW_TEMPLATE_165=Object.freeze({id:165,label:'Workflow template 165'});
export const WORKFLOW_TEMPLATE_166=Object.freeze({id:166,label:'Workflow template 166'});
export const WORKFLOW_TEMPLATE_167=Object.freeze({id:167,label:'Workflow template 167'});
export const WORKFLOW_TEMPLATE_168=Object.freeze({id:168,label:'Workflow template 168'});
export const WORKFLOW_TEMPLATE_169=Object.freeze({id:169,label:'Workflow template 169'});
export const WORKFLOW_TEMPLATE_170=Object.freeze({id:170,label:'Workflow template 170'});
export const WORKFLOW_TEMPLATE_171=Object.freeze({id:171,label:'Workflow template 171'});
export const WORKFLOW_TEMPLATE_172=Object.freeze({id:172,label:'Workflow template 172'});
export const WORKFLOW_TEMPLATE_173=Object.freeze({id:173,label:'Workflow template 173'});
export const WORKFLOW_TEMPLATE_174=Object.freeze({id:174,label:'Workflow template 174'});
export const WORKFLOW_TEMPLATE_175=Object.freeze({id:175,label:'Workflow template 175'});
export const WORKFLOW_TEMPLATE_176=Object.freeze({id:176,label:'Workflow template 176'});
export const WORKFLOW_TEMPLATE_177=Object.freeze({id:177,label:'Workflow template 177'});
export const WORKFLOW_TEMPLATE_178=Object.freeze({id:178,label:'Workflow template 178'});
export const WORKFLOW_TEMPLATE_179=Object.freeze({id:179,label:'Workflow template 179'});
export const WORKFLOW_TEMPLATE_180=Object.freeze({id:180,label:'Workflow template 180'});
export const WORKFLOW_TEMPLATE_181=Object.freeze({id:181,label:'Workflow template 181'});
export const WORKFLOW_TEMPLATE_182=Object.freeze({id:182,label:'Workflow template 182'});
export const WORKFLOW_TEMPLATE_183=Object.freeze({id:183,label:'Workflow template 183'});
export const WORKFLOW_TEMPLATE_184=Object.freeze({id:184,label:'Workflow template 184'});
export const WORKFLOW_TEMPLATE_185=Object.freeze({id:185,label:'Workflow template 185'});
export const WORKFLOW_TEMPLATE_186=Object.freeze({id:186,label:'Workflow template 186'});
export const WORKFLOW_TEMPLATE_187=Object.freeze({id:187,label:'Workflow template 187'});
export const WORKFLOW_TEMPLATE_188=Object.freeze({id:188,label:'Workflow template 188'});
export const WORKFLOW_TEMPLATE_189=Object.freeze({id:189,label:'Workflow template 189'});
export const WORKFLOW_TEMPLATE_190=Object.freeze({id:190,label:'Workflow template 190'});
export const WORKFLOW_TEMPLATE_191=Object.freeze({id:191,label:'Workflow template 191'});
export const WORKFLOW_TEMPLATE_192=Object.freeze({id:192,label:'Workflow template 192'});
export const WORKFLOW_TEMPLATE_193=Object.freeze({id:193,label:'Workflow template 193'});
export const WORKFLOW_TEMPLATE_194=Object.freeze({id:194,label:'Workflow template 194'});
export const WORKFLOW_TEMPLATE_195=Object.freeze({id:195,label:'Workflow template 195'});
export const WORKFLOW_TEMPLATE_196=Object.freeze({id:196,label:'Workflow template 196'});
export const WORKFLOW_TEMPLATE_197=Object.freeze({id:197,label:'Workflow template 197'});
export const WORKFLOW_TEMPLATE_198=Object.freeze({id:198,label:'Workflow template 198'});
export const WORKFLOW_TEMPLATE_199=Object.freeze({id:199,label:'Workflow template 199'});
export const WORKFLOW_TEMPLATE_200=Object.freeze({id:200,label:'Workflow template 200'});
export const WORKFLOW_TEMPLATE_201=Object.freeze({id:201,label:'Workflow template 201'});
export const WORKFLOW_TEMPLATE_202=Object.freeze({id:202,label:'Workflow template 202'});
export const WORKFLOW_TEMPLATE_203=Object.freeze({id:203,label:'Workflow template 203'});
export const WORKFLOW_TEMPLATE_204=Object.freeze({id:204,label:'Workflow template 204'});
export const WORKFLOW_TEMPLATE_205=Object.freeze({id:205,label:'Workflow template 205'});
export const WORKFLOW_TEMPLATE_206=Object.freeze({id:206,label:'Workflow template 206'});
export const WORKFLOW_TEMPLATE_207=Object.freeze({id:207,label:'Workflow template 207'});
export const WORKFLOW_TEMPLATE_208=Object.freeze({id:208,label:'Workflow template 208'});
export const WORKFLOW_TEMPLATE_209=Object.freeze({id:209,label:'Workflow template 209'});
export const WORKFLOW_TEMPLATE_210=Object.freeze({id:210,label:'Workflow template 210'});
export const WORKFLOW_TEMPLATE_211=Object.freeze({id:211,label:'Workflow template 211'});
export const WORKFLOW_TEMPLATE_212=Object.freeze({id:212,label:'Workflow template 212'});
export const WORKFLOW_TEMPLATE_213=Object.freeze({id:213,label:'Workflow template 213'});
export const WORKFLOW_TEMPLATE_214=Object.freeze({id:214,label:'Workflow template 214'});
export const WORKFLOW_TEMPLATE_215=Object.freeze({id:215,label:'Workflow template 215'});
export const WORKFLOW_TEMPLATE_216=Object.freeze({id:216,label:'Workflow template 216'});
export const WORKFLOW_TEMPLATE_217=Object.freeze({id:217,label:'Workflow template 217'});
export const WORKFLOW_TEMPLATE_218=Object.freeze({id:218,label:'Workflow template 218'});
export const WORKFLOW_TEMPLATE_219=Object.freeze({id:219,label:'Workflow template 219'});
export const WORKFLOW_TEMPLATE_220=Object.freeze({id:220,label:'Workflow template 220'});
export const WORKFLOW_TEMPLATE_221=Object.freeze({id:221,label:'Workflow template 221'});
export const WORKFLOW_TEMPLATE_222=Object.freeze({id:222,label:'Workflow template 222'});
export const WORKFLOW_TEMPLATE_223=Object.freeze({id:223,label:'Workflow template 223'});
export const WORKFLOW_TEMPLATE_224=Object.freeze({id:224,label:'Workflow template 224'});
export const WORKFLOW_TEMPLATE_225=Object.freeze({id:225,label:'Workflow template 225'});
export const WORKFLOW_TEMPLATE_226=Object.freeze({id:226,label:'Workflow template 226'});
export const WORKFLOW_TEMPLATE_227=Object.freeze({id:227,label:'Workflow template 227'});
export const WORKFLOW_TEMPLATE_228=Object.freeze({id:228,label:'Workflow template 228'});
export const WORKFLOW_TEMPLATE_229=Object.freeze({id:229,label:'Workflow template 229'});
export const WORKFLOW_TEMPLATE_230=Object.freeze({id:230,label:'Workflow template 230'});
export const WORKFLOW_TEMPLATE_231=Object.freeze({id:231,label:'Workflow template 231'});
export const WORKFLOW_TEMPLATE_232=Object.freeze({id:232,label:'Workflow template 232'});
export const WORKFLOW_TEMPLATE_233=Object.freeze({id:233,label:'Workflow template 233'});
export const WORKFLOW_TEMPLATE_234=Object.freeze({id:234,label:'Workflow template 234'});
export const WORKFLOW_TEMPLATE_235=Object.freeze({id:235,label:'Workflow template 235'});
export const WORKFLOW_TEMPLATE_236=Object.freeze({id:236,label:'Workflow template 236'});
export const WORKFLOW_TEMPLATE_237=Object.freeze({id:237,label:'Workflow template 237'});
export const WORKFLOW_TEMPLATE_238=Object.freeze({id:238,label:'Workflow template 238'});
export const WORKFLOW_TEMPLATE_239=Object.freeze({id:239,label:'Workflow template 239'});
export const WORKFLOW_TEMPLATE_240=Object.freeze({id:240,label:'Workflow template 240'});
export const WORKFLOW_TEMPLATE_241=Object.freeze({id:241,label:'Workflow template 241'});
export const WORKFLOW_TEMPLATE_242=Object.freeze({id:242,label:'Workflow template 242'});
export const WORKFLOW_TEMPLATE_243=Object.freeze({id:243,label:'Workflow template 243'});
export const WORKFLOW_TEMPLATE_244=Object.freeze({id:244,label:'Workflow template 244'});
export const WORKFLOW_TEMPLATE_245=Object.freeze({id:245,label:'Workflow template 245'});
export const WORKFLOW_TEMPLATE_246=Object.freeze({id:246,label:'Workflow template 246'});
export const WORKFLOW_TEMPLATE_247=Object.freeze({id:247,label:'Workflow template 247'});
export const WORKFLOW_TEMPLATE_248=Object.freeze({id:248,label:'Workflow template 248'});
export const WORKFLOW_TEMPLATE_249=Object.freeze({id:249,label:'Workflow template 249'});
export const WORKFLOW_TEMPLATE_250=Object.freeze({id:250,label:'Workflow template 250'});
export const WORKFLOW_TEMPLATE_251=Object.freeze({id:251,label:'Workflow template 251'});
export const WORKFLOW_TEMPLATE_252=Object.freeze({id:252,label:'Workflow template 252'});
export const WORKFLOW_TEMPLATE_253=Object.freeze({id:253,label:'Workflow template 253'});
export const WORKFLOW_TEMPLATE_254=Object.freeze({id:254,label:'Workflow template 254'});
export const WORKFLOW_TEMPLATE_255=Object.freeze({id:255,label:'Workflow template 255'});
export const WORKFLOW_TEMPLATE_256=Object.freeze({id:256,label:'Workflow template 256'});
export const WORKFLOW_TEMPLATE_257=Object.freeze({id:257,label:'Workflow template 257'});
export const WORKFLOW_TEMPLATE_258=Object.freeze({id:258,label:'Workflow template 258'});
export const WORKFLOW_TEMPLATE_259=Object.freeze({id:259,label:'Workflow template 259'});
export const WORKFLOW_TEMPLATE_260=Object.freeze({id:260,label:'Workflow template 260'});
export const WORKFLOW_TEMPLATE_261=Object.freeze({id:261,label:'Workflow template 261'});
export const WORKFLOW_TEMPLATE_262=Object.freeze({id:262,label:'Workflow template 262'});
export const WORKFLOW_TEMPLATE_263=Object.freeze({id:263,label:'Workflow template 263'});
export const WORKFLOW_TEMPLATE_264=Object.freeze({id:264,label:'Workflow template 264'});
export const WORKFLOW_TEMPLATE_265=Object.freeze({id:265,label:'Workflow template 265'});
export const WORKFLOW_TEMPLATE_266=Object.freeze({id:266,label:'Workflow template 266'});
export const WORKFLOW_TEMPLATE_267=Object.freeze({id:267,label:'Workflow template 267'});
export const WORKFLOW_TEMPLATE_268=Object.freeze({id:268,label:'Workflow template 268'});
export const WORKFLOW_TEMPLATE_269=Object.freeze({id:269,label:'Workflow template 269'});
export const WORKFLOW_TEMPLATE_270=Object.freeze({id:270,label:'Workflow template 270'});
export const WORKFLOW_TEMPLATE_271=Object.freeze({id:271,label:'Workflow template 271'});
export const WORKFLOW_TEMPLATE_272=Object.freeze({id:272,label:'Workflow template 272'});
export const WORKFLOW_TEMPLATE_273=Object.freeze({id:273,label:'Workflow template 273'});
export const WORKFLOW_TEMPLATE_274=Object.freeze({id:274,label:'Workflow template 274'});
export const WORKFLOW_TEMPLATE_275=Object.freeze({id:275,label:'Workflow template 275'});
export const WORKFLOW_TEMPLATE_276=Object.freeze({id:276,label:'Workflow template 276'});
export const WORKFLOW_TEMPLATE_277=Object.freeze({id:277,label:'Workflow template 277'});
export const WORKFLOW_TEMPLATE_278=Object.freeze({id:278,label:'Workflow template 278'});
export const WORKFLOW_TEMPLATE_279=Object.freeze({id:279,label:'Workflow template 279'});
export const WORKFLOW_TEMPLATE_280=Object.freeze({id:280,label:'Workflow template 280'});
export const WORKFLOW_TEMPLATE_281=Object.freeze({id:281,label:'Workflow template 281'});
export const WORKFLOW_TEMPLATE_282=Object.freeze({id:282,label:'Workflow template 282'});
export const WORKFLOW_TEMPLATE_283=Object.freeze({id:283,label:'Workflow template 283'});
export const WORKFLOW_TEMPLATE_284=Object.freeze({id:284,label:'Workflow template 284'});
export const WORKFLOW_TEMPLATE_285=Object.freeze({id:285,label:'Workflow template 285'});
export const WORKFLOW_TEMPLATE_286=Object.freeze({id:286,label:'Workflow template 286'});
export const WORKFLOW_TEMPLATE_287=Object.freeze({id:287,label:'Workflow template 287'});
export const WORKFLOW_TEMPLATE_288=Object.freeze({id:288,label:'Workflow template 288'});
export const WORKFLOW_TEMPLATE_289=Object.freeze({id:289,label:'Workflow template 289'});
export const WORKFLOW_TEMPLATE_290=Object.freeze({id:290,label:'Workflow template 290'});
export const WORKFLOW_TEMPLATE_291=Object.freeze({id:291,label:'Workflow template 291'});
export const WORKFLOW_TEMPLATE_292=Object.freeze({id:292,label:'Workflow template 292'});
export const WORKFLOW_TEMPLATE_293=Object.freeze({id:293,label:'Workflow template 293'});
export const WORKFLOW_TEMPLATE_294=Object.freeze({id:294,label:'Workflow template 294'});
export const WORKFLOW_TEMPLATE_295=Object.freeze({id:295,label:'Workflow template 295'});
export const WORKFLOW_TEMPLATE_296=Object.freeze({id:296,label:'Workflow template 296'});
export const WORKFLOW_TEMPLATE_297=Object.freeze({id:297,label:'Workflow template 297'});
export const WORKFLOW_TEMPLATE_298=Object.freeze({id:298,label:'Workflow template 298'});
export const WORKFLOW_TEMPLATE_299=Object.freeze({id:299,label:'Workflow template 299'});
export const WORKFLOW_TEMPLATE_300=Object.freeze({id:300,label:'Workflow template 300'});
export const WORKFLOW_TEMPLATE_301=Object.freeze({id:301,label:'Workflow template 301'});
export const WORKFLOW_TEMPLATE_302=Object.freeze({id:302,label:'Workflow template 302'});
export const WORKFLOW_TEMPLATE_303=Object.freeze({id:303,label:'Workflow template 303'});
export const WORKFLOW_TEMPLATE_304=Object.freeze({id:304,label:'Workflow template 304'});
export const WORKFLOW_TEMPLATE_305=Object.freeze({id:305,label:'Workflow template 305'});
export const WORKFLOW_TEMPLATE_306=Object.freeze({id:306,label:'Workflow template 306'});
export const WORKFLOW_TEMPLATE_307=Object.freeze({id:307,label:'Workflow template 307'});
export const WORKFLOW_TEMPLATE_308=Object.freeze({id:308,label:'Workflow template 308'});
export const WORKFLOW_TEMPLATE_309=Object.freeze({id:309,label:'Workflow template 309'});
export const WORKFLOW_TEMPLATE_310=Object.freeze({id:310,label:'Workflow template 310'});
export const WORKFLOW_TEMPLATE_311=Object.freeze({id:311,label:'Workflow template 311'});
export const WORKFLOW_TEMPLATE_312=Object.freeze({id:312,label:'Workflow template 312'});
export const WORKFLOW_TEMPLATE_313=Object.freeze({id:313,label:'Workflow template 313'});
export const WORKFLOW_TEMPLATE_314=Object.freeze({id:314,label:'Workflow template 314'});
export const WORKFLOW_TEMPLATE_315=Object.freeze({id:315,label:'Workflow template 315'});
export const WORKFLOW_TEMPLATE_316=Object.freeze({id:316,label:'Workflow template 316'});
export const WORKFLOW_TEMPLATE_317=Object.freeze({id:317,label:'Workflow template 317'});
export const WORKFLOW_TEMPLATE_318=Object.freeze({id:318,label:'Workflow template 318'});
export const WORKFLOW_TEMPLATE_319=Object.freeze({id:319,label:'Workflow template 319'});
export const WORKFLOW_TEMPLATE_320=Object.freeze({id:320,label:'Workflow template 320'});
export const WORKFLOW_TEMPLATE_321=Object.freeze({id:321,label:'Workflow template 321'});
export const WORKFLOW_TEMPLATE_322=Object.freeze({id:322,label:'Workflow template 322'});
export const WORKFLOW_TEMPLATE_323=Object.freeze({id:323,label:'Workflow template 323'});
export const WORKFLOW_TEMPLATE_324=Object.freeze({id:324,label:'Workflow template 324'});
export const WORKFLOW_TEMPLATE_325=Object.freeze({id:325,label:'Workflow template 325'});
export const WORKFLOW_TEMPLATE_326=Object.freeze({id:326,label:'Workflow template 326'});
export const WORKFLOW_TEMPLATE_327=Object.freeze({id:327,label:'Workflow template 327'});
export const WORKFLOW_TEMPLATE_328=Object.freeze({id:328,label:'Workflow template 328'});
export const WORKFLOW_TEMPLATE_329=Object.freeze({id:329,label:'Workflow template 329'});
export const WORKFLOW_TEMPLATE_330=Object.freeze({id:330,label:'Workflow template 330'});
export const WORKFLOW_TEMPLATE_331=Object.freeze({id:331,label:'Workflow template 331'});
export const WORKFLOW_TEMPLATE_332=Object.freeze({id:332,label:'Workflow template 332'});
export const WORKFLOW_TEMPLATE_333=Object.freeze({id:333,label:'Workflow template 333'});
export const WORKFLOW_TEMPLATE_334=Object.freeze({id:334,label:'Workflow template 334'});
export const WORKFLOW_TEMPLATE_335=Object.freeze({id:335,label:'Workflow template 335'});
export const WORKFLOW_TEMPLATE_336=Object.freeze({id:336,label:'Workflow template 336'});
export const WORKFLOW_TEMPLATE_337=Object.freeze({id:337,label:'Workflow template 337'});
export const WORKFLOW_TEMPLATE_338=Object.freeze({id:338,label:'Workflow template 338'});
export const WORKFLOW_TEMPLATE_339=Object.freeze({id:339,label:'Workflow template 339'});
export const WORKFLOW_TEMPLATE_340=Object.freeze({id:340,label:'Workflow template 340'});
export const WORKFLOW_TEMPLATE_341=Object.freeze({id:341,label:'Workflow template 341'});
export const WORKFLOW_TEMPLATE_342=Object.freeze({id:342,label:'Workflow template 342'});
export const WORKFLOW_TEMPLATE_343=Object.freeze({id:343,label:'Workflow template 343'});
export const WORKFLOW_TEMPLATE_344=Object.freeze({id:344,label:'Workflow template 344'});
export const WORKFLOW_TEMPLATE_345=Object.freeze({id:345,label:'Workflow template 345'});
export const WORKFLOW_TEMPLATE_346=Object.freeze({id:346,label:'Workflow template 346'});
export const WORKFLOW_TEMPLATE_347=Object.freeze({id:347,label:'Workflow template 347'});
export const WORKFLOW_TEMPLATE_348=Object.freeze({id:348,label:'Workflow template 348'});
export const WORKFLOW_TEMPLATE_349=Object.freeze({id:349,label:'Workflow template 349'});
export const WORKFLOW_TEMPLATE_350=Object.freeze({id:350,label:'Workflow template 350'});
export const WORKFLOW_TEMPLATE_351=Object.freeze({id:351,label:'Workflow template 351'});
export const WORKFLOW_TEMPLATE_352=Object.freeze({id:352,label:'Workflow template 352'});
export const WORKFLOW_TEMPLATE_353=Object.freeze({id:353,label:'Workflow template 353'});
export const WORKFLOW_TEMPLATE_354=Object.freeze({id:354,label:'Workflow template 354'});
export const WORKFLOW_TEMPLATE_355=Object.freeze({id:355,label:'Workflow template 355'});
export const WORKFLOW_TEMPLATE_356=Object.freeze({id:356,label:'Workflow template 356'});
export const WORKFLOW_TEMPLATE_357=Object.freeze({id:357,label:'Workflow template 357'});
export const WORKFLOW_TEMPLATE_358=Object.freeze({id:358,label:'Workflow template 358'});
export const WORKFLOW_TEMPLATE_359=Object.freeze({id:359,label:'Workflow template 359'});
export const WORKFLOW_TEMPLATE_360=Object.freeze({id:360,label:'Workflow template 360'});
export const WORKFLOW_TEMPLATE_361=Object.freeze({id:361,label:'Workflow template 361'});
export const WORKFLOW_TEMPLATE_362=Object.freeze({id:362,label:'Workflow template 362'});
export const WORKFLOW_TEMPLATE_363=Object.freeze({id:363,label:'Workflow template 363'});
export const WORKFLOW_TEMPLATE_364=Object.freeze({id:364,label:'Workflow template 364'});
export const WORKFLOW_TEMPLATE_365=Object.freeze({id:365,label:'Workflow template 365'});
export const WORKFLOW_TEMPLATE_366=Object.freeze({id:366,label:'Workflow template 366'});
export const WORKFLOW_TEMPLATE_367=Object.freeze({id:367,label:'Workflow template 367'});
export const WORKFLOW_TEMPLATE_368=Object.freeze({id:368,label:'Workflow template 368'});
export const WORKFLOW_TEMPLATE_369=Object.freeze({id:369,label:'Workflow template 369'});
export const WORKFLOW_TEMPLATE_370=Object.freeze({id:370,label:'Workflow template 370'});
export const WORKFLOW_TEMPLATE_371=Object.freeze({id:371,label:'Workflow template 371'});
export const WORKFLOW_TEMPLATE_372=Object.freeze({id:372,label:'Workflow template 372'});
export const WORKFLOW_TEMPLATE_373=Object.freeze({id:373,label:'Workflow template 373'});
export const WORKFLOW_TEMPLATE_374=Object.freeze({id:374,label:'Workflow template 374'});
export const WORKFLOW_TEMPLATE_375=Object.freeze({id:375,label:'Workflow template 375'});
export const WORKFLOW_TEMPLATE_376=Object.freeze({id:376,label:'Workflow template 376'});
export const WORKFLOW_TEMPLATE_377=Object.freeze({id:377,label:'Workflow template 377'});
export const WORKFLOW_TEMPLATE_378=Object.freeze({id:378,label:'Workflow template 378'});
export const WORKFLOW_TEMPLATE_379=Object.freeze({id:379,label:'Workflow template 379'});
export const WORKFLOW_TEMPLATE_380=Object.freeze({id:380,label:'Workflow template 380'});
export const WORKFLOW_TEMPLATE_381=Object.freeze({id:381,label:'Workflow template 381'});
export const WORKFLOW_TEMPLATE_382=Object.freeze({id:382,label:'Workflow template 382'});
export const WORKFLOW_TEMPLATE_383=Object.freeze({id:383,label:'Workflow template 383'});
export const WORKFLOW_TEMPLATE_384=Object.freeze({id:384,label:'Workflow template 384'});
export const WORKFLOW_TEMPLATE_385=Object.freeze({id:385,label:'Workflow template 385'});
export const WORKFLOW_TEMPLATE_386=Object.freeze({id:386,label:'Workflow template 386'});
export const WORKFLOW_TEMPLATE_387=Object.freeze({id:387,label:'Workflow template 387'});
export const WORKFLOW_TEMPLATE_388=Object.freeze({id:388,label:'Workflow template 388'});
export const WORKFLOW_TEMPLATE_389=Object.freeze({id:389,label:'Workflow template 389'});
export const WORKFLOW_TEMPLATE_390=Object.freeze({id:390,label:'Workflow template 390'});
export const WORKFLOW_TEMPLATE_391=Object.freeze({id:391,label:'Workflow template 391'});
export const WORKFLOW_TEMPLATE_392=Object.freeze({id:392,label:'Workflow template 392'});
export const WORKFLOW_TEMPLATE_393=Object.freeze({id:393,label:'Workflow template 393'});
export const WORKFLOW_TEMPLATE_394=Object.freeze({id:394,label:'Workflow template 394'});
export const WORKFLOW_TEMPLATE_395=Object.freeze({id:395,label:'Workflow template 395'});
export const WORKFLOW_TEMPLATE_396=Object.freeze({id:396,label:'Workflow template 396'});
export const WORKFLOW_TEMPLATE_397=Object.freeze({id:397,label:'Workflow template 397'});
export const WORKFLOW_TEMPLATE_398=Object.freeze({id:398,label:'Workflow template 398'});
export const WORKFLOW_TEMPLATE_399=Object.freeze({id:399,label:'Workflow template 399'});
export const WORKFLOW_TEMPLATE_400=Object.freeze({id:400,label:'Workflow template 400'});
