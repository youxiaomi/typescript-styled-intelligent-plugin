


type Ts  = typeof import("typescript")
// import  from 'typescript/lib/tsserverlibrary'
import * as ts from 'typescript'
import TsHelp from '../service/tsHelp'

function extractCssSelectorWorkWrap ({ node,languageService, tsHelp, fileName }:{node,languageService:ts.LanguageService, tsHelp: TsHelp, fileName}){
  // return extractCssSelectorWork()



  function extractVariableStatement(node: ts.VariableStatement){
    return ts.forEachChild(node.declarationList,extractCssSelectorWork)
  }
  function extractVariableDeclaration(node: ts.VariableDeclaration){
    let { initializer } = node
    return extractCssSelectorWork(initializer)
  }
  function extractArrowFunction(node: ts.ArrowFunction){
    let { body } = node
    return extractCssSelectorWork(body);
  }
  function extractBlock(node: ts.Block){
    let { statements = [] } = node
    let returnStatements =  statements.filter(statement=>{
      return statement.kind == ts.SyntaxKind.ReturnStatement
    })  as ts.ReturnStatement[]
    return returnStatements.map((statement) => extractCssSelectorWork(statement.expression))
  }
  function extractConditionalExpression(node: ts.ConditionalExpression){
    let {whenFalse,whenTrue} = node
    let nodes = [
      whenFalse,
      whenTrue
    ].filter(item => item);
    let references = nodes.map(node=>{  
      return extractCssSelectorWork(node)
      // return (languageService.getDefinitionAtPosition(fileName,node.pos+1)||[]).filter(reference =>  reference)
    })

    return  references
  }
  function extractJsxElement(node: ts.JsxElement){
    console.log(languageService);
    let sourceFile = node.getSourceFile()
    let { attributes } = node.openingElement;

    let identiferNode = ts.forEachChild(node.openingElement,(node)=>{
      if(node.kind == ts.SyntaxKind.Identifier){
        return node
      }
    });
    let customElementChildren:any[] = []
    if(identiferNode){
      console.log(node.getFullText(),'-----');
      
      let identiferNodeReferences = languageService.getDefinitionAtPosition(sourceFile.fileName,identiferNode.getStart())
      let customDefineElement = identiferNodeReferences?.filter(tsHelp.isCustomJsxElement) || []
      let program = languageService.getProgram()
      let customElementNodes = customDefineElement.map(defineNode=>{
        let sourceFile = program?.getSourceFile(defineNode.fileName)
        if(!sourceFile || !defineNode.contextSpan){
          return 
        }
        return  tsHelp.findNodeByRange(sourceFile,defineNode.contextSpan?.start,defineNode.contextSpan.start + defineNode.contextSpan.length)
      })

      customElementChildren = customElementNodes?.map(extractCssSelectorWork).filter(node => node)
    }
    
    console.log(node.getFullText(),'2222');
    

    let className = ts.forEachChild(attributes,extractCssSelectorWork)
    let chidlrens =  ts.forEachChild(node,extractCssSelectorWork,extractCssSelectorWorkNodes)
    chidlrens = chidlrens.filter(child => child)
    return {
      type:'jsxElement',
      className: className,
      children: [...chidlrens,...customElementChildren],
      tsNode:node,
    }
  }
  function extractJsxAttribution(node: ts.JsxAttribute){
    node.initializer
    if(node.name.escapedText == 'className'){
      return extractCssSelectorWork(node.initializer)
    }
  }
  function extractJsxExpress(node: ts.JsxExpression){
    return extractCssSelectorWork(node.expression)
  }
  function extractTemplateExpression(node: ts.TemplateExpression){
    let { head ,templateSpans} = node
    let templateSpansNodes = templateSpans.map(extractCssSelectorWork)
    if(head.text.trim()){
      templateSpansNodes.unshift(head)
    }
    return templateSpansNodes
  }
  function extractTemplateSpan(node: ts.TemplateSpan){
    let { literal ,expression} = node
    let templateSpanNode = [extractCssSelectorWork(expression)]
    if(literal.text.trim()){
      templateSpanNode.push(literal)
    }
    return templateSpanNode
  }
  function extractIdentifier(node: ts.Identifier){
    let definitionNodes = tsHelp.getDefinitionNodes(fileName,node.getStart());
    let validNodes = definitionNodes.filter((refNode)=>{
      return refNode
    })
    return validNodes.map(extractCssSelectorWork)
    let nodes = validNodes.map(node =>{
      // return tsServer.findNodeByRange(node)
    })
  }
  function extractCallExpression(node: ts.CallExpression){
    let {  expression,arguments:_arguments  }  = node
    return  extractCssSelectorWork(expression)
  }
  function extractVariableDeclarationList(node: ts.VariableDeclarationList){
    return ts.forEachChild(node,extractCssSelectorWork)
  }
  function extractFirstStatement(node: ts.VariableStatement){
    // extractCssSelectorWork(node.expression)
    // let { literal ,expression} = node
    let { declarationList }  = node
    // extractCssSelectorWork(declarationList)
    return ts.forEachChild(declarationList,extractCssSelectorWork)
  }
 
  function extractStringLiteral(node: ts.StringLiteral){
    let { text,} = node
    return node
  }
  function extractTaggedTemplateExpression(node: ts.TaggedTemplateExpression){
    const  { tag,template } = node
    console.log(template);
    //todo  提取css对象 关联上同级className
    return {
      type: 'styledTeamplte',
      tag,
      tsNode: node,

    }
    // extractCssSelectorWork(node.expression)
    // let { literal ,expression} = node

  }
  function extract_(node: ts.Identifier){
    // extractCssSelectorWork(node.expression)
    // let { literal ,expression} = node

  }
  
  function extractCssSelectorWork(node: ts.Node| undefined){
    if(!node){
      return 
    }
    switch (node?.kind){
      case ts.SyntaxKind.VariableStatement: 
        return extractVariableStatement(node as ts.VariableStatement);
      case ts.SyntaxKind.VariableDeclaration:
        return extractVariableDeclaration(node as ts.VariableDeclaration);
      case ts.SyntaxKind.ArrowFunction:
        return extractArrowFunction(node as ts.ArrowFunction)
      case ts.SyntaxKind.Block:
        return extractBlock(node as ts.Block)
      case ts.SyntaxKind.ConditionalExpression:
        return extractConditionalExpression(node as ts.ConditionalExpression)
      case ts.SyntaxKind.JsxElement:
        return extractJsxElement(node as ts.JsxElement);
      case ts.SyntaxKind.JsxAttribute:
        return extractJsxAttribution(node as ts.JsxAttribute);
      case ts.SyntaxKind.JsxExpression:
        return extractJsxExpress(node as ts.JsxExpression)
      case ts.SyntaxKind.TemplateExpression:
        return extractTemplateExpression(node as ts.TemplateExpression)
      case ts.SyntaxKind.TemplateSpan:
        return extractTemplateSpan(node as ts.TemplateSpan);
      case ts.SyntaxKind.Identifier:
        return extractIdentifier(node as ts.Identifier);
      case ts.SyntaxKind.CallExpression:
        return extractCallExpression(node as ts.CallExpression);
      case ts.SyntaxKind.VariableDeclarationList:
        return extractVariableDeclarationList(node as ts.VariableDeclarationList);
      case ts.SyntaxKind.FirstStatement:
        return extractFirstStatement(node as ts.VariableStatement);
      case ts.SyntaxKind.StringLiteral:
        return extractStringLiteral(node as ts.StringLiteral);
      case ts.SyntaxKind.TaggedTemplateExpression:
        return extractTaggedTemplateExpression(node as ts.TaggedTemplateExpression)

    }
  }
  function extractCssSelectorWorkNodes(nodes){
    return nodes.map(extractCssSelectorWork)
  }

  return extractCssSelectorWork(node)
}
export default class CssSelectorParser{

  constructor(typescript: Ts,languageService: ts.LanguageService,tsHelp: TsHelp){
    this.typescript = typescript
    this.languageService = languageService
    this.tsHelp = tsHelp
  }
  typescript:Ts
  languageService: ts.LanguageService
  tsHelp: TsHelp
  parseCssSelector(node: ts.JsxElement | undefined,fileName){
    let languageService = this.languageService
    if(!node || node.kind != ts.SyntaxKind.JsxElement){
      return undefined
    }
    const extractClassNameNode =  extractCssSelectorWorkWrap({
      node,languageService,tsHelp:this.tsHelp,fileName
    })

    console.log(extractClassNameNode)
    let aa = this.flatClassNameChildrenNodes(extractClassNameNode)
    console.log(aa);
    
    return extractClassNameNode
  }
  flatClassNameChildrenNodes(node){

    const flatArrayFn = (node)=>{
      let flatArray:any = []
      if(Array.isArray(node)){
        node.map((item)=>{
          let flatItem = flatNodes(item)
          if(Array.isArray(flatItem)){
            flatArray = [...flatArray,...flatItem]
          }else{
            flatArray = [...flatArray,flatItem]
          }
        })
        return flatArray
      }else{
        return node
      }
    }
    const flatNodes = (node)=>{
      if(node.tsNode && node.tsNode.kind == ts.SyntaxKind.JsxElement){
        let arrays = node.children || []
        let className = node.className || []
        let flatArray:any[] = []
        arrays.map((item)=>{
          let flatItem = flatNodes(item)
          if(Array.isArray(flatItem)){
            flatArray = [...flatArray,...flatItem]
          }else{
            flatArray = [...flatArray,flatItem]
          }
        })
        node.children = flatArray
        node.className = flatArrayFn(className)
        return node
      }else{
        return flatArrayFn(node)
      } 
    }

    return flatNodes(node)

  }



}

namespace CssSeleect {



}


// containerKind:
// undefined
// containerName:
// ''
// contextSpan:
// {start: 533, length: 158}
// failedAliasResolution:
// false
// fileName:
// 'example/index.tsx'
// isAmbient:
// false
// isLocal:
// true
// kind:
// 'function'
// name:
// 'ShowMemeber'
// textSpan:
// {start: 519, length: 11}
// unverified:
// false



// containerKind:
// undefined
// containerName:
// 'JSX.IntrinsicElements'
// contextSpan:
// {start: 141545, length: 83}
// failedAliasResolution:
// false
// fileName:
// 'example/node_modules/@types/react/index.d.ts'
// isAmbient:
// true
// isLocal:
// false
// kind:
// 'property'
// name:
// 'div'
// textSpan:
// {start: 141545, length: 3}
// unverified:
// false