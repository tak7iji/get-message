// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import fs = require('fs');
import path = require('path');
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
			const config = vscode.workspace.getConfiguration('conf.viewTcLogMessage');
			const locale = config.get<string>('locale');

			if (typeof range !== 'undefined') {
				return new Promise((resolve) => {
					const key:string = document.getText(range).slice(1, -1);
					var contents:Buffer;
					let lines:string[] = [];
					var message:string[] = [];

					propertyFile = path.dirname(document.fileName)+path.sep+'LocalStrings.properties';
					try {
						contents = fs.readFileSync(propertyFile);
						contents.toString().split('\n').forEach((line) => {
							if (line.startsWith(key)) {
								message[0] = (line.slice(key.length+1));
							}
						});
					} catch(err) {}

					if (locale !== '') {
						var propertyFile = path.dirname(document.fileName)+path.sep+'LocalStrings_'+locale+'.properties';
						try {
							contents = fs.readFileSync(propertyFile);
							contents.toString().split('\n').forEach((line) => {
								if (line.startsWith(key)) {
									message[1] = line.slice(key.length+1);
								}
							});
						} catch(err) {
						}	
					}
	
					resolve(new vscode.Hover(message));
				});
			}
			return;
		}
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
