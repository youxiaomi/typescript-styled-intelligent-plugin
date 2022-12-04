
import * as ts from 'typescript/lib/tsserverlibrary'
import StandardTemplateSourceHelper from 'typescript-template-language-service-decorator/lib/standard-template-source-helper'
import StandardScriptSourceHelper from 'typescript-template-language-service-decorator/lib/standard-script-source-helper'


// StandardTemplateSourceHelper
type LanguageServiceMethodWrapper<K extends keyof ts.LanguageService>
  = (delegate: ts.LanguageService[K], info?: ts.server.PluginCreateInfo) => ts.LanguageService[K];

export default class StyledLanguageServiceProxy {
  constructor( typescript: typeof ts, languageService: ts.LanguageService,  project: ts.server.Project,) {
    this.typescript = typescript
    this.intercepts.getDefinitionAndBoundSpan = this.tryGetDefinitionAndBoundSpan
    this.helper = new StandardTemplateSourceHelper(
      typescript,
      {tags:['styled'],enableForStringWithSubstitutions: true},
      new StandardScriptSourceHelper(typescript,project),
      {
        log:()=>{}
      }
      )
  }
  helper: StandardTemplateSourceHelper
  typescript: typeof ts
  intercepts: Partial<{ [name in keyof ts.LanguageService]: LanguageServiceMethodWrapper<any> }> = {}

  private getDefinitionAndBoundSpan(fileName: string, position: number): ts.DefinitionInfoAndBoundSpan | undefined {
    

    return undefined
  }
  private tryGetDefinitionAndBoundSpan(delegate) {

    return (fileName: string, position: number, ...rest: any[]) => {
      let context = this.helper.getTemplate(fileName,position)
      if (!context) {
        return delegate(fileName,position,...rest)
      }

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