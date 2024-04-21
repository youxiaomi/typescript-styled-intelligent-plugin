import { getSCSSLanguageService ,TextDocument} from 'vscode-css-languageservice'
import { Node,NodeType } from 'vscode-css-languageservice/lib/umd/parser/cssNodes'


import * as ts from 'typescript/lib/tsserverlibrary';
import StyledLanguageServiceProxy from './styledLanguageServiceProxy';


function init(modules: { typescript: typeof import("typescript/lib/tsserverlibrary") }) {
    const ts = modules.typescript;
  
    function create(info: ts.server.PluginCreateInfo) {
      console.log('init styled plugin')
      info.project.log('init styled plugin')
      return new StyledLanguageServiceProxy( modules.typescript,info.languageService,info.project,info).start(info.languageService)
    }
    return { create };
  }
  
  export = init;
  


