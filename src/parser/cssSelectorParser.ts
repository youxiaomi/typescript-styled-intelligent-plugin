


// import  from 'typescript/lib/tsserverlibrary'
import * as ts from 'typescript/lib/tsserverlibrary'
import { getScssService, TemplateStringContext } from '../service/cssService'
import TsHelp from '../service/tsHelp'
import { findResult, flatten, omitUndefined, unique } from '../utils/utils'
// import extractCssSelectorWorkWrap, { JsxElementNode,CandidateTextNode, JsxElementSelector } from './extractCssSelector3'
import extractCssWork from './extractCssSelector'
import * as CssNode from 'vscode-css-languageservice/lib/umd/parser/cssNodes'
import { extractStyleSheetSelectorWorkWrap } from './extractStyleSheet'
import { createStyleSheetAbstractSyntaxTree, TargetSelector } from '../factory/nodeFactory'
import { JsxParser, ParentReferenceNode } from './jsxParser'
import * as Nodes from 'vscode-css-languageservice/lib/umd/parser/cssNodes'
import logger from '../service/logger'
const NodeType = Nodes.NodeType

export type StyledComponentNode = {
  type: 'styledElement',
  tsNode: ts.Node,
  scssText: string,
  parent: StyledComponentNode[]
}


export default class CssSelectorParser{

  constructor(typescript: typeof ts,languageService: ts.LanguageService,tsHelp: TsHelp){
    this.typescript = typescript
    this.languageService = languageService
    this.tsHelp = tsHelp
  }
  typescript: typeof ts
  languageService: ts.LanguageService
  tsHelp: TsHelp
  /**
   * extracting the dom node css selector
   */
  parseCssSelector = (node: ts.JsxElement | undefined)=>{
    let languageService = this.languageService
    let ts = this.typescript
    if(!node || node.kind != ts.SyntaxKind.JsxElement){
      return []
    }
    return extractCssWork({
      node,languageService,tsHelp:this.tsHelp,typescript: this.typescript
    })
  }
  /**
   * 获取某个字符串的存在的styledComponent组件节点
   */
  getStyledComponentNode = (fileName: string,pos:number):ts.DefinitionInfoAndBoundSpan | undefined=>{
    let program = this.languageService.getProgram()
    let sourceFile = program?.getSourceFile(fileName);
    if(!sourceFile){
      return 
    }
    let node = this.tsHelp.findNode(sourceFile,pos) as ts.Node;
    if(!node){
      return 
    }
    if(!TargetSelector.isValidSelector(node,this.typescript)){
      return undefined
    }
    let targetSelector = new TargetSelector(node, pos,this.typescript)

    const jsxParser = new JsxParser(this.typescript,this.languageService,this.tsHelp)
    let styledComponentNode  = jsxParser.findStyledNodeOfParent(node)
    if(!styledComponentNode.length){
      // jsxParser.findStyledNodeOfParent(node)
      return
    }
    // let styledComponentNode = findStyledNode(node) || []
    let definitions = this.getSelectors([ts.last(styledComponentNode)], targetSelector);
    if(!definitions.length){
      return undefined
    }
    return {
      definitions:definitions,
      textSpan:{
        start: targetSelector.selectorStart,
        length: targetSelector.selectorText.length
      }
    }
  }


  /**
   * 从js语法中提取styleSheet中css selector
   * 
   */
  getSelectors = (styledComponentNode:ParentReferenceNode[],targetSelector:TargetSelector)=>{
    // let isElement = (node:JsxElementNode)=>{
    //   return node.type == 'styledElement' || node.type == 'intrinsicElements'
    // }
    // console.log(styledComponentNode);
    let ts = this.typescript
    const getCandidateSelector = (node:ParentReferenceNode)=>{
      let result: ts.DefinitionInfo[] = []
      if (node.type != 'styledElement') {
        return []
      }
      let { sassText, template, TaggedTemplateNode } = this.tsHelp.getStyledTemplateScss(node.referenceNode) || {}
      let parseCssSelectors = this.parseCssSelector(node.tsNode as ts.JsxElement);
      let cssService = getScssService();
      let definitions: ts.DefinitionInfo[] = []
      parseCssSelectors.forEach(parseCssSelector => {
        let cssScan = cssService.getStyleSheetScanByJsxElementNode(parseCssSelector, targetSelector);
        // new TemplateStringContext();
        let formatStyleSheet = cssService.fromatText(cssService.getDefaultCssTextDocument(cssScan.getText()))
        let cssDoc = cssService.getDefaultCssTextDocument(formatStyleSheet)
        let styleSheet = cssService.getScssStyleSheet(cssDoc)
        let context = new TemplateStringContext(template!, this.tsHelp, this.typescript)
        let doc = cssService.generateCssTextDocument(context)
        let currentStyledComponentStyleSheet = cssService.getScssStyleSheet(doc)
        let targetTree = createStyleSheetAbstractSyntaxTree(currentStyledComponentStyleSheet)
        let sourceTree = createStyleSheetAbstractSyntaxTree(styleSheet)
        logger.info(currentStyledComponentStyleSheet.getText())
        logger.info(styleSheet.getText())
        const { matchSourceNodes, matchTargetNodes } = cssService.matchCssSelectorNodes(targetTree, sourceTree);
        let cssNodes = Array.from(matchTargetNodes).map(item => item.node)
        cssNodes = unique(cssNodes, (pre, current) => pre.offset == current.offset);
        cssNodes = cssNodes.filter(item => {
          let selectorText = item.getText()
          if ([NodeType.ClassSelector, NodeType.IdentifierSelector].includes(item.type)) {
            selectorText = selectorText.slice(1)
          }
          return selectorText == targetSelector.selectorText
        })
        let fileName = context.getFileName();
        cssNodes.map(node => {
          let def = {
            fileName,
            kind: ts.ScriptElementKind.string,
            name: '',
            containerKind: ts.ScriptElementKind.string,
            containerName: '',
            textSpan: {
              // start: doc.getOffsetInFile(cssService.getSelectorIdentierOffset(node)),
              start: doc.getOffsetInFile(node.offset),
              length: node.length
            }
          }
          definitions.push(def)
        })
      })

      console.log(definitions);
      result = result.concat(definitions)
      return result
    }
    let definitions = flatten(styledComponentNode.reverse().map(getCandidateSelector))
    return definitions

  }

  getSelectorCandidateByCssNode(fileName: string, position: number):ts.DefinitionInfoAndBoundSpan | undefined{
    let program = this.languageService.getProgram()
    let sourceFile = program?.getSourceFile(fileName);
    let cssService = getScssService()
    let ts = this.typescript
   
    let templateNode = this.tsHelp.getTemplateNode(sourceFile!,position)
    let templateStringContext = new TemplateStringContext(templateNode as ts.TemplateLiteral,this.tsHelp,this.typescript)
    let cssTextDocument = cssService.generateCssTextDocument(templateStringContext);
    let templateNodeStyleSheet = cssService.getScssStyleSheet(cssTextDocument);
    let {styleSheet: targetStyleSheet,targetNode } = extractStyleSheetSelectorWorkWrap(templateNodeStyleSheet,position,cssTextDocument) || {};
    
    const definitions: ts.DefinitionInfo[] = []
    let tagVariableDeclarationNode = this.tsHelp.getTagVariableDeclarationNode(templateNode)
    if(!tagVariableDeclarationNode){
      return undefined
    }
    let referenceNodes = omitUndefined(this.tsHelp.getReferenceNodes(fileName, tagVariableDeclarationNode.pos));
    referenceNodes = omitUndefined(referenceNodes.map(this.tsHelp.getJsxElementOfIdentifer))
    referenceNodes = unique(referenceNodes)
    const findDefinition = (referenceNode) => {
      let cssSelectorDomNodes = this.parseCssSelector(referenceNode as ts.JsxElement);
      cssSelectorDomNodes.map(cssSelectorDomNode => {
        if (cssSelectorDomNode.type == 'styledElement') {
          let cssScan = cssService.getStyleSheetScanByJsxElementNode(cssSelectorDomNode);
          let cssText = cssScan.getText()
          let cssdoc = cssService.getDefaultCssTextDocument(cssText)
          let styleSheet = cssService.getScssStyleSheet(cssdoc);
          let targetTree = createStyleSheetAbstractSyntaxTree(targetStyleSheet!)
          let sourceTree = createStyleSheetAbstractSyntaxTree(styleSheet)
          let { matchSourceNodes, matchTargetNodes } = cssService.matchCssSelectorNodes(targetTree, sourceTree, true)
          let result = Array.from(matchSourceNodes).map(item => item.node)
          result.forEach(res => {
            let textNode = cssScan.getTextNode(cssdoc.getOffsetInFile(res.offset))
            if (textNode?.node.type == "classNameSelector" || textNode?.node.type == "idSelector") {
              let node = textNode.node
              let tsNode = textNode?.node.tsNode
              let fileName = tsNode.getSourceFile().fileName
              definitions.push({
                fileName: fileName,
                kind: ts.ScriptElementKind.string,
                name: '',
                containerKind: ts.ScriptElementKind.variableElement,
                containerName: '',
                textSpan: {
                  start: node.offset,
                  length: node.text.length,
                }
              })
            }
          })
        }
      })
    }
    referenceNodes.map(findDefinition)
    if(!definitions.length){
      return undefined
    }
    const definitionInfo: ts.DefinitionInfoAndBoundSpan = {
      definitions: definitions,
      textSpan: {
        start: cssTextDocument.getOffsetInFile(targetNode?.offset || 0),
        length: targetNode?.getText().length || 0,
      }
    }
    return definitionInfo
  }
}