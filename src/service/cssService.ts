

import { getSCSSLanguageService ,TextDocument,} from 'vscode-css-languageservice'
import * as ts from 'typescript/lib/tsserverlibrary'
import { NodeType,Node,RuleSet}  from 'vscode-css-languageservice/lib/umd/parser/cssNodes'
import * as Nodes from 'vscode-css-languageservice/lib/umd/parser/cssNodes'
import { flatten, omitUndefined } from '../utils/utils'
// import { JsxElementNode, JsxElementSelector,JsxElementNode, StyledElement } from '../parser/extractCssSelector'
// import {} from
import * as substituter from 'typescript-styled-plugin/lib/_substituter'
import TsHelp from './tsHelp'

import StyleSheetScan from '../parser/styleSheetScan'
import { CssSelectorNode, JsxElementNode, JsxElementSelector, TargetSelector } from '../factory/nodeFactory'
import { isReadable } from 'stream'
import logger from './logger'

const scssLanguageService = getSCSSLanguageService()


function  getPlaceholderSpans(node: ts.TemplateExpression) {
  const spans: Array<{ start: number, end: number }> = [];
  const stringStart = node.getStart() + 1;

  let nodeStart = node.head.end - stringStart - 2;
  for (const child of node.templateSpans.map(x => x.literal)) {
      const start = child.getStart() - stringStart + 1;
      spans.push({ start: nodeStart, end: start });
      nodeStart = child.getEnd() - stringStart - 2;
  }
  return spans;
}
export class TemplateStringContext{
  constructor(
    readonly node: ts.TemplateLiteral,
    readonly tsHelp: TsHelp,
    readonly typescript: typeof ts,
  ){

  }
  getFileName(){
    return this.node.getSourceFile().fileName
  }
  getText(){
    let ts = this.typescript
    let text = this.node.getText().slice(1,-1);
    if(this.node.kind == ts.SyntaxKind.NoSubstitutionTemplateLiteral){
      return text
    }
    return substituter.getSubstitutions(text,getPlaceholderSpans(this.node))
    // return this.node.getText();
  }
  getRawText(){
    let ts = this.typescript
    let text = this.node.getText()
    if(this.node.kind == ts.SyntaxKind.NoSubstitutionTemplateLiteral){
      return text
    }
    return '`'+substituter.getSubstitutions(text.slice(1,-1),getPlaceholderSpans(this.node))+'`'
  }
  toOffset(location: ts.LineAndCharacter): number{

    return 0
  }
  toPosition(offset: number): ts.LineAndCharacter{

    return {
      line: 0,
      character: 0
    }
  }
}

const amendStyleSheet = (text,tagName?:string)=>{
  let startOffset = 0
  if(text[0] == '`'){
    text = text.slice(1,-1)
    startOffset = -1
  }
  if(tagName){
    text = `${tagName}{${text}}`
    // text = tagName+'{'+text+'}'
    startOffset += (tagName.length + 1)
  }
  let isExistRoot = !!text.slice(0,5).match(':root')
  if(!isExistRoot){
    startOffset += 6
  }
  return {
    // text: isExistRoot ? text : ':root{'+text+'}',
    text: isExistRoot ? text : `:root{${text}}`,
    startOffset,
  }
}

export type CssTextDocument =  TextDocument & {
  getOffsetInFile:(offset:number)=>number,
  getOffset:(offset:number)=>number,
}

class ScssService {

  getDefaultCssTextDocument(text){
    let {text:cssText,startOffset} = amendStyleSheet(text)
    let doc:CssTextDocument = {
      uri: 'untitled://embedded.scss',
      languageId: 'scss',
      version: 1,
      getText: () => cssText,
      // getText: () => `${scssText}`,
      positionAt: (offset: number) => {
        offset -= startOffset
        return {
          line: 0,
          character: 0,
        }
      },
      offsetAt: (position: ts.LineAndCharacter) => {
    
        return 0
      },
      lineCount: text.split(/\n/g).length + 1,
      getOffsetInFile:(offset:number)=> {
        return offset - startOffset
      },
      getOffset:(offset:number)=> {
        return offset 
      },
    }

    return doc
  }

  generateCssTextDocument(templateStringContext:TemplateStringContext){

    let text = templateStringContext.getRawText();
    // let isExistRoot = !!text.slice(0,5).match(':root')
    let tagName = templateStringContext.tsHelp.getTag(templateStringContext.node)
    if(!tagName){
      console.log(tagName);
      templateStringContext.tsHelp.getTag(templateStringContext.node)
    }
    let {text:cssText,startOffset} = amendStyleSheet(text,tagName)
    let doc:CssTextDocument = {
      uri: 'untitled://embedded.scss',
      languageId: 'scss',
      version: 1,
      getText: () =>cssText,
      // getText: () => `${scssText}`,
      positionAt: (offset: number) => {
        offset -= startOffset
        return templateStringContext.toPosition(offset)
        // const pos = context.toPosition(this.fromVirtualDocOffset(offset, context));
        // return this.toVirtualDocPosition(pos);
        // 会有偏移量
        // return {
        //   line: 0,
        //   character: 0,
        // }
      },
      offsetAt: (position: ts.LineAndCharacter) => {
        return templateStringContext.toOffset(position)
        // const offset = context.toOffset(this.fromVirtualDocPosition(p));
        // return this.toVirtualDocOffset(offset, context);
      },
      lineCount: cssText.split(/\n/g).length + 1,
      getOffsetInFile:(offset:number)=> {
        return templateStringContext.node.getStart() + offset - startOffset
      },
      getOffset(offset:number){
        return offset - templateStringContext.node.getStart() + startOffset
      }
    }

    return doc

  }
  fromatText(doc:TextDocument,){
    return scssLanguageService.format(doc,undefined,{tabSize:2,insertSpaces:true,newlineBetweenSelectors:false})[0].newText
  }
  getScssStyleSheet(doc:TextDocument,addRoot = true) {
    let styleSheet = scssLanguageService.parseStylesheet(doc) as Nodes.Stylesheet

    return styleSheet
  }
  getRootRuleset = (styleSheet:Node):Nodes.RuleSet => {
    let [ruleSet] = styleSheet.getChildren()
    return ruleSet as Nodes.RuleSet
  }
  getRulesetsOfDeclartions(NodeDeclarations:Nodes.Declarations | undefined){
    if(!NodeDeclarations){
      return []
    }
    let declarations = NodeDeclarations.getChildren()
    return declarations.filter(declartion => declartion.type == NodeType.Ruleset) as RuleSet[]
  }
  extractStyleNode = (node:Nodes.Stylesheet, targetSelector:TargetSelector)=>{

  }
  extractDomNode = (node: JsxElementNode, targetSelector:TargetSelector)=>{
    function findTargetDomSelector(node: JsxElementNode,targetSelector:TargetSelector){
      let selector = node.selectors.find(selector=>{
        if(selector.type == "classNameSelector" || selector.type == "idSelector"){
          return selector.offset <= targetSelector.selectorStart && selector.offset + selector.text.length >= targetSelector.selectorStart
        }
      })
      if(selector){
        node.children = []
        return true
      }else{
        let children =  node.children?.find(child=>{
          return  findTargetDomSelector(child as JsxElementNode,targetSelector)
        })
        node.selectors = children ? node.selectors :  []
        node.children = children ? [children] :  []
      }
      return node.children.length
    }
    findTargetDomSelector(node ,targetSelector)
    return node
  }

  /**
   *  把dom节点选中的selector 转换为styleSheet，没有selector就转换所有子节点
   */
  getStyleSheetScanByJsxElementNode = (node:JsxElementNode,targetSelector?: TargetSelector)=>{
    /**
     *  root:{
     *    .a{
     *        .b .c{
     *          
     *        }
     *    }
     *  }
     */
    
    const styleSheetNodeScan = new StyleSheetScan()
    const generateClassName = (selector:JsxElementSelector)=>{
      let tsNode = selector.tsNode as ts.StringLiteral

      let text = `.${selector.text || tsNode.text.trim()}`
      return styleSheetNodeScan.setText(text,selector)
    }
    const generateId = (selector:JsxElementSelector)=>{
      let tsNode = selector.tsNode as ts.StringLiteral
      let text = `#${tsNode.text.trim()}`
      return styleSheetNodeScan.setText(text,selector)
    }
    const generateElement = (selector:JsxElementSelector)=>{
      let tsNode = selector.tsNode as ts.Identifier

      let text =  `${tsNode.text.trim()}`
      return styleSheetNodeScan.setText(text,selector)
    }
    const generateSelectorText = (selector:JsxElementSelector)=>{
          
      if(selector.type == "classNameSelector"){
        return generateClassName(selector)
      }
      if(selector.type == "idSelector"){
        return generateId(selector)
      }
      if(selector.type == "elementSelector"){
        return generateElement(selector)
      }
      return 
    }
    


    // if(targetSelector){
    //   node = extractTargetSelectorStylesheet(node as JsxElementNode,targetSelector)
    // }
    const generateSelectorNode = (node:JsxElementNode,targetSelector?: TargetSelector) =>{
      if(node.type == 'styledElement' || node.type == 'intrinsicElement'){
        const { type ,children = []}  = node
        let selectors = node.selectors
        // 多class可以并集，生成  .user.age
        let hasTargetselector = node.selectors.find(selector=>{
          if(selector.type == "classNameSelector" || selector.type == "idSelector"){
            return targetSelector && selector.offset <= targetSelector.selectorStart && selector.offset + selector.text.length >= targetSelector.selectorStart
          }
        })
        if(hasTargetselector){
          let targetScanNode = generateSelectorText(hasTargetselector)
          if(targetScanNode){
            styleSheetNodeScan.targetNode = targetScanNode
          }
        }else{
          selectors.map((selector)=>{
            return generateSelectorText(selector)
          })
        }
        if(selectors.length){
          styleSheetNodeScan.setText('{',{type:'braceOpen'})
        }
        if(!hasTargetselector){
          for(let node of children){
            generateSelectorNode(node,targetSelector)
            // if(targetSelector && isExist){
            //   break
            // }
          }
        }
        // let childrenSelectors = childrenSelectorResults.join(``)
        if(selectors.length){
          styleSheetNodeScan.setText('}',{type:"braceClose"})
        }
        // return isExist
        // return `${selectorStrings}{${childrenSelectors}}`
      }
    }
    generateSelectorNode(node,targetSelector)
    return styleSheetNodeScan
    // return generateSelectorNode(node,sourceSelectorNode)
  }
  findCssSelctorNode(cssSelectNode:CssSelectorNode,offset:number){

   function findCssSelectNode(cssSelectNode:CssSelectorNode){
    let node = cssSelectNode.node
    if(node.offset < offset && offset < node.end){
      if(node.type == Nodes.NodeType.ClassSelector || node.type == Nodes.NodeType.IdentifierSelector || node.type == NodeType.ElementNameSelector){
        return cssSelectNode
      }else{
        return Array.from(cssSelectNode.children).find(child=>{
          return findCssSelectNode(child)
        })
      }
    }
   }
   return findCssSelectNode(cssSelectNode)
  }
  matchCssSelectorNode3(domNode:JsxElementNode,cssNode:CssSelectorNode){
    const cssMatchNodes =  new Map<number,Set<JsxElementSelector>>();
    const domMatchNodes = new Map<number,Set<CssSelectorNode>>()

    function matchDomNode(domNode:JsxElementNode,cssSelectNode:CssSelectorNode){
      let cssSelectText  = cssSelectNode.nodeText
      let domSelectors = domNode.selectors
      domNode.selectors.forEach((domSelector) => {
        let text = domSelector.fullText
        if (cssSelectText == text) {
          // .a.b selector
          if(cssSelectNode.siblings.size){
            let notFoundSibling =Array.from( cssSelectNode.siblings).find(sibling=>{
              return !domSelectors.find(domSelector=>{
                return domSelector.fullText == sibling.nodeText
              })
            })
            if(notFoundSibling){
              return
            }
          }
          // .a+.b 
          if(cssSelectNode.combinatorSiblingNodes.size){
            let index = domNode.parent?.children.findIndex(child => child == domNode)
            if(index === undefined)return
            if(index < 0){
              return
            }

            let prevDomNode = domNode.parent?.children[index - 1]
            if(!prevDomNode){
              return
            }
            let notFoundCombineSlibling = Array.from(cssSelectNode.combinatorSiblingNodes).find(combinatorSiblingNode=>{
              return !prevDomNode?.selectors.find(selector=>{
                return selector.fullText == combinatorSiblingNode.nodeText
              })     
            })
            if(notFoundCombineSlibling){
              return
            }
          }
          if(cssSelectNode.combinatorParents.size){
            let notFoundCombineParent = Array.from(cssSelectNode.combinatorParents).find(combineParent=>{
              return !domNode.parent?.selectors.find(selector=>{
                return selector.fullText == combineParent.nodeText
              })
            })
            if(notFoundCombineParent){
              return
            }
          }
          let currentStyleMatchNode = cssMatchNodes.get(cssSelectNode.node.offset) || new Set()
          currentStyleMatchNode.add(domSelector)
          cssMatchNodes.set(cssSelectNode.node.offset, currentStyleMatchNode)

          let currentDomMatchNode = domMatchNodes.get(domSelector.offset) || new Set()
          currentDomMatchNode.add(cssSelectNode)
          domMatchNodes.set(domSelector.offset, currentDomMatchNode)
          
        }
      })
      domNode.children.forEach((domNodeChild)=>{
        matchDomNode( domNodeChild,cssSelectNode)
      })
    }

    function matchCssNode(domNodes:JsxElementNode[],cssSelectNodes:CssSelectorNode[]){
      cssSelectNodes.forEach(cssSelectNode=>{
        let cssSelectText  = cssSelectNode.nodeText
        if(cssSelectText == ':root'){
          matchCssNode(domNodes,Array.from(cssNode.children))
          return
        }
        domNodes.forEach(domNode=>{
          matchDomNode(domNode,cssSelectNode)
          let cssSelectNodeChildren = cssSelectNode.children
          let domSelectorNodes = cssMatchNodes.get(cssSelectNode.node.offset) || new Set();
          domSelectorNodes.forEach(domSelector=>{
            matchCssNode(domSelector.parent.children,Array.from(cssSelectNodeChildren))
          })
        })
      })
    }
    matchCssNode([domNode],[cssNode])
    return {
      cssMatchNodes,
      domMatchNodes,
    }
  }

  matchCssSelectorNodes(targeTree: CssSelectorNode,sourceTree: CssSelectorNode,isMatchTarge = false){
    let matchSourceNodes: Set<CssSelectorNode> = new Set()
    let matchTargetNodes: Set<CssSelectorNode> = new Set()
    iterationNode(targeTree, sourceTree)
    return {
      matchSourceNodes,
      matchTargetNodes,
    }
    function iterationNode(targetNode: CssSelectorNode, sourceNode: CssSelectorNode) {
      // while(sourceNode){

      let isSame = isSameNode(targetNode, sourceNode)
      if (isSame) {
        // let isCombinator = sourceNode.combinatorSibling || sourceNode.combinatorParent || targetNode.combinatorParent || targetNode.combinatorSibling
        // if (isCombinator && targetNode.parent && sourceNode.parent) {
        //   isSame = isSameNode(targetNode.parent, sourceNode.parent)
        // }
      }
      let targetChildren = targetNode.children
      let sourceChildren = sourceNode.children
      if (isSame) {
        if (targetChildren.size && sourceChildren.size) {
          sourceChildren.forEach(sourceChild => {
            targetChildren.forEach(targetChild => {
              iterationNode(targetChild, sourceChild)
            })
          })
        } else {
          // targetNode.addMatchNode(sourceNode)
          // sourceNode.addMatchNode(targetNode)
          if(isMatchTarge){
            if(!targetChildren.size){
              matchSourceNodes.add(sourceNode)
            }
          }else{
            matchSourceNodes.add(sourceNode)
          }
          matchTargetNodes.add(targetNode)
        }
      } else {
        sourceChildren.size && sourceChildren.forEach(sourceChild => {
          iterationNode(targetNode, sourceChild)
        })
      }
      function isSameNode(targetNode: CssSelectorNode, sourceNode: CssSelectorNode) {
        let sourceCssNode = sourceNode.node
        let targetCssNode = targetNode.node
        let isSame = targetCssNode.type == sourceCssNode.type && sourceNode.nodeText == targetNode.nodeText
        let sourceSiblings = Array.from(sourceNode.parent?.children || []);
        if (isSame && targetNode.siblings.size) {
          let targetSiblings = Array.from(targetNode.siblings)
          for (let sibling of targetSiblings) {
            let notFound = !sourceSiblings.find(sourceSibling => sourceSibling.nodeText == sibling.nodeText)
            if (notFound) {
              isSame = false
              break
            }
          }
        }
        return isSame
      }
    }
  }
  getSelectorIdentierOffset(node: Nodes.Node){
    let types = [
      NodeType.ClassSelector,
      NodeType.Identifier 
    ]
    if(types.includes(node.type)){
      node.offset++
    }
    return node.offset
  }
}

export const getScssService = ()=>{
  return new ScssService()
}
