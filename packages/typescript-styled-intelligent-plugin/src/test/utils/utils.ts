import path from 'path'
import assert from 'assert'

export class DefinitionConfig{
  constructor(public classNameSelector:string,public prefix:string,public fileText:string = '',public suffix:string = ''){


  }
  getStart(){
    let resultPos = this.fileText?.indexOf(`${this.prefix}${this.classNameSelector}${this.suffix}`) || 0
    resultPos+=this.prefix.length
    return resultPos
  }

}


export function getPath(filePath:string){
  return path.join(process.cwd(),filePath)
}
export function verifyDefinitions(result:ts.DefinitionInfoAndBoundSpan|undefined,definitionConfigs:DefinitionConfig[]){
  assert.equal(result?.definitions?.length, definitionConfigs.length)
  definitionConfigs.forEach((item,index)=>{
    let definition = result?.definitions?.[index]
    let start = definition?.textSpan.start
    assert.equal(start, item.getStart(),`index:${index}`)
  })
}