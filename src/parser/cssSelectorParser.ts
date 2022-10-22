


type Ts  = typeof import("typescript")
// import  from 'typescript/lib/tsserverlibrary'
import * as ts from 'typescript'
import TsHelp from '../service/tsHelp'

function extractCssSelectorWrokWrap ({ node,languageService, tsHelp, fileName }:{node,languageService:ts.LanguageService, tsHelp: TsHelp, fileName}){
  // return extractCssSelectorWrok()
  function extractVariableStatement(node: ts.VariableStatement){
    return ts.forEachChild(node.declarationList,extractCssSelectorWrok)
  }
  function extractVariableDeclaration(node: ts.VariableDeclaration){
    let { initializer } = node
    return extractCssSelectorWrok(initializer)
  }
  function extractArrowFunction(node: ts.ArrowFunction){
    let { body } = node
    return extractCssSelectorWrok(body);
  }
  function extractBlock(node: ts.Block){
    let { statements = [] } = node
    let returnStatements =  statements.filter(statement=>{
      return statement.kind == ts.SyntaxKind.ReturnStatement
    })  as ts.ReturnStatement[]
    return returnStatements.map((statement) => extractCssSelectorWrok(statement.expression))
  }
  function extractConditionalExpression(node: ts.ConditionalExpression){
    let {whenFalse,whenTrue} = node
    let nodes = [
      whenFalse,
      whenTrue
    ].filter(item => item);
    let references = nodes.map(node=>{  
      return extractCssSelectorWrok(node)
      // return (languageService.getDefinitionAtPosition(fileName,node.pos+1)||[]).filter(reference =>  reference)
    })

    return  references
  }
  function extractJsxElement(node: ts.JsxElement){
    console.log(languageService);
    
    if(!node.openingElement){
      debugger
    }
    let sourceFile = node.getSourceFile()
    let { attributes } = node.openingElement;

    //  todo  死循环
    let identiferNode = ts.forEachChild(node.openingElement,(node)=>{
      if(node.kind == ts.SyntaxKind.Identifier){
        return node
      }
    });
    let customElementChildrens:any[] = []
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

      customElementChildrens = customElementNodes?.map(extractCssSelectorWrok).filter(node => node)
    }
    
    console.log(node.getFullText(),'2222');
    

    let classNames = ts.forEachChild(attributes,extractCssSelectorWrok)
    let chidlrens =  ts.forEachChild(node,extractCssSelectorWrok,extractCssSelectorWrokNodes)
    chidlrens = chidlrens.filter(child => child)
    return {
      type:'jsxElement',
      classNames: classNames,
      childrens: [...chidlrens,...customElementChildrens],
      tsNode:node,
    }
  }
  function extractJsxAttribution(node: ts.JsxAttribute){
    node.initializer
    if(node.name.escapedText == 'className'){
      return extractCssSelectorWrok(node.initializer)
    }
  }
  function extractJsxExpress(node: ts.JsxExpression){
    return extractCssSelectorWrok(node.expression)
  }
  function extractTemplateExpression(node: ts.TemplateExpression){
    // extractCssSelectorWrok(node.expression)
    let { head ,templateSpans} = node
    let templateSpansNodes = templateSpans.map(extractCssSelectorWrok)
    if(head.text.trim()){
      templateSpansNodes.unshift(head)
    }
    return templateSpansNodes
  }
  function extractTemplateSpan(node: ts.TemplateSpan){
    // extractCssSelectorWrok(node.expression)
    let { literal ,expression} = node
    let templateSpanNode = [extractCssSelectorWrok(expression)]
    if(literal.text.trim()){
      templateSpanNode.push(literal)
    }
    return templateSpanNode
  }
  function extractIdentifier(node: ts.Identifier){
    // extractCssSelectorWrok(node.expression)
    // let { literal ,expression} = node
    let definitionNodes = tsHelp.getDefinitionNodes(fileName,node.getStart());
    let validNodes = definitionNodes.filter((refNode)=>{
      return refNode
    })
    return validNodes.map(extractCssSelectorWrok)
    let nodes = validNodes.map(node =>{
      // return tsServer.findNodeByRange(node)
    })
  }
  function extractCallExpression(node: ts.CallExpression){
    // extractCssSelectorWrok(node.expression)
    // let { literal ,expression} = node
    let {  expression,arguments:_arguments  }  = node
    return  extractCssSelectorWrok(expression)
  }
  function extractVariableDeclarationList(node: ts.VariableDeclarationList){
    // extractCssSelectorWrok(node.expression)
    // let { literal ,expression} = node
    return ts.forEachChild(node,extractCssSelectorWrok)
  }
  function extractFirstStatement(node: ts.VariableStatement){
    // extractCssSelectorWrok(node.expression)
    // let { literal ,expression} = node
    let { declarationList }  = node
    // extractCssSelectorWrok(declarationList)
    return ts.forEachChild(declarationList,extractCssSelectorWrok)
  }
 
  function extractStringLiteral(node: ts.StringLiteral){
    // extractCssSelectorWrok(node.expression)
    // let { literal ,expression} = node
    let { text,} = node
    return node
  }
  function extractTaggedTemplateExpression(node: ts.TaggedTemplateExpression){
    const  { tag,template } = node
    console.log(template);
    //todo  提取css对象 关联上同级className

    // extractCssSelectorWrok(node.expression)
    // let { literal ,expression} = node

  }
  function extract_(node: ts.Identifier){
    // extractCssSelectorWrok(node.expression)
    // let { literal ,expression} = node

  }
  
  function extractCssSelectorWrok(node: ts.Node| undefined){
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
  function extractCssSelectorWrokNodes(nodes){
    return nodes.map(extractCssSelectorWrok)
  }

  return extractCssSelectorWrok(node)
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
    const extractClassNameNode =  extractCssSelectorWrokWrap({
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
        let arrays = node.childrens || []
        let classNames = node.classNames || []
        let flatArray:any[] = []
        arrays.map((item)=>{
          let flatItem = flatNodes(item)
          if(Array.isArray(flatItem)){
            flatArray = [...flatArray,...flatItem]
          }else{
            flatArray = [...flatArray,flatItem]
          }
        })
        node.childrens = flatArray
        node.classNames = flatArrayFn(classNames)
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