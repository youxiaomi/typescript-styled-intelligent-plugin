import { getSCSSLanguageService ,TextDocument} from 'vscode-css-languageservice'


import * as ts from 'typescript/lib/tsserverlibrary';
import StyledLanguageServiceProxy from './styledLanguageServiceProxy';


function init(modules: { typescript: typeof import("typescript/lib/tsserverlibrary") }){
  const ts = modules.typescript;

  function create(info: ts.server.PluginCreateInfo) {
    info.project.log('init styled plugin')
    // return info.languageService
    return new StyledLanguageServiceProxy(modules.typescript, info.languageService, info.project, info).start(info.languageService)
  }
  return { create };
}
export = init;