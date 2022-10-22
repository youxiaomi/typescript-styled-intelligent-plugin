


type Ts  = typeof import("typescript")
// import  from 'typescript/lib/tsserverlibrary'
import * as ts from 'typescript'

export default class TsHelp {
  constructor(typescript: Ts,languageService: ts.LanguageService){
    this.typescript = typescript
    typescript
    this.languageService = languageService
  }
  typescript:Ts
  languageService: ts.LanguageService
  findNode(sourceFile: ts.SourceFile, position: number){
    let  find = (node: ts.Node): ts.Node | undefined  => {
      if (position >= node.getStart() && position < node.getEnd()) {
        return this.typescript.forEachChild(node, find) || node;
      }
    }
    return find(sourceFile);
  }
  findNodeByRange(sourceFile: ts.SourceFile, startPosition: number,endPosition: number){
    let find = (node: ts.Node): ts.Node | undefined  => {
      if (startPosition == node.getStart() && endPosition == node.getEnd()) {
        return node;
      } else{
        let _node = this.typescript.forEachChild(node, find)
        return  _node;
      }
    }
    let _node = find(sourceFile)
    return _node
  }
  getStyledNameIdentifier(templateNode){
    return templateNode.parent.parent
  }
  getReferences(fileName,pos:number){
    return this.languageService.getReferencesAtPosition(fileName,pos) || []
  }
  getReferenceNodes(fileName,pos: number){
    let references = this.getReferences(fileName,pos);
    let program = this.languageService.getProgram()
    let referenceNodes = references?.map(reference => {

      let sourceFile = program?.getSourceFile(reference.fileName)
      if (sourceFile) {
        if(!reference.contextSpan){
          return undefined
        }
        let start = reference.contextSpan?.start || 0
        let end  = ( reference.contextSpan?.start || 0 )+ (reference.contextSpan?.length || 0 )
        return this.findNodeByRange(sourceFile,start, end)
      } else {
        return undefined
      }
    })

    return referenceNodes.filter(reference => reference)
  }
  getDefinition(fileName,pos:number){
    return  this.languageService.getDefinitionAtPosition(fileName,pos) || []
  }
  getDefinitionNodes(fileName,pos:number){
    let definitions = this.getDefinition(fileName,pos)
    let program = this.languageService.getProgram()
    return definitions.map(definition =>{
      let sourceFile = program?.getSourceFile(definition.fileName)
      if (sourceFile) {
        if(!definition.contextSpan){
          return undefined
        }
        let start = definition.contextSpan?.start || 0
        let end  = ( definition.contextSpan?.start || 0 )+ (definition.contextSpan?.length || 0 )
        return this.findNodeByRange(sourceFile,start, end)
      } else {
        return undefined
      }
    })
  }
  isCustomJsxElement(node){
    return node && node.containerName != 'JSX.IntrinsicElements'
  }
  
}

