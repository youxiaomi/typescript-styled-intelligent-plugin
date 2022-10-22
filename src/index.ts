import { decorateWithTemplateLanguageService,TemplateLanguageService,TemplateContext } from 'typescript-template-language-service-decorator'
import { getSCSSLanguageService ,TextDocument} from 'vscode-css-languageservice'
import { Node,NodeType } from 'vscode-css-languageservice/lib/umd/parser/cssNodes'


import * as ts from 'typescript/lib/tsserverlibrary';

type Ts  = typeof import("typescript/lib/tsserverlibrary")
class EchoTemplateLanguageService implements TemplateLanguageService {
  // getCompletionsAtPosition(
  //     context: TemplateContext,
  //     position: ts.LineAndCharacter
  // ): ts.CompletionInfo {
  //     const line = context.text.split(/\n/g)[position.line];
  //     return {
  //         isGlobalCompletion: false,
  //         isMemberCompletion: false,
  //         isNewIdentifierLocation: false,
  //         entries: [
  //             {
  //                 name: line.slice(0, position.character),
  //                 kind: '',
  //                 kindModifiers: 'echo',
  //                 sortText: 'echo'
  //             }
  //         ]
  //     };
  // }
  constructor(ts: Ts ,info: ts.server.PluginCreateInfo ){
    this.ts = ts
    this.info = info
  }
  ts: typeof import("typescript/lib/tsserverlibrary")
  info: ts.server.PluginCreateInfo
  findNode = ()=>{

  }
  
  public getDefinitionAndBoundSpan(context: TemplateContext, position: ts.LineAndCharacter): ts.DefinitionInfoAndBoundSpan{
    const info = this.info
    const languageService = info.languageService



    // let data:any = [
    //     {
    //         "fileName":"/Users/squid/resilioSync/dream/vscode-styled-define2/src/test/test.tsx",
    //         "textSpan":{"start":90,"length":11},
    //         "kind":"var",
    //         "name":"componentsA",
    //         "containerName":"componentsA",
    //         "contextSpan":{"start":86,"length":24},
    //         "isLocal":false,
    //         "isAmbient":false,
    //         "unverified":false,
    //         "failedAliasResolution":false
    //     }
    //     ]
    //     let data2  = {"start":90,"length":11}
    let program = this.info.languageService.getProgram()
    let checker = program?.getTypeChecker();
    let sourceFile = program?.getSourceFile(context.fileName);
    let node = context.node
    node.pos
    // var aa1 = this.info.languageService.getQuickInfoAtPosition(context.fileName,179)
    var aa2 = this.info.languageService.getReferencesAtPosition(context.fileName, 179)
    const findNode = (typescript: Ts, sourceFile: ts.SourceFile, position: number) => {
      function find(node: ts.Node): ts.Node | undefined {
        if (position >= node.getStart() && position < node.getEnd()) {
          return typescript.forEachChild(node, find) || node;
        }
      }
      return find(sourceFile);
    }
    console.log(findNode);
    
    const findNodeByRange = (typescript: Ts, sourceFile: ts.SourceFile, startPosition: number,endPosition: number)=>{
      function find(node: ts.Node): ts.Node | undefined {
        if (startPosition == node.getStart() && endPosition == node.getEnd()) {
          return node;
        } else{
          let _node = typescript.forEachChild(node, find)
          return  _node;
        }
      }
      let _node = find(sourceFile)
      return _node
    }
    // if (sourceFile) {
    //   this.ts.forEachChild(sourceFile, (_node) => {
    //     console.log(_node.getStart(), 'start');
    //     console.log(_node.getEnd(), 'end')
    //     if (_node.getStart() <= node.pos && _node.getEnd() >= node.pos) {
    //       return node
    //     }
    //   })
    // }
    const templateStringNode = context.node

    let componentName = context.node.parent.parent
    if(templateStringNode.parent.kind == this.ts.SyntaxKind.TaggedTemplateExpression){
      let componentNode = templateStringNode.parent.parent
      let references = this.info.languageService.getReferencesAtPosition(context.fileName,componentName.pos+1) || [];
      let referenceNodes = references?.map(reference => {
        if (sourceFile) {
          if(!reference.contextSpan){
            return undefined
          }
          let start = reference.contextSpan?.start || 0
          let end  = ( reference.contextSpan?.start || 0 )+ (reference.contextSpan?.length || 0 )
          return findNodeByRange(this.ts, sourceFile,start, end)
        } else {
          return undefined
        }
      })
      console.log(referenceNodes)
      // const ts = ts
      function extractVariableStatement(node: ts.VariableStatement){

        node.declarationList.forEachChild(node=>{
          extractCssSelectorWrok(node)
        })
      }
      function extractVariableDeclaration(node: ts.VariableDeclaration){
        let { initializer } = node
        extractCssSelectorWrok(initializer)
      }
      function extractArrowFunction(node: ts.ArrowFunction){
        let { body } = node
        extractCssSelectorWrok(body);
      }
      function extractBlock(node: ts.Block){
        let { statements } = node
        let returnStatements =  statements.filter(statement=>{
          return statement.kind == ts.SyntaxKind.ReturnStatement
        })  as ts.ReturnStatement[]
        return returnStatements.map((statement) => extractCssSelectorWrok(statement.expression))
      }
      function extractConditionalExpression(node: ts.ConditionalExpression){
        let {whenFalse,whenTrue} = node
        let nodes = [whenFalse,whenTrue].filter(item => item);
        let references = nodes.map(node=>{
          return (languageService.getDefinitionAtPosition(context.fileName,node.pos)||[]).filter(reference =>  reference)
        })

      }
      function extractCssSelectorWrok(node: ts.Node| undefined){
        if(!node){
          return 
        }
        switch (node?.kind){
          case ts.SyntaxKind.VariableStatement: 
            extractVariableStatement(node as ts.VariableStatement);
          case ts.SyntaxKind.VariableDeclaration:
            extractVariableDeclaration(node as ts.VariableDeclaration);
          case ts.SyntaxKind.ArrowFunction:
            extractArrowFunction(node as ts.ArrowFunction)
          case ts.SyntaxKind.Block:
            extractBlock(node as ts.Block)
          case ts.SyntaxKind.ConditionalExpression:
            extractConditionalExpression(node as ts.ConditionalExpression)
        }
      }
      // referenceNodes[1].parent.parent.openingElement.attributes.getChildren()[0].getChildren()[0].getChildren()[2].getChildren()[1].getChildren()[1].getChildren()[0].getChildren()[0]
      referenceNodes.map(node =>{
        if(node?.kind == this.ts.SyntaxKind.JsxOpeningElement){
          let node1 = node as ts.JsxElement
          // node1.openingElement.attributes
        }
        
        if(node?.kind == this.ts.SyntaxKind.JsxElement){
          let nodeElement = node as ts.JsxElement
          let openingElement = nodeElement.openingElement;
          // let childrens = nodeElemen
          if(openingElement.attributes){
            openingElement.attributes.properties.forEach(node=>{
              if(node.kind == this.ts.SyntaxKind.JsxAttribute){
                if(node.initializer){
                  if(node.initializer.kind == this.ts.SyntaxKind.JsxExpression){
                    let expression = node.initializer.expression
                    if(expression && expression.kind == this.ts.SyntaxKind.TemplateExpression){
                      let node = expression  as ts.TemplateExpression
                      
                      let str = `${node.head.rawText}`
                      node.templateSpans.forEach(node=>{
                        node.expression
                        if(node.expression.kind == this.ts.SyntaxKind.CallExpression){
                          let references = this.info.languageService.getReferencesAtPosition(context.fileName, node.expression.pos) ||[]
                          references.forEach(reference=>{
                            if(reference.isWriteAccess && reference.contextSpan){
                              if(!sourceFile){
                                return
                              }
                              let node = findNodeByRange(this.ts, sourceFile, reference.contextSpan.start, reference.contextSpan.start + reference.contextSpan.length)
                              switch (node?.kind){
                                case this.ts.SyntaxKind.VariableStatement: 

                              }
                            }
                          })
                          console.log(references)
                        }
                        if(node.expression.kind == this.ts.SyntaxKind.Identifier){
                          let refs = this.info.languageService.getReferencesAtPosition(context.fileName, node.expression.pos)
                          console.log(refs)
                        }
                      })
                    }
                  }
                }
                if(node.name && node.name.kind == this.ts.SyntaxKind.Identifier){
                  node.name.escapedText
                  // let propName = prop.name as ts.Identifier;
                  // if(propName.escapedText == 'className'){
                  //   prop
                  // }
                }
                
              }
              
            })
          }
          ts.forEachChild(node,()=>{

          })
        }
      })
    }else{
      debugger
    }
    // let references = this.info.languageService.getReferencesAtPosition(context.fileName,componentName.pos)

    let startOffset = context.node.getStart()
    let data:any = [
        {
            "fileName":"/Users/squid/resilioSync/dream/ts_plugin/src/test.tsx",
            "textSpan":{"start":0 - startOffset - 1,"length":16},
            "kind":"var",
            "name":"componentsA",
            // "containerName":"componentsA",
            // "contextSpan":{"start":23,"length":7},
            "isLocal":false,
            "isAmbient":false,
            "unverified":true,
            "failedAliasResolution":false
        },
        // {
        //     "fileName":"/Users/squid/resilioSync/dream/ts_plugin/src/test.tsx",
        //     "textSpan":{"start":17 - startOffset -1,"length":6},
        //     "kind":"var",
        //     "name":"componentsA",
        //     // "containerName":"componentsA",
        //     // "contextSpan":{"start":23,"length":7},
        //     "isLocal":false,
        //     "isAmbient":false,
        //     "unverified":true,
        //     "failedAliasResolution":false
        // }
        ]
        let data2  = {"start":0,"length":19}
    return {
        definitions: data,
        // definitions:[
        //     {
        //         kind: this.typescript.ScriptElementKind.keyword,
        //         name:'test',
        //         containerKind: this.typescript.ScriptElementKind.classElement,
        //         containerName:'con',
        //         textSpan:{
        //             start:0,
        //             length:4
        //         },
        //         fileName:'a.js'
        //     }
        // ],
        textSpan: data2
    }
}
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

}



function init(modules: { typescript: typeof import("typescript/lib/tsserverlibrary") }) {
    const ts = modules.typescript;
  
    function create(info: ts.server.PluginCreateInfo) {



      return decorateWithTemplateLanguageService(
        modules.typescript,info.languageService,
        info.project,
        new EchoTemplateLanguageService(modules.typescript,info),
        {tags:['styled'],enableForStringWithSubstitutions: true})
      // Get a list of things to remove from the completion list from the config object.
      // If nothing was specified, we'll just remove 'caller'
      const whatToRemove: string[] = info.config.remove || ["caller"];

      // Diagnostic logging
      info.project.projectService.logger.info(
        "I'm getting set up now! Check the log for this message."
      );
  
      // Set up decorator object
      const proxy: ts.LanguageService = Object.create(null);
      for (let k of Object.keys(info.languageService) as Array<keyof ts.LanguageService>) {
        const x = info.languageService[k]!;
        // @ts-expect-error - JS runtime trickery which is tricky to type tersely
        proxy[k] = (...args: Array<{}>) => x.apply(info.languageService, args);
      }
  
      // Remove specified entries from completion list
      proxy.getCompletionsAtPosition = (fileName, position, options) => {
        // This is just to let you hook into something to
        // see the debugger working
        const prior = info.languageService.getCompletionsAtPosition(fileName, position, options);
        if (!prior) return

        const oldLength = prior.entries.length;
        prior.entries = prior.entries.filter(e => whatToRemove.indexOf(e.name) < 0);
  
        // Sample logging for diagnostic purposes
        if (oldLength !== prior.entries.length) {
          const entriesRemoved = oldLength - prior.entries.length;
          info.project.projectService.logger.info(
            `Removed ${entriesRemoved} entries from the completion list`
          );
        }
  
        return prior;
      };
      proxy.getDefinitionAtPosition = (fileName: string, position: number)=>{
        debugger
        return info.languageService.getDefinitionAtPosition(fileName,position);
      }
      console.log('123123')
      return proxy;
    }
    return { create };
  }
  
  export = init;
  


