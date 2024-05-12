
# Typescript-styled-intelligent-plugin
### A styled-components plugins

### Description
typescript-styled-intelligent-plugin is an auxiliary tool that enhances the functionality of styled-components by providing intelligent navigation support.


This repo has two projects:

- `/` is a Typescript Plugin 
- `/example` is a example use Typescript-styled-intelligent-plugin


### Usage

#### With TypeScript  
install  Typescript-styled-intelligent-plugin

```
npm install --save-dev git+https://github.com/youxiaomi/typescript-styled-intelligent-plugin.git
```

Then add a plugins section to your tsconfig.json or jsconfig.json
```
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "typescript-styled-intelligent-plugin"
      }
    ]
  }
}
```

Finally, run the Select TypeScript version command in VS Code to switch to use the workspace version of TypeScript for VS Code's JavaScript and TypeScript language support

#### With VSCode 
see  