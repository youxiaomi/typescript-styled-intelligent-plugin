

import { getSCSSLanguageService ,TextDocument,} from 'vscode-css-languageservice'
import * as ts from 'typescript'
import { NodeType,Node,RuleSet}  from 'vscode-css-languageservice/lib/umd/parser/cssNodes'
import * as Nodes from 'vscode-css-languageservice/lib/umd/parser/cssNodes'
import { flatten, omitUndefined } from '../utils/utils'
import { JsxElementNode, JsxElementSelector,CandidateTextNode } from '../parser/extractCssSelector'
import TsHelp from './tsHelp'
import { getTag, getTagVariableDeclarationNode } from '../utils/templateUtil'
import StyleSheetScan from '../parser/styleSheetScan'

const scssLanguageService = getSCSSLanguageService()


export const getScssStyleSheet = (scssText:string) =>{
  
}



class NodeSelectorGenerator{
  currentSimpleSelectorIndex = -1
  selector:Node
  declarationGenerators: NodeGenerator[]
  parent:Node
  declarations:Node[]
  declartionsParent:Node
  constructor(Selector:Node,declarations,selectorParent:Node,declartionsParent:Node){
    this.selector = Selector
    this.parent = selectorParent
    this.declarations = declarations
    this.declartionsParent = declartionsParent
    this.declarationGenerators = declarations
      .filter(declaration => declaration.type == NodeType.Ruleset)
      .map(declaration=>{
        return new NodeGenerator(declaration,declartionsParent)
      })
  }
  private getNode = (simpleSelectorTarget:Node) =>{
    let simpleSelectors = this.selector.getChildren()
    if(this.currentSimpleSelectorIndex < simpleSelectors.length){
      this.currentSimpleSelectorIndex++
    }
    let currentSimpleSelector = simpleSelectors[this.currentSimpleSelectorIndex];
    if(currentSimpleSelector){
      //这个下面children 也会多个  &.user  children = [&,.user]
      // let currentSimpleChildren = currentSimpleSelector.getChildren()
      // let simpleSelectorChildrenTarget = simpleSelectorTarget.getChildren()

      let targetText = currentSimpleSelector.getText()
      let sourceText = simpleSelectorTarget.getText()
      if (targetText == sourceText) {
        return currentSimpleSelector
      } else {
        return this.getNode(simpleSelectorTarget)
      }
    }else{
      if(this.declarationGenerators.length){
        return this.declarationGenerators = this.declarationGenerators.filter(declaration=>{
          return declaration.findNodes(simpleSelectorTarget)
        })
      }else{
        return undefined
      }
      
    }
  }
  findNodes =(simpleSelectorTarget:Node) =>{
    return this.getNode(simpleSelectorTarget)
  }
  getCurrentNodes = ():Node[]=>{
    let simpleSelectors = this.selector.getChildren()
    let currentSimpleSelector = simpleSelectors[this.currentSimpleSelectorIndex];
    if(currentSimpleSelector){
      return [currentSimpleSelector]
    }else{
      let nodes = this.declarationGenerators.map(gen => gen.getCurrentNodes())
      let _nodes= flatten(nodes.filter(item => item))
      return _nodes
    }
  }
  clone = ()=>{
    const cloneInstance = new NodeSelectorGenerator(this.selector,this.declarations,this.parent,this.declartionsParent)
    cloneInstance.currentSimpleSelectorIndex = this.currentSimpleSelectorIndex
    cloneInstance.declarationGenerators = this.declarationGenerators.map(gen => gen.clone())
    return cloneInstance
  }
}
class NodeGenerator{
  currentRuleSet:Node
  // currentSelectorIndex = 0
  selectorGenerators:NodeSelectorGenerator[] = [];
  parent?:Node
  constructor(ruleSet:Node,parent?:Node){
    this.parent = parent
    this.currentRuleSet = ruleSet
    let [nodeUndefined,nodeDeclarations] = this.currentRuleSet.getChildren();
    let nodeSelectors = nodeUndefined.getChildren()
    let declarations = nodeDeclarations.getChildren()
    this.selectorGenerators = nodeSelectors.map(selecotr=>{
      return new NodeSelectorGenerator(selecotr,declarations,nodeUndefined,ruleSet)
    })
  }
  private getNode = (simpleSelectorSource:Node)=>{

    console.log(this.currentRuleSet.getText(),'------target');
    console.log(simpleSelectorSource.getText(),'-----simple');
    return this.selectorGenerators = this.selectorGenerators.filter(gen=>{
      return gen.findNodes(simpleSelectorSource)
    })
  }
  findNodes =(simpleSelectorSource:Node) =>{
    return this.getNode(simpleSelectorSource)
  }
  getCurrentNodes = ():Node[]=>{
    let nodes = this.selectorGenerators.map(gen =>{
      return gen.getCurrentNodes()
    })
    let _nodes:Node[] = []
    let nodesFlatten =  flatten(nodes.filter(item => item))
    nodesFlatten.forEach(node=>{
      if(!_nodes.find(item => item == node)){
        _nodes.push(node)
      }
    })
    return _nodes
  }
  clone(){
    const cloneInstance = new NodeGenerator(this.currentRuleSet,this.parent);
    cloneInstance.selectorGenerators = this.selectorGenerators.map(gen=>{
      return gen.clone()
    })
    return cloneInstance
  }
}


export class TemplateStringContext{
  constructor(
    readonly node: ts.TemplateLiteral,
    readonly tsHelp: TsHelp
  ){

  }
  getFileName(){
    return this.node.getSourceFile().fileName
  }
  getText(){
    return this.node.getText();
  }
  getRawText(){
    return this.getText().slice(1,-1)
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
    // text = `${tagName}{${text}}`
    text = tagName+'{'+text+'}'
    startOffset += (tagName.length + 1)
  }
  let isExistRoot = !!text.slice(0,5).match(':root')
  if(!isExistRoot){
    startOffset += 6
  }
  return {
    text: isExistRoot ? text : ':root{'+text+'}',
    startOffset,
  }
}

export type CssTextDocument =  TextDocument & {
  getOffsetInFile:(offset:number)=>number
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



        // return templateStringContext.toPosition(offset)
        // const pos = context.toPosition(this.fromVirtualDocOffset(offset, context));
        // return this.toVirtualDocPosition(pos);
        // 会有偏移量
        return {
          line: 0,
          character: 0,
        }
      },
      offsetAt: (position: ts.LineAndCharacter) => {
        // return templateStringContext.toOffset(position)
        // const offset = context.toOffset(this.fromVirtualDocPosition(p));
        // return this.toVirtualDocOffset(offset, context);
        return 0
      },
      lineCount: text.split(/\n/g).length + 1,
      getOffsetInFile:(offset:number)=> {
        return offset - startOffset
      },
    }

    return doc
  }

  generateCssTextDocument(templateStringContext:TemplateStringContext){

    let text = templateStringContext.getText();
    // let isExistRoot = !!text.slice(0,5).match(':root')
    let tagName = getTag(templateStringContext.node)
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
        return 0
      },
      lineCount: cssText.split(/\n/g).length + 1,
      getOffsetInFile:(offset:number)=> {
        return templateStringContext.node.getStart() + offset - startOffset
      },
    }

    return doc

  }
  getScssStyleSheet(doc:TextDocument,addRoot = true) {
    
    // let doc:TextDocument = {
    //   uri: 'untitled://embedded.scss',
    //   languageId: 'scss',
    //   version: 1,
    //   getText: () => addRoot ? `:root{${scssText}}` : scssText,
    //   // getText: () => `${scssText}`,
    //   positionAt: (offset: number) => {
    //     // const pos = context.toPosition(this.fromVirtualDocOffset(offset, context));
    //     // return this.toVirtualDocPosition(pos);
    //     // 会有偏移量
    //     debugger
    //     return {
    //       line: 0,
    //       character: 0,
    //     }
    //   },
    //   offsetAt: (position) => {
    //     // const offset = context.toOffset(this.fromVirtualDocPosition(p));
    //     // return this.toVirtualDocOffset(offset, context);
    //     debugger
    //     return 0
    //   },
    //   lineCount: scssText.split(/\n/g).length + 1,
    // }


    let styleSheet = scssLanguageService.parseStylesheet(doc) as Nodes.Stylesheet
    // let [ruleSet] = styleSheet.getChildren();

    return styleSheet
  }
  getRootRuleset = (styleSheet:Node):Nodes.RuleSet => {
    let [ruleSet] = styleSheet.getChildren()
    return ruleSet as Nodes.RuleSet
  }
  findSelectorTree(rootNode:Node,pos:number){
    const interationNode = (_node:Node)=>{
      return this.forEachChild(_node,(node)=>{
        let startPos = node.offset
        let endPos =  node.offset+length
        if(startPos> pos && pos < endPos){
          return interationNode(node)
        }
      })
    }
    return interationNode(rootNode)
  }
  getRulesetsOfDeclartions(NodeDeclarations:Nodes.Declarations | undefined){
    if(!NodeDeclarations){
      return []
    }
    let declarations = NodeDeclarations.getChildren()
    return declarations.filter(declartion => declartion.type == NodeType.Ruleset) as RuleSet[]
  }
  /**
   *  匹配目标样式表最深层重叠部分
   */
  findSelectorTreeBySelector(targetStyleSheet:Node, sourceStyleSheet:Node):any[]{

    let targetGenerator = new NodeGenerator(this.getRootRuleset(targetStyleSheet));
    let sourceRuleSet = this.getRootRuleset(sourceStyleSheet);
    const getNodes = (targetGenerator:NodeGenerator, sourceRuleSet:Nodes.RuleSet)=>{
      // let [ undefinedNode,declartionNode ]  = sourceRuleSet.getChildren()
      let [ undefinedNode ]  = sourceRuleSet.getChildren()
      let declartionNode = sourceRuleSet.getDeclarations()
      let sourceSelectors = undefinedNode.getChildren()
      let declarationRuleSets = this.getRulesetsOfDeclartions(declartionNode)
      const recursiveSelector = (targetGeneratorClone:NodeGenerator,selector:Node)=>{
        let simpleSelectors = selector.getChildren();
        return !simpleSelectors.find(simpleSelector => targetGeneratorClone.findNodes(simpleSelector).length == 0)
      }
      let _selectors =  sourceSelectors.map(selector=>{
        let targetGeneratorClone = targetGenerator.clone()
        let hasSelector = recursiveSelector(targetGeneratorClone,selector);
        if(!hasSelector){
          return undefined
        }
        if(declarationRuleSets.length){
          let result = declarationRuleSets.map(ruleSet=>{
            return getNodes(targetGeneratorClone.clone(),ruleSet)
          }).filter(item => item)
          return flatten(result)
        }else{
          return targetGeneratorClone.getCurrentNodes()
        }
      }).filter(item => item)
      return flatten(_selectors)
    }
    let nodes = getNodes(targetGenerator,sourceRuleSet)
    console.log(nodes);
    return nodes
  }
  forEachChild(node: Node,cbNodes:(node:Node)=>Node|undefined){
    let chidlren = node.getChildren()
    let result = chidlren.map(cbNodes).filter(item => item) as  Node[]
    return result.length ? result : undefined
  }
  /** 解析css样式表selector,感觉没啥用 */
  getCssSelectorNode(node: Node){


    // return extractStyleSheetSelectorWork(node)
    function iterationNode(node: Node){
      let nodes = node.getChildren()
      var aa = NodeType
    
      // if(node.type == NodeType.Ruleset){
      //   extractSelector(nodes[0] as Nodes.Selector)
      //   // extractSelector(nodes[1])
      // }
      // switch(node.type){
      //   case NodeType.Ruleset:
      //     return extractRuleset(node);
      //   case NodeType.Undefined:
      //     return extractUndefine(node);
      //   case NodeType.Selector:
      //     return extractSelector(node);
      // }
      return {
        text: node.getText(),
        type: NodeType[node.type],
        pos: node.offset,
        end: node.offset+node.length,
        children: nodes.map(node=>{
          return iterationNode(node)
        }),
        cssNode: node,
        
      }
    }
    let classNameNodes = iterationNode(node)
    console.log(classNameNodes)
    return classNameNodes
  }

  /**
   *  把dom节点选中的selector 转换为styleSheet，没有selector就转换所有子节点
   */
  getStyleSheetScanByJsxElementNode = (node:JsxElementNode,sourceSelectorNode?: ts.Node)=>{
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
    const generateClassName = (selector:CandidateTextNode)=>{
      let tsNode = selector.tsNode as ts.StringLiteral

      let text = `.${selector.text || tsNode.text.trim()}`
      styleSheetNodeScan.setText(text,selector)
    }
    const generateId = (selector:CandidateTextNode)=>{
      let tsNode = selector.tsNode as ts.StringLiteral
      let text = `#${tsNode.text.trim()}`
      styleSheetNodeScan.setText(text,selector)
    }
    const generateElement = (selector:JsxElementSelector)=>{
      let tsNode = selector.tsNode as ts.Identifier

      let text =  `${tsNode.text.trim()}`
      styleSheetNodeScan.setText(text,selector)
    }
    const generateSelectorText = (selector:JsxElementSelector)=>{
      console.log(ts.SyntaxKind[selector.tsNode.kind]);
          
      if(selector.selectorType == 'className'){
        return (selector.children || []).map(generateClassName)
      }
      if(selector.selectorType == 'id'){
        return (selector.children || []).map(generateId)
      }
      if(selector.selectorType == "element"){
        return [generateElement(selector)]
      }
      return []
    }
    const generateSelectorNode = (node:JsxElementNode,sourceSelectorNode?: ts.Node) =>{
      if(node.type == 'styledElement' || node.type == 'intrinsicElements'){
        const { type ,children = []}  = node
        let selectors = node.selectors
        if(sourceSelectorNode){
          let _selectorsResult = node.selectors.map(selector=>{
            console.log(selector.tsNode.getFullText());
            
            if(selector.selectorType == 'className' || selector.selectorType == 'id'){
              let child = (selector.children || []).find(item => item.tsNode == sourceSelectorNode);
              let _selector = {...selector}
              if(child){
                _selector.children = [child]
                return _selector
              }
            }
            if(selector.tsNode == sourceSelectorNode){
              return selector
            }
          })
          let _selectors = omitUndefined(_selectorsResult)
          if(_selectors.length){
            _selectors.forEach((selector)=>{
              let text = generateSelectorText(selector);
              styleSheetNodeScan.setText('{',{type:'braceOpen'})
              styleSheetNodeScan.setText('}',{type:"braceClose"})
            })
            return true
          }
        }
        // 多class可以并集，生成  .user.age

        let selectorResults = selectors.map(generateSelectorText)
        if(selectors.length){
          styleSheetNodeScan.setText('{',{type:'braceOpen'})
        }
        // let selectorStrings = flatten(selectorResults).join(',')
        let isExist = false
        for(let node of children){
          isExist = generateSelectorNode(node,sourceSelectorNode) || false
          if(sourceSelectorNode && isExist){
            break
          }
        }
        // let childrenSelectors = childrenSelectorResults.join(``)
        if(selectors.length){
          styleSheetNodeScan.setText('}',{type:"braceClose"})
        }
        return isExist
        // return `${selectorStrings}{${childrenSelectors}}`
      }
    }
    generateSelectorNode(node,sourceSelectorNode)
    return styleSheetNodeScan
    // return generateSelectorNode(node,sourceSelectorNode)
  }
  
}

export const getScssService = ()=>{
  return new ScssService()
}
