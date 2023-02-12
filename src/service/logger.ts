


class Logger{

  info(...args){
    this.warn(args)
  }
  warn(...args){
    let e  = new Error()
    console.log('plugin styled------------',...args);
    console.log('line:',e.stack?.split('\n').slice(2,6))
  }

  
}

const logger = new Logger()

export default logger