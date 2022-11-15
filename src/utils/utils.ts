



export const flatten = <T>(array: T[][],options:{deep?:boolean  } = {}):T[] => {
  if(!Array.isArray(array)){
    return array
  }
  const flattenArray = (array:any[])=>{
    let _array: any[] = []
    array.forEach(item => {
      if (Array.isArray(item)) {
        if(options.deep){
          _array = [..._array, ...flattenArray(item)]
        }else{
          _array = [..._array, ...item]
        }
      } else {
        _array.push(item)
      }
    })
    return _array
  }
  return flattenArray(array)
}


export const unique = <T>(array:T[],callback?:(pre:T,current:T)=>boolean):T[]=>{
  let _array:T[] = []
  const isSame = (pre,current)=>{
    if(callback){
      return callback(pre,current)
    }else{
      return pre == current
    }
  }
  array.forEach(item=>{
    if(!_array.find(arr =>isSame(arr,item))){
      _array.push(item)
    }
  })
  return _array
}

export const findResult = <T,P>(array:T[],callback:(item:T)=>P):P|undefined=>{
  for(let i in array){
    let result = callback(array[i]);
    if(result){
      return result
    }
  }
}