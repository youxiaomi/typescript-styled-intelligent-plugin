// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import { workspace, ExtensionContext } from 'vscode';

import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,

} from 'vscode-languageclient/node';
import {
	ProviderResult,
	TextDocument,
	Position,
	CancellationToken,
	Definition,
	DefinitionLink,
} from 'vscode'
let client: LanguageClient;

const pluginName = 'vscode-styled-intelligent-plugin'

export function activate(context: vscode.ExtensionContext) {
	let serverModule = context.asAbsolutePath(path.join('out','server', 'server.js'));
	let debugOptions = { execArgv: ['--nolazy', '--inspect=6001'] };

	let serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
			options: debugOptions
		}
	};
	// vscode.languages.registerDefinitionProvider("typescriptreact",{
	// 	provideDefinition(document: TextDocument, position: Position, token: CancellationToken): ProviderResult<Definition | DefinitionLink[]>{
	// 		return []
	// 	}
	// })

	 let clientOptions: LanguageClientOptions = {
    // documentSelector: [{ scheme: 'file', language: "typescriptreact" }],
		// middleware:{
		// 	// provideCompletionItem 
		// },
		// initializationOptions:{
		// 	hover:true,
		// },
    // synchronize: {
      
    // }
  };

  client = new LanguageClient(
    pluginName,
    pluginName,
    serverOptions,
    clientOptions
  );

  client.start();


	return
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}

