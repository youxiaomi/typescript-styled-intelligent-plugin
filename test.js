

function getTom(){
  return new Promise(res=>{
    setTimeout(()=>res('tom'),3000)
  })
}
function getJerry(){
  return new Promise(res=>{
    setTimeout(()=>res('jerry'),3000)
  })
}

function* getUser(){
  console.log('start')
  debugger
  const tom = yield  getTom() 
  debugger 
  console.log(tom,'tome');
  let j = yield getJerry()
  debugger
  console.log(j,'jer')
  return j
}
function* countUser(){
  debugger
  let user = yield runTime(getUser());
  debugger
  console.log(user,'user');
}
function runTime(generateFn){
  let fn = generateFn
  return new Promise(resolve=>{
    function step(val){
      let newVal = fn.next(val)
      debugger
      if(newVal.value instanceof Promise){
        return Promise.resolve(newVal.value).then((value)=>{
          step(value)
        })
      }else{
        if(newVal.done){
          debugger
          resolve(newVal.value)
        }else{
          return step(newVal.value)
        }
      }
     
    }
    step(fn)
  })
}
debugger
console.log(runTime(countUser()),'123123')