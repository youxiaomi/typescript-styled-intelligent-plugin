



type User = {
  age: number,
  address: string,
}



function user(user:User){
  let _user = user
  let { age,address }= _user
  return age
}

  var tom = {
    address:'street',
    age: 18
  }

  function TestGetObject(props) {
    const { user, age, ...reset } = props     
    var member = props.user
    var currentTom = tom
    var address = currentTom.address
    return age
  }
