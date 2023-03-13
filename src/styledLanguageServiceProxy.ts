
import * as ts from 'typescript/lib/tsserverlibrary'
import StandardTemplateSourceHelper from 'typescript-template-language-service-decorator/lib/standard-template-source-helper'
import StandardScriptSourceHelper from 'typescript-template-language-service-decorator/lib/standard-script-source-helper'
import CssSelectorParser from './parser/cssSelectorParser';
import TsHelp from './service/tsHelp';


type LanguageServiceMethodWrapper<K extends keyof ts.LanguageService>
  = (delegate: ts.LanguageService[K], info?: ts.server.PluginCreateInfo) => ts.LanguageService[K];

export default class StyledLanguageServiceProxy {
  constructor( typescript: typeof ts, languageService: ts.LanguageService,  project: ts.server.Project,info) {
    this.typescript = typescript
    this.languageService = languageService
    this.intercepts.getDefinitionAndBoundSpan = this.tryGetDefinitionAndBoundSpan
    this.helper = new StandardTemplateSourceHelper(
      typescript,
      {tags:['styled'],enableForStringWithSubstitutions: true},
      new StandardScriptSourceHelper(typescript,project),
      {
        log:()=>{}
      }
      )

      this.info = info
  }
  languageService: ts.LanguageService
  helper: StandardTemplateSourceHelper
  typescript: typeof ts
  intercepts: Partial<{ [name in keyof ts.LanguageService]: LanguageServiceMethodWrapper<any> }> = {}
  info:any
  private getDefinitionAndBoundSpan(fileName: string, position: number): ts.DefinitionInfoAndBoundSpan | undefined {
    const tsHelp = new TsHelp(this.typescript, this.languageService);
    const cssSelectorParse = new CssSelectorParser(this.typescript, this.languageService, tsHelp);
    try{
      let result = cssSelectorParse.getStyledTemplateSelectorByDomSelector(fileName, position)
      if (result) {
        return result
      }
    }catch(e:any){
      console.log('error---',e.stack);
    }
   
    try{
      let templateContext = this.helper.getTemplate(fileName,position)
      if(!templateContext){
        return
      }
      let result = cssSelectorParse.getDomSelectorByStyledTemplateSelector(fileName,position);
      return result
    }catch(e:any){
      console.log('error---',e.stack);
    }
  }
  private tryGetDefinitionAndBoundSpan = (delegate) => {

    return (fileName: string, position: number, ...rest: any[]) => {

      let res = this.getDefinitionAndBoundSpan(fileName, position)
      if (res) {
        return res
      }
      
      return (delegate as any)(fileName, position, ...rest)
    }
  }
  start = (languageService: ts.LanguageService) => {
    

    const intercept: Partial<ts.LanguageService> = Object.create(null);
    for (let name in this.intercepts) {
      (intercept[name] as any) = this.intercepts[name](languageService[name]!.bind(languageService))
    }

    // for (const { name, wrapper } of this._wrappers) {
    //   (intercept[name] as any) = wrapper(languageService[name]!.bind(languageService));
    // }

    return new Proxy(languageService, {
      get: (target: any, property: string | symbol) => {
        return (intercept as any)[property] || target[property];
      },
    });
  }

}