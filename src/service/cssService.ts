

import { getSCSSLanguageService ,TextDocument,} from 'vscode-css-languageservice'
import * as ts from 'typescript'
import { NodeType,Node}  from 'vscode-css-languageservice/lib/umd/parser/cssNodes'
import * as Nodes from 'vscode-css-languageservice/lib/umd/parser/cssNodes'
import { flatten, omitUndefined } from '../utils/utils'
import { JsxElementNode, JsxElementSelector,CandidateTextNode } from '../parser/extractCssSelector'


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

class ScssService {

  getScssStyleSheet(scssText: string) {
    let styleSheet = scssLanguageService.parseStylesheet({
      uri: 'untitled://embedded.scss',
      languageId: 'scss',
      version: 1,
      getText: () => `:root{${scssText}}`,
      // getText: () => `${scssText}`,
      positionAt: (offset: number) => {
        // const pos = context.toPosition(this.fromVirtualDocOffset(offset, context));
        // return this.toVirtualDocPosition(pos);
        // 会有偏移量
        debugger
        return {
          line: 0,
          character: 0,
        }
      },
      offsetAt: (position) => {
        // const offset = context.toOffset(this.fromVirtualDocPosition(p));
        // return this.toVirtualDocOffset(offset, context);
        debugger
        return 0
      },
      lineCount: scssText.split(/\n/g).length + 1,
    }) as Node
    let [ruleSet] = styleSheet.getChildren();

    return styleSheet
  }
  getRootRuleset = (styleSheet:Node) => {
    let [ruleSet] = styleSheet.getChildren()
    return ruleSet
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
  findSelectorTreeBySelector(targetStyleSheet:Node, sourceStyleSheet:Node){

    let targetGenerator = new NodeGenerator(this.getRootRuleset(targetStyleSheet));
    let sourceRuleSet = this.getRootRuleset(sourceStyleSheet);
    const getNodes = (targetGenerator:NodeGenerator, sourceRuleSet:Node)=>{
      let [ undefinedNode, declartionNode ]  = sourceRuleSet.getChildren()
      let selectors = undefinedNode.getChildren()
      let declarations = declartionNode.getChildren()
      declarations = declarations.filter(declartion => declartion.type == NodeType.Ruleset)
      const recursiveSelector = (targetGeneratorClone,selector:Node)=>{
        let simpleSelectors = selector.getChildren();
        return !simpleSelectors.find(simpleSelector => targetGeneratorClone.findNodes(simpleSelector).length == 0)
      }
      let _selectors =  selectors.map(selector=>{
        let targetGeneratorClone = targetGenerator.clone()
        let hasSelector = recursiveSelector(targetGeneratorClone,selector);
        if(!hasSelector){
          return undefined
        }
        if(declarations.length){
          let result = declarations.map(ruleSet=>{
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
  getCssSelectors(node:Node,){

  }
  forEachChild(node: Node,cbNodes:(node:Node)=>Node|undefined){
    let chidlren = node.getChildren()
    let result = chidlren.map(cbNodes).filter(item => item) as  Node[]
    return result.length ? result : undefined
  }
  getCssSelectorNode(node: Node){
    function extractSelector(node: Nodes.Selector){
      let chidlren = node.getChildren()
      return chidlren.map(extractStyleSheetSelectorWork)
    }
    function extractSimpleSelector(node: Nodes.SimpleSelector){
      // let {  getSelectors,getDeclarations } = node
      let chidlren = node.getChildren()
      return chidlren.map(extractStyleSheetSelectorWork)
    }
    function extractIdentifier(node: Nodes.Identifier){
      // let {  getSelectors,getDeclarations } = node
      // let chidlren = node.getChildren()
      // return chidlren.map(extractStyleSheetSelectorWork)
      return {
        cssNode: node,
      }
    }
    function extractIdentifierSelector(node: Node){
      // let {  getSelectors,getDeclarations } = node
      // let chidlren = node.getChildren()
      // return chidlren.map(extractStyleSheetSelectorWork)
      return {
        cssNode: node,
      }
    }
    
    function extractClass(node: Node){
      // let {  getSelectors,getDeclarations } = node
      let chidlren = node.getChildren()
      return chidlren.map(extractStyleSheetSelectorWork)
    }
    function extractDeclarations(node: Nodes.Declarations){
      let children = node.getChildren()
      return children.map(extractStyleSheetSelectorWork)
    }
    function extractRuleset(node:Nodes.RuleSet){
      const selectors = node.getSelectors().getChildren()
      const _declarations = node.getDeclarations()
      const declarations  = _declarations ? _declarations.getChildren() : []
      const extractSelectors = selectors.map(extractStyleSheetSelectorWork).filter(item => item)
      const extractChildrenSelectors = declarations.map(extractStyleSheetSelectorWork).filter(item => item)
      return {
        type: 'ruleSet',
        cssNode: node,
        selectors: extractSelectors,
        children: extractChildrenSelectors,
      }
    }
    function extractUndefined(node:Node){
      //ruleset 的子级 selector
      let chidlren = node.getChildren();

      return chidlren.map(extractStyleSheetSelectorWork)
    }

    function extractStyleSheetSelectorWork(node:Node){

      switch(node.type){
        case NodeType.Ruleset:
          return extractRuleset(node as Nodes.RuleSet);
        case NodeType.Undefined:
          return extractUndefined(node);
        case NodeType.Selector:
          return extractSelector(node as Nodes.Selector);
        case NodeType.SimpleSelector:
          return extractSimpleSelector(node as Nodes.SimpleSelector);
        case NodeType.ClassSelector:
          return extractClass(node);
        case NodeType.Identifier:
          return extractIdentifier(node as Nodes.Identifier);
        case NodeType.IdentifierSelector:
          return extractIdentifierSelector(node);
        case NodeType.Declarations:
        case NodeType.Stylesheet:
          return extractDeclarations(node as Nodes.Declarations);
      }

    }

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
  generateStyleSheetByJsxElementNode = (node:JsxElementNode,sourceSelectorNode?: ts.Node)=>{
    /**
     *  root:{
     *    .a{
     *        .b .c{
     *          
     *        }
     *    }
     *  }
     */
    const styleSheet = ''
    const generateClassName = (selector:CandidateTextNode)=>{
      let tsNode = selector.tsNode as ts.StringLiteral

      return `.${tsNode.text.trim()}`
    }
    const generateId = (selector:CandidateTextNode)=>{
      let tsNode = selector.tsNode as ts.StringLiteral

      return `#${tsNode.text.trim()}`
    }
    const generateElement = (selector:JsxElementSelector)=>{
      let tsNode = selector.tsNode as ts.Identifier

      return `${tsNode.text.trim()}`
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
            if(selector.selectorType == 'className' || selector.selectorType == 'id'){
              let child= (selector.children || []).find(item => item.tsNode == sourceSelectorNode);
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
            selectors = _selectors
          }
          //判断选择器是否存在
        }

        let selectorResults = selectors.map(generateSelectorText).filter(item => item)
        let selectorStrings = flatten(selectorResults).join(',')
        let childrenSelectorResults = children.map((node)=>generateSelectorNode(node,sourceSelectorNode)).filter(item=>item)
        let childrenSelectors = childrenSelectorResults.join(``)
        return `${selectorStrings}{${childrenSelectors}}`
      }
    }
    return generateSelectorNode(node,sourceSelectorNode)
  }
}

export const getScssService = ()=>{
  return new ScssService()
}
