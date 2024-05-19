
import * as ts from 'typescript/lib/tsserverlibrary'
import fs from 'fs'
import path from 'path'

const options:ts.CompilerOptions = {
  baseUrl: path.join(process.cwd(),'example'),
  // rootNames: ['./example/index.tsx'],
  // options:{
  //   // baseUrl:'../../example'
  //   // noEmitOnError: false
  // }
}


const host: ts.LanguageServiceHost = {
  getCurrentDirectory: () => "./example",
  getCompilationSettings:()=> options,
  getScriptFileNames:()=>{
    return fs.readdirSync('./example').filter((item)=>item.endsWith('.tsx')).map(item => path.join(process.cwd(),'./example',item))
  },
  // getProjectReferences:()=>["./example/index.tsx"],
  getScriptVersion:(fileName: string)=>{
    // debugger
    return ''
  },
  getDefaultLibFileName: ts.getDefaultLibFileName,
  readFile: (path)=>{
    return ts.sys.readFile(path)
  },
  // getScriptSnapshot: ts,
  getScriptSnapshot(fileName) {

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

