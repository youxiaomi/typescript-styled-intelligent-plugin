



export const flatten = (array: any[]) => {
  let _array: any[] = []
  array.forEach(item => {
    if (Array.isArray(item)) {
      _array = [..._array, ...item]
    } else {
      _array.push(item)
    }
  })
  return _array
}

export const unique = <T>(array:T[]):T[]=>{
  let _array:T[] = []
  array.forEach(item=>{
    if(!_array.find(arr =>arr == item)){
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