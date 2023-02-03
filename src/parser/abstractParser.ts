
import ts from 'typescript/lib/tsserverlibrary'
import TsHelp from '../service/tsHelp'




export  abstract class AbstractParser{
  typescript:typeof ts
  languageService: ts.LanguageService
  tsHelp: TsHelp
  programe: ts.Program
  constructor(typescript: typeof ts,languageService: ts.LanguageService,tsHelp: TsHelp){
    this.typescript = typescript
    this.languageService = languageService
    this.tsHelp = tsHelp
    this.programe = this.languageService.getProgram() as ts.Program
  }


}