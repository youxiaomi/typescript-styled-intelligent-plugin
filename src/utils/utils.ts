



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