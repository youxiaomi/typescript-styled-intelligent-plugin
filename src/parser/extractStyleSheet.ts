

import { getCSSLanguageService, getSCSSLanguageService, TextDocument} from 'vscode-css-languageservice'
import * as ts from 'typescript'
import { NodeType, Node, RuleSet} from 'vscode-css-languageservice/lib/umd/parser/cssNodes'
import * as Nodes from 'vscode-css-languageservice/lib/umd/parser/cssNodes'
import { findResult, flatten, omitUndefined } from '../utils/utils'
import { JsxElementNode, JsxElementSelector, CandidateTextNode } from '../parser/extractCssSelector'
import { CssTextDocument, getScssService } from '../service/cssService'
import StyleSheetScan from "./styleSheetScan"



const cssService = getScssService()


export function extractStyleSheetSelectorWorkWrap(styleSheet:Nodes.Stylesheet,position:number,cssDoc:CssTextDocument){
  let  targetNode: Nodes.Node | undefined
  function extractSelector(node: Nodes.Selector) {
    console.log(node.getText(),'selector',NodeType[node.type]);
    
    let children = node.getChildren()
    let child =  children.find((node)=>extractSimpleSelector(node as Nodes.SimpleSelector));
    let text = node.getText()
    if(child){
      let _text = text.slice(0,child.offset+ child.length)
      // styleSheetScan.setText(_text, {type:'cssNode', node: child } )
      // styleSheetScan.setText('{',{type:"braceOpen"})
      // styleSheetScan.setText('}',{type:"braceClose"})
      return text.slice(0,child.offset+ child.length) + '{}'
    }
    return undefined
  }
  function extractSimpleSelector(node: Nodes.SimpleSelector) {
    //.name.age
    // let {  getSelectors,getDeclarations } = node
    console.log(node.getText(),'SimpleSelector',NodeType[node.type]);
    // if(node.offset == 40){
    //   console.log(node)
    // }
    let currentNodeOffset = cssDoc.getOffsetInFile(node.offset)
   
    if(currentNodeOffset <= position && position <= (currentNodeOffset + node.length)){
      targetNode = node
      return node
    }
    
    
    // let children = node.getChildren();
    // let text = node.getText()
    // let child = children.find((node)=>extractIdentifier(node as Nodes.Identifier));
    // if(child){
    //   return text.slice(0,child.offset+ child.length) + '{}'
    // }
    // return undefined
  }
  function extractIdentifier(node: Nodes.Identifier) {
    // let {  getSelectors,getDeclarations } = node
    // let children = node.getChildren()
    // return children.map(extractStyleSheetSelectorWork)
    if(node.offset <= position && position <= node.offset + node.length){
      return
    }
    // return {
    //   cssNode: node,
    // }
  }
  function extractIdentifierSelector(node: Node) {
    // let {  getSelectors,getDeclarations } = node
    // let children = node.getChildren()
    // return children.map(extractStyleSheetSelectorWork)
    return {
      cssNode: node,
    }
  }
  
  function extractClass(node: Node) {
    // let {  getSelectors,getDeclarations } = node
    let children = node.getChildren()
    // return children.map(extractStyleSheetSelectorWork)
  }
  // function extractDeclarations(node: Nodes.RuleSet) {
  //   let children = node.getChildren()


  
  //   return children.map(extractStyleSheetSelectorWork)
  // }
  function extractRuleset(node: Nodes.RuleSet) {
    const selectors = node.getSelectors().getChildren()
    // const _declarations = node.getDeclarations()
    // const declarations = _declarations ? _declarations.getChildren() : []
    const declarations = cssService.getRulesetsOfDeclartions(node.getDeclarations())
    // const extractSelectors = selectors.map(extractStyleSheetSelectorWork).filter(item => item)
    // const extractSelectors = omitUndefined(selectors.map(extractUndefined))
    // const extractSelectors = omitUndefined(selectors.map(_node => extractSelector(_node as any)))
    let selectorResult = findResult(selectors,_node => extractSelector(_node as any))
    if(selectorResult){
      return selectorResult
    }
    selectorResult = findResult(declarations,node => extractRuleset(node as Nodes.RuleSet))
    if(selectorResult){


      let text = `${node.getSelectors().getText()}{${selectorResult}}`
      return text
    }
    // const extractChildrenSelectors = declarations.find();

    // return {
    //   type: 'ruleSet',
    //   cssNode: node,
    //   selectors: extractSelectors,
    //   children: extractChildrenSelectors,
    // }
  }
  function extractUndefined(node: Node) {
    //ruleset 的子级 selector
    let children = node.getChildren();
    console.log(node.getText(),'SimpleSelector',NodeType[node.type]);
  
    // return children.map(extractStyleSheetSelectorWork)
    let result = omitUndefined(children.map((node)=>extractSelector(node  as Nodes.Selector)))
    if(result.length){
      return result.join('')
    }
  }
  
  // function extractStyleSheetSelectorWork(node: Node) {
  
  //   switch (node.type) {
  //     case NodeType.Ruleset:
  //       return extractRuleset(node as Nodes.RuleSet);
  //     case NodeType.Undefined:
  //       return extractUndefined(node);
  //     case NodeType.Selector:
  //       return extractSelector(node as Nodes.Selector);
  //     case NodeType.SimpleSelector:
  //       return extractSimpleSelector(node as Nodes.SimpleSelector);
  //     case NodeType.ClassSelector:
  //       return extractClass(node);
  //     case NodeType.Identifier:
  //       return extractIdentifier(node as Nodes.Identifier);
  //     case NodeType.IdentifierSelector:
  //       return extractIdentifierSelector(node);
  //     case NodeType.Declarations:
  //     case NodeType.Stylesheet:
  //       return extractDeclarations(node as Nodes.Declarations);
  //   }
  // }
  let ruleSet = styleSheet.getChild(0) as Nodes.RuleSet
  let cssText =  extractRuleset(ruleSet)
  if(cssText){
    let cssDoc = cssService.getDefaultCssTextDocument(cssText)
    return {
      styleSheet:cssService.getScssStyleSheet(cssDoc),
      targetNode,
    }
  }
}