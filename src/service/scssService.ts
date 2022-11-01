

import { getSCSSLanguageService ,TextDocument,} from 'vscode-css-languageservice'
import { NodeType,Node}  from 'vscode-css-languageservice/lib/umd/parser/cssNodes'
import * as Nodes from 'vscode-css-languageservice/lib/umd/parser/cssNodes'
import { flatten } from '../utils/utils'


const scssLanguageService = getSCSSLanguageService()


export const getScssStyleSheet = (scssText:string) =>{
  
}


class ScssService {

  getScssStyleSheet(scssText: string) {
    let styleSheet = scssLanguageService.parseStylesheet({
      uri: 'untitled://embedded.scss',
      languageId: 'scss',
      version: 1,
      getText: () => `:root{${scssText}}`,
      positionAt: (offset: number) => {
        // const pos = context.toPosition(this.fromVirtualDocOffset(offset, context));
        // return this.toVirtualDocPosition(pos);
        // 会有偏移量
        return {
          line: 0,
          character: 0,
        }
      },
      offsetAt: (p) => {
        // const offset = context.toOffset(this.fromVirtualDocPosition(p));
        // return this.toVirtualDocOffset(offset, context);
        return 0
      },
      lineCount: scssText.split(/\n/g).length + 1,
    }) as Node

    return styleSheet
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
  findSelectorTreeBySelector(node:Node, selector:Node){
    class NodeSelectorGenerator{
      currentSimpleSelectorIndex = -1
      selector:Node
      declarationGenerators: NodeGenerator[]
      parent:Node
      constructor(Selector:Node,declarations,selectorParent:Node,declartionsParent:Node){
        this.selector = Selector
        this.parent = selectorParent
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
      getCurrentNodes = ():Node| Node[]=>{
        let simpleSelectors = this.selector.getChildren()
        let currentSimpleSelector = simpleSelectors[this.currentSimpleSelectorIndex];
        if(currentSimpleSelector){
          return currentSimpleSelector
        }else{
          let nodes = this.declarationGenerators.map(gen => gen.getCurrentNodes())
          let _nodes= flatten(nodes.filter(item => item))
          return _nodes
        }
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
      private getNode = (simpleSelectorTarget:Node)=>{

        console.log(this.currentRuleSet.getText(),'------target');
        console.log(simpleSelectorTarget.getText(),'-----simple');
        return this.selectorGenerators = this.selectorGenerators.filter(gen=>{
          return gen.findNodes(simpleSelectorTarget)
        })
      }
      findNodes =(simpleSelectorTarget:Node) =>{
        
        return this.getNode(simpleSelectorTarget)
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
    }


    let aa = new NodeGenerator(node.getChildren()[0]);





    // let aa = getGeneratorNode(node.getChildren()[0]);
    let s = selector.getChildren()[0]
    s = s.getChildren()[1].getChildren()[0]
    s.getChildren().map(item=>{
      item.getChildren().map(i=>{
        i.getChildren().map(item=>{
          aa.findNodes(item)
          console.log(aa.getCurrentNodes());
          
          console.log(aa);
        })
      })
    })
    
    

  }
  getCssSelectors(node:Node,){

  }
  forEachChild(node: Node,cbNodes:(node:Node)=>Node|undefined){
    let chidlren = node.getChildren()
    let result = chidlren.map(cbNodes).filter(item => item) as  Node[]
    return result.length ? result : undefined
  }
  getClassNameNode(node: Node){
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
}

export const getScssService = ()=>{
  return new ScssService()
}
