

import { getCSSLanguageService, getSCSSLanguageService, TextDocument} from 'vscode-css-languageservice'
import * as ts from 'typescript'
import * as Nodes from 'vscode-css-languageservice/lib/esm/parser/cssNodes'
import { findResult, flatten, omitUndefined } from '../utils/utils'
import { CssTextDocument, getScssService } from '../service/cssService'
import StyleSheetScan from "./styleSheetScan"
import logger from '../service/logger'



const cssService = getScssService()


export function extractStyleSheetSelectorWorkWrap(styleSheet:Nodes.Stylesheet,position:number,cssDoc:CssTextDocument){
  let  targetNode: Nodes.Node | undefined
  function extractSelector(node: Nodes.Selector) {
    let children = node.getChildren()
    let child =  children.find((node)=>extractSimpleSelector(node as Nodes.SimpleSelector));
    let text = node.getText()
    if(child){
      // let _text = text.slice(0,child.offset+ child.length)
      return text.slice(0,child.offset+ child.length) + '{}'
    }
    return undefined
  }
  function extractSimpleSelector(node: Nodes.SimpleSelector) {
    //.name.age
    // let {  getSelectors,getDeclarations } = node
    let currentNodeOffset = cssDoc.getOffsetInFile(node.offset)
   
    if(currentNodeOffset <= position && position <= (currentNodeOffset + node.length)){
      let children = node.getChildren()
      children.find(node=>{
        let currentNodeOffset = cssDoc.getOffsetInFile(node.offset)
        if(currentNodeOffset <= position && position <= (currentNodeOffset + node.length)){
          targetNode = node
          return node
        }
      })
      // targetNode = node
      return node
    }
    
  }
  function extractRuleset(node: Nodes.RuleSet) {
    const selectors = node.getSelectors().getChildren()
    const declarations = cssService.getRulesetsOfDeclartions(node.getDeclarations())
    let selectorResult = findResult(selectors,_node => extractSelector(_node as any))
    if(selectorResult){
      return selectorResult
    }
    selectorResult = findResult(declarations,node => extractRuleset(node as Nodes.RuleSet))
    if(selectorResult){
      let text = `${node.getSelectors().getText()}{${selectorResult}}`
      return text
    }
  }
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