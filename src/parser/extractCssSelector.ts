


type Ts  = typeof import("typescript")
// import  from 'typescript/lib/tsserverlibrary'
import * as ts from 'typescript'
import TsHelp from '../service/tsHelp'
import { findResult, flatten, unique } from '../utils/utils'
import { containerNames ,cssSelectors} from './types'

export type JsxElementNode = {
  type: "styledElement"| 'intrinsicElements',
  selectors: ts.Node[],
  children: JsxElementNode[],
  tsNode: ts.Node,
}
type CssSelectorNode = {
  type: keyof typeof cssSelectors
  tsNode:  ts.Node[]
}[]





export default function extractCssSelectorWorkWrap ({ node,languageService, tsHelp,  }:{node:ts.Node,languageService:ts.LanguageService, tsHelp: TsHelp}):JsxElementNode[]{
  const sourceFile = node.getSourceFile()
  let fileName = sourceFile.fileName

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
  function extractJsxElement(node: ts.JsxElement):JsxElementNode{
    console.log(languageService);
    let sourceFile = node.getSourceFile()
    let { attributes } = node.openingElement;
    let program = languageService.getProgram()

    let identiferNode = ts.forEachChild(node.openingElement,(node)=>{
      if(node.kind == ts.SyntaxKind.Identifier){
        return node
      }
    }) as ts.Node
    // let isIntrinsicElement = true
    console.log(node.getFullText(),'-----');
    let identiferNodeReferences = languageService.getDefinitionAtPosition(sourceFile.fileName,identiferNode.getStart()) || []
    // let defineNodes = identiferNodeReferences.map(identiferNode =>{
    //   let sourceFile = program?.getSourceFile(identiferNode.fileName)
    //   return tsHelp.findNode(sourceFile!,identiferNode.contextSpan?.start!)
    // })
    let isStyledComponentElement = !!identiferNodeReferences.find(tsHelp.isStyledComponentElement);

    let isIntrinsicElement = !!identiferNodeReferences?.find(tsHelp.isIntrinsicElement);
  

    let customDefineElement = identiferNodeReferences?.filter(tsHelp.isFunctionComponent) || [];
    let customComponentDefine = customDefineElement.map(defineNode=>{
      let sourceFile = program?.getSourceFile(defineNode.fileName)
      if(!sourceFile || !defineNode.contextSpan){
        return
      }
      return  tsHelp.findNodeByRange(sourceFile,defineNode.contextSpan?.start,defineNode.contextSpan.start + defineNode.contextSpan.length)
    }) || []

    // let customComponentRenderChildrenwithoutStyled = customComponentDefine.map(extractCssSelectorWork).filter(node => {
    let customComponentRenderChildren = customComponentDefine.map(extractCssSelectorWork)
    customComponentRenderChildren = flatten(customComponentRenderChildren,{deep:true});
    const isFunctionComponentElementChildren = (node)=>{
      return node && node.tsNode.kind != ts.SyntaxKind.TaggedTemplateExpression
    }
    let customComponentRenderChildrenWithoutStyled = customComponentRenderChildren.filter(node => {
      // console.log(identiferNode.getText(),);
      
      if(Array.isArray(node)){
        return node.filter(isFunctionComponentElementChildren).length
      }
      return isFunctionComponentElementChildren(node)
    })
    let customComponentStyled = customComponentRenderChildren.filter(node=>{
      return !isFunctionComponentElementChildren(node)
    })

    console.log(node.getFullText(),'2222');
    

    let selectors = ts.forEachChild(attributes,extractCssSelectorWork,extractCssSelectorWorkNodes)
    let children =  ts.forEachChild(node,extractCssSelectorWork,extractCssSelectorWorkNodes)
    children = children.filter(child => child)
    children = flatten(children,{deep: true})
    if(isIntrinsicElement){
      selectors.unshift({
        type:  cssSelectors.element,
        tsNode: identiferNode,
      })
    }else{
      if(isStyledComponentElement){
        selectors.unshift({
          type:  cssSelectors.element,
          tsNode: customComponentStyled[0].tag.name,
        })
      }else{

      }
      console.log(identiferNode);
      
    }
    return {
      type: isIntrinsicElement ? "intrinsicElements" : "styledElement",
      selectors: flatten(selectors,{deep:true}),
      children: [...children,...customComponentRenderChildrenWithoutStyled],
      tsNode:node,
    }
  }
  function extractJsxAttribution(node: ts.JsxAttribute):CssSelectorNode{
    let selectorAttributions:any[] = ['className','id']
    let escapedTextSelector = node.name.escapedText  as string
    if(selectorAttributions.includes(node.name.escapedText)){
      let selectors = flatten(extractCssSelectorWork(node.initializer),{deep:true}) || []
      if(!Array.isArray(selectors)){
        selectors = [selectors] 
      }
      return selectors.map(selector=>{
        return {
          type: cssSelectors[escapedTextSelector],
          tsNode: selector,
        }
      })
    }
    return []
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
    console.log(ts.SyntaxKind[node.kind],"----------");console.log(node.getFullText());
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