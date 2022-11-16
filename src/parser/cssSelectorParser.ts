


type Ts  = typeof import("typescript")
// import  from 'typescript/lib/tsserverlibrary'
import * as ts from 'typescript'
import TsHelp from '../service/tsHelp'
import { findResult, flatten, unique } from '../utils/utils'
import extractCssSelectorWorkWrap, { JsxElementNode,CandidateTextNode } from './extractCssSelector'


type StyledComponentNode = {
  type: 'styledElement',
  tsNode: ts.Node,
  scssText: string,
  parent: StyledComponentNode[]
}


export default class CssSelectorParser{

  constructor(typescript: Ts,languageService: ts.LanguageService,tsHelp: TsHelp){
    this.typescript = typescript
    this.languageService = languageService
    this.tsHelp = tsHelp
  }
  typescript:Ts
  languageService: ts.LanguageService
  tsHelp: TsHelp
  parseCssSelector = (node: ts.JsxElement | undefined):JsxElementNode[]=>{
    let languageService = this.languageService
    if(!node || node.kind != ts.SyntaxKind.JsxElement){
      return []
    }
    const extractSelectorNode =  extractCssSelectorWorkWrap({
      node,languageService,tsHelp:this.tsHelp
    })

    console.log(extractSelectorNode)
    // let aa = this.flatClassNameChildrenNodes(extractSelectorNode)
    // console.log(aa);
    return extractSelectorNode
  }
  getStyledComponentNode = (fileName: string,pos:number)=>{
    let program = this.languageService.getProgram()
    let sourceFile = program?.getSourceFile(fileName);
    if(!sourceFile){
      return 
    }
    let node = this.tsHelp.findNode(sourceFile,pos) as ts.Node;
    if(!node){
      return 
    }
    if(node.kind != ts.SyntaxKind.StringLiteral){
      return
    }
    let stringNode = node as ts.StringLiteral

    let styledNode = []
    node = node.parent

    const workVariableDeclarationwork = (node:ts.VariableDeclaration)=>{
      let stringReferences = this.tsHelp.getReferences(fileName,node.getStart());
      let stringNodeReferences = stringReferences.map(reference=>{
        return this.tsHelp.findNode(sourceFile!,reference.textSpan.start)
      })
      let result = stringNodeReferences.map(referenceNode=>{
        return findStyledNode(referenceNode!)
      }).filter(item => item) as StyledComponentNode[][]
      return unique(flatten(result),(pre,current)=>{
        return pre.tsNode == current.tsNode
      })
    }
    const workJsxAttribute = (node:ts.JsxAttribute)=>{
      let { name } = node
      if(name.escapedText == 'className'){
        return findStyledNode(node.parent)
      }
    }
    const workJsxOpeningElement = (node:ts.JsxOpeningElement):StyledComponentNode[] | undefined=>{
      let identifier = this.tsHelp.getJsxOpeningElementIdentier(node);
      if(identifier){
        let definitions = this.tsHelp.getDefinition(fileName,identifier.pos);
        let isCustomeJsxElement = definitions.find(node=>this.tsHelp.isCustomJsxElement(node))
        if(isCustomeJsxElement){
          let referenceNodes = this.tsHelp.getReferenceNodes(fileName,identifier.pos) as  ts.Node[]
          let {scssText} = findResult(referenceNodes,this.tsHelp.getStyledTemplateScss) || {}
          if(scssText){
            return [
              {
                type: 'styledElement',
                scssText: scssText,
                tsNode: node.parent,
                parent: node.parent && node.parent.parent && findStyledNode(node.parent.parent) || []
              }
            ]
          }else{
            return node.parent && node.parent.parent && findStyledNode(node.parent.parent) || undefined
          }
        }else{
          //   ts
          // }
          return node.parent && node.parent.parent && findStyledNode(node.parent.parent) || undefined
        }
      }
    }
    const workJsxElement = (node: ts.JsxElement)=>{
      return findStyledNode(node)
    }
    const findStyledNode = (node:ts.Node):StyledComponentNode[]|undefined=>{
      var aa = sourceFile;var a1  = this;
      console.log(ts.SyntaxKind[node.kind],node.getFullText());
      //CallExpression getAge()
      switch(node.kind){
        case ts.SyntaxKind.VariableDeclaration:
          return workVariableDeclarationwork(node as ts.VariableDeclaration);
        // case ts.SyntaxKind.ArrowFunction:
        //   return workArrowFunction(node as ts.ArrowFunction,child);
        // case ts.SyntaxKind.ConditionalExpression:
        //   // return workConditionalExpression(node as ts.ConditionalExpression,child)
        // case ts.SyntaxKind.Identifier:
        // case ts.SyntaxKind.ReturnStatement:
        // case ts.SyntaxKind.ArrowFunction:
        // case ts.SyntaxKind.FunctionDeclaration:
        // case ts.SyntaxKind.Block:
        // case ts.SyntaxKind.CallExpression:
        // case ts.SyntaxKind.TemplateSpan:
        // case ts.SyntaxKind.TemplateExpression:
        // case ts.SyntaxKind.JsxExpression:
        // case ts.SyntaxKind.JsxAttributes:
        //   return findStyledNode(node.parent);
        case ts.SyntaxKind.JsxAttribute:
          return workJsxAttribute(node as ts.JsxAttribute);
        case ts.SyntaxKind.JsxOpeningElement:
          return workJsxOpeningElement(node as ts.JsxOpeningElement)
        case ts.SyntaxKind.JsxElement:
          return workJsxOpeningElement((node as ts.JsxElement).openingElement)
        case ts.SyntaxKind.JsxClosingElement:
          return undefined
        default:
          return findStyledNode(node.parent)
      }
    }

    let _node = findStyledNode(node)
    // let aa = this.parseCssSelector(node[0].tsNode)
    // let aa = this.parseCssSelector(node[0].parent[0].tsNode)
    // if(aa){
      this.getSelectors(_node!,stringNode)
    // }
    // console.log(aa);


    //todo  查找dom点击节点
    // while(node){
    //   console.log(ts.SyntaxKind[node.kind]);

    //   // node = node?.parent
    // }
    let references = this.languageService.getReferencesAtPosition(fileName,pos)
    
    references?.map(reference=>{
      let sourceFile = program?.getSourceFile(reference.fileName)
      let node = this.tsHelp.findNode(sourceFile!, reference.textSpan.start)
      console.log(node);
      
    })
  }

  flatClassNameChildrenNodes(node){
    // wait optmize
    // const flatArrayFn = flatten
    const flatArrayFn = (node)=>{
      let flatArray:any = []
      if(Array.isArray(node)){
        node.map((item)=>{
          let flatItem = flattenNodes(item)
          if(Array.isArray(flatItem)){
            flatArray = [...flatArray,...flatItem]
          }else{
            flatArray = [...flatArray,flatItem]
          }
        })
        return flatArray
      }else{
        return node
      }
    }
    const flattenNodes = (node)=>{
      if(node.tsNode && node.tsNode.kind == ts.SyntaxKind.JsxElement){
        let arrays = node.children || []
        let className = node.className || []
        let flatArray:any[] = []
        arrays.map((item)=>{
          let flatItem = flattenNodes(item)
          if(Array.isArray(flatItem)){
            flatArray = [...flatArray,...flatItem]
          }else{
            flatArray = [...flatArray,flatItem]
          }
        })
        node.children = flatArray
        node.className = flatArrayFn(className)
        return node
      }else{
        return flatArrayFn(node)
      } 
    }

    return flattenNodes(node)

  }
  getSelectors = (styledComponentNode:StyledComponentNode[],sourceSelector:ts.StringLiteral)=>{
    let isElement = (node:JsxElementNode)=>{
      return node.type == 'styledElement' || node.type == 'intrinsicElements'
    }
    console.log(styledComponentNode);
    const get1 = (parseCssSelectors)=>{
      let result:CandidateTextNode[] = []
          const matchNode = (parseCssSelectors:JsxElementNode[])=>{
            parseCssSelectors.forEach(cssSelector =>{
              if(cssSelector.type == "styledElement" || cssSelector.type == "intrinsicElements"){
                let { selectors = [],children = []} = cssSelector
                selectors.forEach(selector=>{
                  let {type, selectorType, children = []} = selector
                  console.log(selector);
                  children.forEach(selectorNode=>{
                    console.log(selectorNode.text || selectorNode.tsNode.getText());
                    console.log(sourceSelector.text);
                    const isSame = (selectorNode,sourceSelector)=>{
                      return selectorNode.tsNode == sourceSelector
                    }
                    if(isSame(selectorNode,sourceSelector)){
                      console.log(selectorNode);
                      result.push(selectorNode)
                    }
                  })
                })
                return matchNode(children)
              }
            })
          }
          matchNode(parseCssSelectors)
    }



    let aa = styledComponentNode.filter(node=> {
      if(node.type == 'styledElement'){
        if(node.scssText.match(sourceSelector.text)){
          // let parseCssSelectors = this.parseCssSelector(node.tsNode as ts.JsxElement)
          let parseCssSelectors = this.parseCssSelector(node.parent[0].tsNode as ts.JsxElement);
          get1(parseCssSelectors)
        }
      }

    })

    return aa

  }
  


}


// containerKind:
// undefined
// containerName:
// ''
// contextSpan:
// {start: 533, length: 158}
// failedAliasResolution:
// false
// fileName:
// 'example/index.tsx'
// isAmbient:
// false
// isLocal:
// true
// kind:
// 'function'
// name:
// 'ShowMemeber'
// textSpan:
// {start: 519, length: 11}
// unverified:
// false



// containerKind:
// undefined
// containerName:
// 'JSX.IntrinsicElements'
// contextSpan:
// {start: 141545, length: 83}
// failedAliasResolution:
// false
// fileName:
// 'example/node_modules/@types/react/index.d.ts'
// isAmbient:
// true
// isLocal:
// false
// kind:
// 'property'
// name:
// 'div'
// textSpan:
// {start: 141545, length: 3}
// unverified:
// false