import ts from 'typescript'
import fs from 'fs-extra'
import TsHelp from '../service/tsHelp'
import CssSelectorParser from '../parser/cssSelectorParser'
// import * as ts from 'typescript'

const options = {
  rootNames: ['./example/index.tsx'],
  options:{
    // baseUrl:'../../example'
    // noEmitOnError: false
  }
}


const host: ts.LanguageServiceHost = {
  getCurrentDirectory: () => "./example",
  getCompilationSettings:()=> options,
  getScriptFileNames:()=>["./example/index.tsx",],
  // getProjectReferences:()=>["./example/index.tsx"],
  getScriptVersion:(fileName: string)=>{
    // debugger
    return ''
  },
  getDefaultLibFileName: ts.getDefaultLibFileName,
  readFile: (path)=>{
    // debugger
    console.log(path,'read file')
    return ts.sys.readFile(path)
  },
  // getScriptSnapshot: ts,
  getScriptSnapshot(fileName) {
    console.log(fileName,'snapshop')
    if (fileName.slice(-4) === ".tsx") {
      // debugger
    }
    return ts.ScriptSnapshot.fromString(ts.sys.readFile(fileName) || "");
    // return ts.ScriptSnapshot.fromString(files[fileName] || "");
  },
  fileExists: (...args)=>{
    // debugger
    return ts.sys.fileExists(...args)
  }
}

// const programe1 = ts.createProgram(options)

const languageService = ts.createLanguageService(host);
const programe = languageService.getProgram()
const sourceFiles = programe?.getSourceFiles() || []
let testFiles = sourceFiles.find(item => item.fileName.match('example/index.tsx')) as ts.SourceFile ;
console.log(testFiles);

var aa 


let references = languageService.getReferencesAtPosition(testFiles?.fileName || '', testFiles?.getFullText().indexOf('Member') || 0)




const tsHelp = new TsHelp(ts, languageService);
const styledNode = tsHelp.findNode(testFiles, testFiles?.getFullText().indexOf('User'))

const referenceNode = tsHelp.getReferenceNodes(testFiles.fileName,  styledNode?.pos || 0)

console.log(referenceNode)

const cssSelectorParser =  new CssSelectorParser(ts,languageService,tsHelp)
cssSelectorParser.parseCssSelector(referenceNode[1] as ts.JsxElement, testFiles.fileName)