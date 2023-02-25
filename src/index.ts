import { getSCSSLanguageService ,TextDocument} from 'vscode-css-languageservice'
import { Node,NodeType } from 'vscode-css-languageservice/lib/umd/parser/cssNodes'


import * as ts from 'typescript/lib/tsserverlibrary';
import StyledLanguageServiceProxy from './styledLanguageServiceProxy';

  // getDefinitionAtPosition(context: TemplateContext, position: ts.LineAndCharacter){
  //   var aa = 123
  //   console.log(123);
  //   let program = this.info.languageService.getProgram()
  //   let checker = program?.getTypeChecker();
  //   let sourceFile = program?.getSourceFile(context.fileName);
  //   let node  = context.node
  //   node.pos
  //   // var aa1 = this.info.languageService.getQuickInfoAtPosition(context.fileName,179)
  //   var aa2 = this.info.languageService.getReferencesAtPosition(context.fileName,179)
  //   if(sourceFile){
  //     this.ts.forEachChild(sourceFile,(_node)=>{
  //       console.log(_node.getStart(),'start');
  //       console.log(_node.getEnd(),'end')
  //       if(_node.getStart() <= node.pos && _node.getEnd() >= node.pos){ 
  //         return node
  //       }
  //     })
  //   }
  //   return []
  // }
   

  // getReferencesAtPosition(context: TemplateContext, position: ts.LineAndCharacter){

  //   var aa = 123
  //   console.log(123);
  //   debugger
  //   let program = this.info.languageService.getProgram()
  //   let checker = program?.getTypeChecker();
  //   let sourceFile = program?.getSourceFile(context.fileName);
  //   let node  = context.node
  //   node.pos
  //   // var aa1 = this.info.languageService.getQuickInfoAtPosition(context.fileName,179)
  //   var aa2 = this.info.languageService.getReferencesAtPosition(context.fileName,179)
  //   if(sourceFile){
  //     this.ts.forEachChild(sourceFile,(_node)=>{
  //       console.log(_node.getStart(),'start');
  //       console.log(_node.getEnd(),'end')
  //       if(_node.getStart() <= node.pos && _node.getEnd() >= node.pos){ 
  //         return node
  //       }
  //     })
  //   }
  //   return undefined
  // }
  // getQuickInfoAtPosition(context: TemplateContext, position: ts.LineAndCharacter){
  //   var aa = 123
  //   console.log(123);
  //   // debugger
  //   let program = this.info.languageService.getProgram()
  //   let checker = program?.getTypeChecker();
  //   let sourceFile = program?.getSourceFile(context.fileName);
  //   let node  = context.node
  //   node.pos
  //   // var aa1 = this.info.languageService.getQuickInfoAtPosition(context.fileName,179)
  //   var aa2 = this.info.languageService.getReferencesAtPosition(context.fileName,179)
  //   if(sourceFile){
  //     this.ts.forEachChild(sourceFile,(_node)=>{
  //       console.log(_node.getStart(),'start');
  //       console.log(_node.getEnd(),'end')
  //       if(_node.getStart() <= node.pos && _node.getEnd() >= node.pos){
  //         return node
  //       }
  //     })
  //   }





  //   return undefined
  // }




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
  


