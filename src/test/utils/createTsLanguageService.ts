
import * as ts from 'typescript/lib/tsserverlibrary'

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
  getScriptFileNames:()=>[
    "./example/index.tsx",
    "./example/base.tsx",
  ],
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
  fileExists: (path)=>{
    // debugger
    return ts.sys.fileExists(path)
  }
}

// const programe1 = ts.createProgram(options)

export const languageService = ts.createLanguageService(host)

