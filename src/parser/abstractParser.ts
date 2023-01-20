
type Ts  = typeof import("typescript")
import ts from 'typescript'
import TsHelp from '../service/tsHelp'




export  abstract class AbstractParser{
  typescript:Ts
  languageService: ts.LanguageService
  tsHelp: TsHelp
  programe: ts.Program
  constructor(typescript: Ts,languageService: ts.LanguageService,tsHelp: TsHelp){
    this.typescript = typescript
    this.languageService = languageService
    this.tsHelp = tsHelp
    this.programe = this.languageService.getProgram() as ts.Program
  }


}