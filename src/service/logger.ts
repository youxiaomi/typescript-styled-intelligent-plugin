


class Logger{

  info(...args){
    this.warn(args)
  }
  warn(...args){
    console.log('plugin styled------------',...args)
  }

  
}

const logger = new Logger()

export default logger