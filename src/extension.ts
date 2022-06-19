// The module 'vscode' contains the VS Code extensibility API
// Import the module and {reference} it with the alias vscode in your code below
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "view-tc-log-message" is now active!');

	var disposable = vscode.languages.registerHoverProvider('java', {
		provideHover(document, position, token) {
			const range = document.getWordRangeAtPosition(position, /\"([a-zA-Z]+\.)+[a-zA-Z]+\"/);
			let locale = vscode.workspace.getConfiguration().get('conf.viewTcLogMessage.locale');
			if (locale === "") {
				locale = vscode.env.language;
			}
			console.info(locale);

			if (typeof range !== 'undefined') {
				return new Promise((resolve) => {
					const baseName = path.dirname(document.fileName) + path.sep + 'LocalStrings';
					const extName = '.properties';
					const key: string = document.getText(range).slice(1, -1);
					let message: string[] = [];

					[baseName+extName, baseName+'_'+locale+extName].map((propertyFile,idx) => {
						try {
							fs.readFileSync(propertyFile).toString().split('\n').forEach((line) => {
								if (line.startsWith(key)) {
									message[idx] = line.slice(key.length + 1);
								}
							});
						} catch (err) {	}	
					});

					resolve(new vscode.Hover(message));
				});
			}
		}
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() { }
