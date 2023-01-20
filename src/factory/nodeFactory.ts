

import ts from 'typescript'
import * as CssNode from 'vscode-css-languageservice/lib/umd/parser/cssNodes'
const { NodeType}  = CssNode



function createFacotry(){




}

// interface CssSelectorNodeFactory{
//   kind: CssNode.NodeType
//   parent: CssSelectorNodeFactory
//   //多个selector共同决定 .user.boy
//   selectors:[]
//   children:[]
//   siblings:[]
//   addSibling()
//   getSiblings():[]
//   addChild()
//   getChildren():[]
//   addSelector()
//   // addOtherSelector()
//   // getOtherSelector()

// }

// CssNode.NodeType
enum CssSelectorNodeType  {
  ClassSelector,
  SelectorCombinator,
  SelectorCombinatorParent,
  SelectorCombinatorSibling,
  ElementNameSelector,
  IdentifierSelector,
  Identifier,
  PseudoSelector,
  // SelectorCombinator,

}


export class CssSelectorNode{
  type: CssSelectorNodeType
  parent: CssSelectorNode | undefined
  node:CssNode.Node
  //exist "+"  symbol
  combinatorSibling: boolean = false
  //exist ">"  symbol
  combinatorParent: boolean = false
  private _children:Set<CssSelectorNode> = new Set()
  //同级存在的选择器。多个selector共同决定 .user.boy
  private _siblings: Set<CssSelectorNode> = new Set()
  private _matchNodes: Set<CssSelectorNode> = new Set()
  constructor(type:CssSelectorNodeType,node){
    this.type = type
    this.node = node
  }
  addSibling(node:CssSelectorNode){
    if(this.parent){
      node.setParent(this.parent)
    }
    this._siblings.add(node)
    // for(let sibling of this._siblings){
    //   sibling.replaceSiblings(this._siblings)
    // }
  }
  replaceSiblings(siblings: Set<CssSelectorNode>){
    let _siblings = new Set<CssSelectorNode>([this])
    for(let sibling of siblings){
      if(sibling != this){
        _siblings.add(sibling)
      }
    }
    this._siblings = _siblings
  }
  setParent(node: CssSelectorNode){
    this.parent = node
  }
  addMatchNode(node: CssSelectorNode){
    this._matchNodes.add(node)
  }
  get matchNodes(){
    return this._matchNodes
  }
  get siblings(){
    return this._siblings
  }
  get children(){
    return this._children
  }
  get nodeText(){
    return this.node.getText()
  }
  get childrenText(){
    // let tests = {
    //   children:''
    // }
    // let children = this._children
    // while(this._children){

    // }
    return Array.from(this._children).map(child => child.nodeText).join(',')
  }
  get siblingsText(){
    return Array.from(this._siblings).map(item => item.nodeText).join(',')
  }
  addChild(node:CssSelectorNode){
    node.parent = this
    this._children.add(node)
  }
  addSelector(node:CssSelectorNode){}
}



export function createStyleSheetAbstractSyntaxTree(cssNode: CssNode.Node){
  let typeMap = {
    [CssNode.NodeType.ClassSelector]: CssSelectorNodeType.ClassSelector,
    [CssNode.NodeType.Identifier]: CssSelectorNodeType.Identifier,
    [CssNode.NodeType.IdentifierSelector]: CssSelectorNodeType.IdentifierSelector,
    [CssNode.NodeType.ElementNameSelector]: CssSelectorNodeType.ElementNameSelector,
    [CssNode.NodeType.PseudoSelector]: CssSelectorNodeType.PseudoSelector,
  }
  const nodeHandlers = {
    [NodeType.Stylesheet]: StylesheetHandler,
    [NodeType.Ruleset]: Ruleset,
    [NodeType.Selector]: Selector,
    [NodeType.SimpleSelector]: SimpleSelector,
    [NodeType.SelectorCombinator]: DefaultSelectorHandler,
    [NodeType.SelectorCombinatorSibling]: DefaultSelectorHandler,
    [NodeType.SelectorCombinatorAllSiblings]: DefaultSelectorHandler,
    [NodeType.PseudoSelector]: DefaultSelectorHandler,
    [NodeType.ClassSelector]: DefaultSelectorHandler,
    [NodeType.ElementNameSelector]: DefaultSelectorHandler,
    [NodeType.Identifier]: DefaultSelectorHandler,
    [NodeType.IdentifierSelector]: DefaultSelectorHandler,
    [NodeType.Declaration]: DefaultSelectorHandler,
  }
 
  if(nodeHandlers[cssNode.type]){
    return nodeHandlers[cssNode.type](cssNode)
  }
  return undefined

  type DefaultSelectorOptions = {
    declarations:CssNode.Node[],
    hasSelectorCombinator:boolean,
    hasSelectorCombinatorSibling:boolean
    hasSelectorCombinatorParent:boolean
  }

  function DeclarationHandler(node: CssNode.Node,parents: CssSelectorNode[]){
    if(node.type == CssNode.NodeType.Ruleset){
      Ruleset(node as CssNode.RuleSet,parents)
    }
  }
  function DefaultSelectorHandler(cssNode: CssNode.Node,parents:CssSelectorNode[],prevNode: CssSelectorNode|undefined, options: DefaultSelectorOptions ){
    const { declarations, hasSelectorCombinator, hasSelectorCombinatorSibling ,hasSelectorCombinatorParent}  = options
    let node = new CssSelectorNode(typeMap[cssNode.type], cssNode)
    if(hasSelectorCombinatorSibling){
      node.combinatorSibling = true
    }
    if(hasSelectorCombinatorParent){
      node.combinatorParent = true
    }
    if(prevNode instanceof CssSelectorNode){
      let prevNodeSiblings = prevNode.siblings
      node.addSibling(prevNode)
      prevNodeSiblings.forEach(sibling=>{
        node.addSibling(sibling)
      })
      prevNode?.addSibling(node)
    }
    if(hasSelectorCombinator){
      parents.forEach(parent=>{
        node.addSibling(parent)
        parent?.parent?.addChild(node)
      })
    }else{
      // if(prevNode instanceof CssSelectorNode){
      //   prevNode?.addSibling(node)
      // }
      if(!parents.forEach){
        debugger
      }
      parents.forEach(parent=>{
        if(!parent || !parent.addChild){
          debugger
        }
        parent.addChild(node)
      })
    }
   
    return node
  }

  function hasSelectorCombinatorFromSimpleSelector(simpleSelector: CssNode.SimpleSelector){
    let children = simpleSelector.getChildren();
    let firstChild = children[0];
    return   firstChild.type == CssNode.NodeType.SelectorCombinator
  }
  function hasSelectorCombinatorSiblingFromNode(node: CssNode.Node | undefined){
    return node && node.type == CssNode.NodeType.SelectorCombinatorSibling
  }
  function hasSelectorCombinatorParentFromNode(node: CssNode.Node | undefined){
    return node && node.type == CssNode.NodeType.SelectorCombinatorParent
  }


  function SimpleSelector(simpleSelector: CssNode.SimpleSelector,parents:CssSelectorNode[],prevNode: CssNode.Node|undefined, declarations:CssNode.Node[],isLast:boolean){
    let children = simpleSelector.getChildren();
    let prevChildNode: CssSelectorNode | undefined 

    let hasSelectorCombinator = hasSelectorCombinatorFromSimpleSelector(simpleSelector);
    let hasSelectorCombinatorSibling = hasSelectorCombinatorSiblingFromNode(prevNode);
    let hasSelectorCombinatorParent = hasSelectorCombinatorParentFromNode(prevNode)
    if(hasSelectorCombinator && children.length == 1){
      return children[0]
    }
    let nodes: CssSelectorNode[]  = []
    //these children are sibling nodes,it belong to the same parent node.
    if(hasSelectorCombinator){
      children = children.slice(1)
    }
    children.forEach(child=>{
      let currentHandler = getCurrentHandler(child);
      let currentNode = currentHandler(child,
        parents,
        prevChildNode,
        {
          declarations,
          hasSelectorCombinator,
          hasSelectorCombinatorSibling,
          hasSelectorCombinatorParent,
          isLast
      });
      prevChildNode = currentNode
      if(currentNode instanceof CssSelectorNode){
        return nodes.push(currentNode)
      }
    })
    if(isLast){
      declarations.forEach(declaration=>{
        DeclarationHandler(declaration,nodes)
      })
    }
    return nodes
  }
  function SelectorCombinator(selecotorCombinator: CssNode.Node){
    return selecotorCombinator
  }
  function Selector(selector: CssNode.Selector,parents:CssSelectorNode[],prevNode: CssSelectorNode|undefined, declarations:CssNode.Node[]){
    let children = selector.getChildren();
    let nextChildParents: CssSelectorNode[]  = parents
    let preNode:CssNode.Node | undefined
    children.forEach((child,index)=>{
      // selector会包含 >和+ 符号
      let currentHandler = getCurrentHandler(child);
      let currentNodes = currentHandler(child,nextChildParents,preNode,declarations,index == (children.length-1))
      if(child.type == CssNode.NodeType.SimpleSelector){
        nextChildParents = currentNodes
      }
      preNode = child
      if(!Array.isArray(nextChildParents)){
        debugger
      }
    })
    

  }
  function StylesheetHandler(node: CssNode.Stylesheet){
    let ruleSet = node.getChild(0) as CssNode.RuleSet
    let children = node.getChildren()
    let rootNode = node.getChildren()[0].getChildren()[0].getChildren()[0].getChildren()[0].getChildren()[0]
    let currentType =typeMap[rootNode.type]
    if(!currentType){
      throw new Error(`css node type ${children[0].type} not found`)
    }
    let  parent = new CssSelectorNode(currentType, rootNode)
    let declarations = ruleSet.getDeclarations()?.getChildren() || []
    declarations.forEach(declaration=>{
      DeclarationHandler(declaration,[parent])
    })
    // Ruleset(children[0] as any,[parent])
    return parent
  }
  function Ruleset(ruleSet: CssNode.RuleSet,parents:CssSelectorNode[]){
    let children = ruleSet.getSelectors().getChildren()
    let declarations = ruleSet.getDeclarations()?.getChildren() || [];

    // if(!parent && children.length != 1 && children[0].getChildren().length != 1){
    //   throw new Error(`current styleSheet not only one parent node`)
    // }
    // if(!parent){
      
    //   // let currentType =typeMap[children[0].getChildren()[0].getChildren()[0].type]
    //   // if(!currentType){
    //   //   throw new Error(`css node type ${children[0].type} not found`)
    //   // }
    //   // parent = new CssSelectorNode(currentType, children[0].getChildren()[0].getChildren()[0])
    //   // declarations.forEach(declaration=>{
    //   //   DeclarationHandler(declaration,parent)
    //   // })
    //   // return parent
    // }else{
     
    // }
    let prevChildNode: CssSelectorNode | undefined
    children.forEach(child=>{
      let currentHandler = getCurrentHandler(child);
      prevChildNode = currentHandler(child,parents,prevChildNode,declarations)
    })
    // return parent
  }

  function getCurrentHandler(node: CssNode.Node){
    return nodeHandlers[node.type] || function(node){
      return node
    }
  }
}






class DomSelector {

  selector: string = ''
  offset = 0
  parenJsxAttrNode
  constructor(offset:number,parentJsxAttrNode: ts.Node){
    this.offset = offset
    this.parenJsxAttrNode = parentJsxAttrNode
  }




}



export class TargetSelect{
  node: ts.Node
  selectors: DomSelector[] = []
  constructor(node: ts.Node){
    this.node = node
    this.getSelectors()
  }
  getSelectors(){
    let offset = this.node.getStart()
    this.node.getText().split(' ').forEach(item => {
      if(item == ''){
        ++offset
      }else{
        this.selectors.push(new DomSelector(offset,this.node))
        offset += item.length
      }
    })
  }



}



