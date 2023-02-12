


// type Ts  = typeof import("typescript")
// import  from 'typescript/lib/tsserverlibrary'
import * as ts from 'typescript/lib/tsserverlibrary'
import { DomSelector } from '../factory/nodeFactory'
import logger from '../service/logger'
import TsHelp from '../service/tsHelp'
import { findResult, flatten, unique ,omitUndefined, noop} from '../utils/utils'
import { containerNames ,cssSelectors} from './types'

type JsxElementNodeCommonDefault = {
  children?: JsxElementNode[],
  tsNode: ts.Node,
}
export type CandidateTextNode =  JsxElementNodeCommonDefault & {
  type: 'textNode',
  text: string,
  offset: number,
  parent?: JsxElementSelector
}
export type JsxElementSelector = {
  type: "selectorNode"
  selectorType: keyof typeof cssSelectors,
  children?: CandidateTextNode[],
  tsNode: ts.Node,
  parent?: StyledElement,
}
type TaggedTemplateExpression =  JsxElementNodeCommonDefault &  {
  type: 'TaggedTemplateExpression',
  tag: ts.LeftHandSideExpression,
  tagName: string,
  parent?,
  // templateString:string
}
type TsNode  = JsxElementNodeCommonDefault &  {
  type: 'tsNode',
  parent?
}

export type StyledElement = JsxElementNodeCommonDefault & {
  type: "styledElement" | 'intrinsicElements'
  selectors: JsxElementSelector[],
  parent?: StyledElement
}

export type JsxElementNode = CandidateTextNode | TaggedTemplateExpression | StyledElement | TsNode




export default function extractCssSelectorWorkWrap ({ node,languageService, tsHelp, typescript }:{node:ts.Node,languageService:ts.LanguageService, tsHelp: TsHelp,typescript: typeof ts}):JsxElementNode[]{
  const sourceFile = node.getSourceFile()
  let fileName = sourceFile.fileName
  let ts = typescript
  function extractVariableStatement(node: ts.VariableStatement){
    return ts.forEachChild(node.declarationList,extractCssSelectorWork) || []
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
    let results:JsxElementNode[] = []
    returnStatements.forEach((statement) => {
      let expressionResult = extractCssSelectorWork(statement.expression) || []
      results = [...results,...expressionResult]
    })
    return results
  }
  function extractConditionalExpression(node: ts.ConditionalExpression){
    let {whenFalse,whenTrue} = node
    let nodes = [
      whenFalse,
      whenTrue
    ].filter(item => item);
    let references = nodes.map(node=>{  
      return extractCssSelectorWork(node) || []
      // return (languageService.getDefinitionAtPosition(fileName,node.pos+1)||[]).filter(reference =>  reference)
    })

    return  flatten(references)
  }

  function extractJsxElement2(node: ts.JsxElement){
    logger.info(node.getFullText())
    let sourceFile = node.getSourceFile()
    
    const openingElement = node.openingElement;
    const children = node.children
    // let identiferNode = tsHelp.getDefinitionLastNodeByIdentiferNode(node.openingElement);
    // let identiferNode = tsHelp.getJsxOpeningElementIdentier(node.openingElement);
    // let identiferNodeReference = (tsHelp.getReferenceNodes(sourceFile.fileName,identiferNode.getStart()) || [])[0];
    //instrinsic ele
    const { attributes } = openingElement

    function extractJsxAttribute(node){
      // let nodes = _nodes  as  ts.NodeArray<ts.JsxAttribute>
      // nodes
      // return nodes
      return extractCssSelectorWork(node)
    }
    // function extractJsxExpress(node:ts.JsxExpression){

    // }
    // if(identiferNodeReference){
    //   attributes.properties.map(extractCssSelectorWork);
    //   children.map(extractCssSelectorWork)
    //   let  node =  identiferNodeReference as ts.FunctionDeclaration;
    //   let {  body  } = node;

    // }







  }

  function extractJsxElement(node: ts.JsxElement):StyledElement{
    let sourceFile = node.getSourceFile()
    let { attributes } = node.openingElement;
    let program = languageService.getProgram()
    extractJsxElement2(node)
    // let identiferNode = ts.forEachChild(node.openingElement,(node)=>{
    //   if(node.kind == ts.SyntaxKind.Identifier){
    //     return node
    //   }
    // }) as ts.Node
    let identiferNode = tsHelp.getDefinitionLastNodeByIdentiferNode(node.openingElement);
    // let isIntrinsicElement = true
    console.log(node.getFullText(),'-----');
    let identiferNodeReferences = languageService.getDefinitionAtPosition(sourceFile.fileName,identiferNode.getStart()) || []
    // let defineNodes = identiferNodeReferences.map(identiferNode =>{
    //   let sourceFile = program?.getSourceFile(identiferNode.fileName)
    //   return tsHelp.findNode(sourceFile!,identiferNode.contextSpan?.start!)
    // })
    let identiferNodeReference = (languageService.getDefinitionAtPosition(sourceFile.fileName,identiferNode.getStart()) || [])[0]

    // let isStyledComponentElement = !!identiferNodeReferences.find(tsHelp.isStyledComponentElement);
    let isStyledComponentElement = tsHelp.isStyledComponentElement(identiferNodeReference)

    // let isIntrinsicElement = !!identiferNodeReferences?.find(tsHelp.isIntrinsicElement);
    let isIntrinsicElement = tsHelp.isIntrinsicElement(identiferNodeReference)
    

    // let customDefineElement = identiferNodeReferences?.filter(tsHelp.isFunctionComponent) || [];
    console.log(ts.ScriptKind[identiferNode.kind]);
    

    let customDefineElement = tsHelp.isFunctionComponent(identiferNodeReference);
    // let isFucntion
    if(tsHelp.isFunctionComponent(identiferNodeReference)){


    }
   


    let customComponentDefine = [identiferNodeReference].map(defineNode=>{
      let sourceFile = program?.getSourceFile(defineNode.fileName)
      if(!sourceFile || !defineNode.contextSpan){
        return
      }
      return  tsHelp.findNodeByRange(sourceFile,defineNode.contextSpan?.start,defineNode.contextSpan.start + defineNode.contextSpan.length)
    }) || []

    // let customComponentRenderChildrenwithoutStyled = customComponentDefine.map(extractCssSelectorWork).filter(node => {
    let _customComponentRenderChildren = customComponentDefine.map((node)=>{
      return extractCssSelectorWork(node) || []
    })
    let customComponentRenderChildren = flatten(_customComponentRenderChildren,{deep:true});
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

    
    const getSelectors = (node: ts.JsxAttribute): JsxElementSelector[]=>{
      let selectorAttributions:any[] = ['className','id']
      let escapedTextSelector = node.name.escapedText  as string
      if(selectorAttributions.includes(node.name.escapedText)){
        let resultInit = extractCssSelectorWork(node.initializer) as CandidateTextNode[]
        let selectors = resultInit || []
        let currentNode:JsxElementSelector =  {
          type: "selectorNode",
          tsNode: node.initializer as ts.Node,
          selectorType: cssSelectors[escapedTextSelector],
          children: [],
        }
        selectors = selectors.map(selector=>{
          selector.parent = currentNode
          return selector
        })
        currentNode.children = selectors
        return  [
          currentNode
        ]
        
      }
      return []
    }

    let selectors = ts.forEachChild(attributes,(node)=>getSelectors(node as ts.JsxAttribute),(nodes)=>flatten(nodes.map((node)=>getSelectors(node as ts.JsxAttribute)))) || []
    let children =  ts.forEachChild(node,extractCssSelectorWork,extractCssSelectorWorkNodes) || []
    

    children = children.filter(child => child)
    // children = flatten(children,{deep: true})

    if(isIntrinsicElement){
      selectors.unshift({
        // type:  cssSelectors.element,
        type: 'selectorNode',
        selectorType: 'element',
        tsNode: identiferNode,
      })
    }else{
      if(isStyledComponentElement){
        let tsNode = customComponentStyled[0].tsNode as ts.TaggedTemplateExpression 
        let tag = tsNode.tag as any
        tag && tag.name && selectors.unshift({
          type: 'selectorNode',
          selectorType: 'element',
          // :  cssSelectors.element,
          // tsNode: tsNode.tag.name,
          tsNode: tag.name,
        })
      }else{

      }
      console.log(identiferNode);
    }
    const currentNode:StyledElement = {
      type: isIntrinsicElement ? "intrinsicElements" : "styledElement",
      // selectors: flatten(selectors,{deep:true}),
      selectors: selectors as JsxElementSelector[],
      children: [...children,...customComponentRenderChildrenWithoutStyled],
      tsNode:node,
    }
    currentNode.children = (currentNode.children || []).map(child=>{
      child.parent = currentNode
      return child
    })
    currentNode.selectors = currentNode.selectors.map(selector=>{
      selector.parent = currentNode
      return selector
    })
    return currentNode 
  }
  // function extractJsxAttribution(node: ts.JsxAttribute):JsxElementNode[]{
  //   let selectorAttributions:any[] = ['className','id']
  //   let escapedTextSelector = node.name.escapedText  as string
  //   if(selectorAttributions.includes(node.name.escapedText)){
  //     let resultInit = extractCssSelectorWork(node.initializer)
  //     // let selectors = flatten(resultInit,{deep:true}) || []
  //     let selectors = resultInit
  //     // if(!Array.isArray(selectors)){
  //     //   selectors = [selectors] 
  //     // }
  //     return [
  //       {
  //         type: "selectorNode",
  //         tsNode: node.initializer as ts.Node,
  //         selectorType: cssSelectors[escapedTextSelector],
  //         children: selectors
  //       }
  //     ]
  //     // return selectors.map(selector=>{
  //     //   return {
  //     //     // type: cssSelectors[escapedTextSelector],
  //     //     type: "selector",
  //     //     tsNode: selector.tsNode,
  //     //   }
  //     // })
  //   }
  //   return []
  // }
  function extractJsxExpress(node: ts.JsxExpression){
    return extractCssSelectorWork(node.expression)
  }
  function extractTemplateExpression(node: ts.TemplateExpression):JsxElementNode[]{
    let { head ,templateSpans} = node
    let templateSpansNodes = flatten(templateSpans.map((node)=>extractCssSelectorWork(node) || []))
    let headText = head.text.trim()
    let domSelector = new DomSelector(head,typescript);
    domSelector.selectors.forEach(selector=>{
      templateSpansNodes.unshift({
        type: "textNode",
        text: selector.text,
        offset: selector.offset,
        tsNode: head
      })
    })

    // let classNames = headText.split(' ').filter(item => item)
    // if(classNames.length){
    //   classNames.forEach(className=>{
    //     templateSpansNodes.unshift({
    //       type: "textNode",
    //       text: className,
    //       tsNode: head
    //     })
    //   })
    // }
    return templateSpansNodes
  }
  function extractTemplateSpan(node: ts.TemplateSpan){
    let { literal ,expression} = node
    let templateSpanNode = extractCssSelectorWork(expression) || []
    let domSelector = new DomSelector(literal,typescript)
    domSelector.selectors.forEach(selector=>{
      templateSpanNode.push({
        type: "textNode",
        text: selector.text,
        offset: selector.offset,
        tsNode: literal,
      })
    })
    // if(literal.text.trim()){
    //   // templateSpanNode.push(literal)
    //   templateSpanNode.push({
    //     type: "textNode",
    //     text: literal.text.trim(),
    //     tsNode: literal,
    //   })
    // }
    return templateSpanNode
  }
  function extractIdentifier(node: ts.Identifier){
    let definitionNodes = tsHelp.getDefinitionNodes(fileName,node.getStart());
    let validNodes = definitionNodes.filter((refNode)=>{
      return refNode
    })
    let result = validNodes.map((node)=>extractCssSelectorWork(node) || [])
    return  flatten(result)
    let nodes = validNodes.map(node =>{
      // return tsServer.findNodeByRange(node)
    })
  }
  function extractCallExpression(node: ts.CallExpression){
    let {  expression,arguments:_arguments }  = node
    let functionNode = omitUndefined(tsHelp.getDefinitionNodes(fileName,node.getStart()))[0];
    function parseFunction(node: ts.FunctionDeclaration,_arguments: ts.NodeArray<ts.Expression>){
      let { body } = node
      let results = extractCssSelectorWork(body);
      let newResults:JsxElementNode[] = []
      results?.forEach(result=>{
        if(result.tsNode && result.tsNode.parent == functionNode && result.type == 'tsNode' && result.tsNode.kind == ts.SyntaxKind.Parameter){
          let paramsResults =  extractCssSelectorWork(_arguments[0])//
          if(paramsResults){
            newResults = newResults.concat(paramsResults)
          }
          return
        }
        newResults.push(result)
      })
      return newResults
    }
    if(expression.kind == ts.SyntaxKind.PropertyAccessExpression){
      if((expression as ts.PropertyAccessExpression).name.escapedText == 'map' ){
        return extractCssSelectorWork(_arguments[0])
      }
    }
    //TODO params jsxelement
    
    return parseFunction(functionNode as ts.FunctionDeclaration,_arguments)
    // return  extractCssSelectorWork(expression)
  }
  function extractVariableDeclarationList(node: ts.VariableDeclarationList){
    return ts.forEachChild(node,extractCssSelectorWork) || []
  }
  function extractFirstStatement(node: ts.VariableStatement){
    // extractCssSelectorWork(node.expression)
    // let { literal ,expression} = node
    let { declarationList }  = node
    // extractCssSelectorWork(declarationList)
    return ts.forEachChild(declarationList,extractCssSelectorWork) || []
  }
 
  
  function extractStringLiteral(node: ts.StringLiteral):JsxElementNode[]{
    let { text,} = node
    let classNames:JsxElementNode[] = []
    let domSelector = new DomSelector(node,typescript)
    domSelector.selectors.forEach(selector=>{
      classNames.push({
        type: "textNode",
        text: selector.text,
        offset: selector.offset,
        tsNode: node,
      })
    })

    return classNames
    // return [
    //   {
    //     type: "textNode",
    //     text: text,
    //     tsNode: node,
    //   }
    // ]
  }
  function extractNoSubstitutionTemplateLiteral(node):JsxElementNode[]{
      return extractStringLiteral(node as ts.StringLiteral)
  }
  function extractTaggedTemplateExpression(node: ts.TaggedTemplateExpression):JsxElementNode{
    const  { tag,template } = node
    let tagName = ''
    // todo
    //  ts.PropertyAccessExpression  ts.SyntaxKind.CallExpression  
    // args identifier -> ts.TaggedTemplateExpression 
    // args identifier -> ts.FunctionDeclartion->
    let templateString = ''




    function getExtendStyled(node: ts.TaggedTemplateExpression){
      const  { tag,template } = node
      if(tag.kind == ts.SyntaxKind.CallExpression){
        let { expression, arguments: _arguments   } = tag as ts.CallExpression;
        if(expression.getText()== 'styled'){
          let styledComponentIndentifer = _arguments[0]
          let styledComponentNode = tsHelp.getDefinitionLastNodeByIdentiferNode(styledComponentIndentifer);
          if(styledComponentNode.kind == ts.SyntaxKind.FirstStatement){
            let { declarationList  } = styledComponentNode as ts.VariableStatement
            return ts.forEachChild(declarationList,(node)=>{
              if(node.kind == ts.SyntaxKind.VariableDeclaration){
                let variableDeclarationNode = node  as ts.VariableDeclaration
                if(variableDeclarationNode.initializer && variableDeclarationNode.initializer?.kind == ts.SyntaxKind.TaggedTemplateExpression ){
                  return getExtendStyled(variableDeclarationNode.initializer as ts.TaggedTemplateExpression)
                }
              }
            }) as JsxElementNode
          }
        }
        throw new Error('tag give fail')
      }else{
        const _tag = tag as  ts.PropertyAccessExpression
        tagName = _tag.name.escapedText.toString()
        //
        // templateString += '/n'
        // templateString += template.getFullText()
      }
    }
    getExtendStyled(node)


    

    //todo  提取css对象 关联上同级className
    return {
      type: "TaggedTemplateExpression",
      tagName: tagName,
      tag: tag,
      tsNode: node,
      // templateString
    }
    // extractCssSelectorWork(node.expression)
    // let { literal ,expression} = node

  }

  function extractJsxAttribute(node: ts.JsxAttribute){
    const { name, initializer } = node
    
    return []

  }
  function extractArrayLiteralExpression(node: ts.ArrayLiteralExpression){
    const { elements } = node
    let result = omitUndefined( elements.map(extractCssSelectorWork))
    return flatten(result)
  }

  
  function extractCssSelectorWork(node: ts.Node| undefined):JsxElementNode[]|undefined{
    if(!node){
      return []
    }
    logger.info(ts.SyntaxKind[node.kind],"----------");console.log(node.getFullText());
    switch (node?.kind){
      case ts.SyntaxKind.VariableStatement: 
        return extractVariableStatement(node as ts.VariableStatement);
      case ts.SyntaxKind.VariableDeclaration:
        return extractVariableDeclaration(node as ts.VariableDeclaration);
      case ts.SyntaxKind.ArrowFunction:
      case ts.SyntaxKind.FunctionDeclaration:
        return extractArrowFunction(node as ts.ArrowFunction)
      case ts.SyntaxKind.Block:
        return extractBlock(node as ts.Block)
      case ts.SyntaxKind.ConditionalExpression:
        return extractConditionalExpression(node as ts.ConditionalExpression)
      case ts.SyntaxKind.JsxElement:
        return [extractJsxElement(node as ts.JsxElement)];
      // case ts.SyntaxKind.JsxAttribute:
      //   return extractJsxAttribution(node as ts.JsxAttribute);
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
      case ts.SyntaxKind.FirstTemplateToken:
        return extractNoSubstitutionTemplateLiteral(node as ts.NoSubstitutionTemplateLiteral);
      case ts.SyntaxKind.TaggedTemplateExpression:
        return [extractTaggedTemplateExpression(node as ts.TaggedTemplateExpression)]
      // case ts.SyntaxKind.PropertyAccessExpression:
      //   return extractPropertyAccessExpression(node as ts.PropertyAccessExpression)
      case ts.SyntaxKind.ArrayLiteralExpression:
        return extractArrayLiteralExpression(node as ts.ArrayLiteralExpression);
      // case ts.SyntaxKind.JsxAttribute:
      //   return extractJsxAttribute(node as ts.JsxAttribute)
      case ts.SyntaxKind.Parameter:
        return [ { type: "tsNode",tsNode: node }]
      default:
        return undefined
    }
  }
  function extractCssSelectorWorkNodes(nodes: ts.NodeArray<ts.Node>){
    return flatten(nodes.map((node)=>extractCssSelectorWork(node) || []))
  }

  return extractCssSelectorWork(node) || []
}