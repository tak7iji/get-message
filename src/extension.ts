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
			
			if (typeof range !== 'undefined') {
				return new Promise((resolve) => {
					const word = document.getText(range);
					var contents:Buffer;
					var lines:string[] = [];
					var propertyFile = path.dirname(document.fileName)+path.sep+'LocalStrings_ja.properties';
					try {
						contents = fs.readFileSync(propertyFile);
						lines = contents.toString().split('\n');
					} catch(err) {}
	
	
					propertyFile = path.dirname(document.fileName)+path.sep+'LocalStrings.properties';
					try {
						contents = fs.readFileSync(propertyFile);
						lines.concat(contents.toString().split('\n'));
					} catch(err) {}
	
					const key:string = word.slice(1, -1);
					lines.forEach((line) => {
						if (line.startsWith(key)) {
							resolve(new vscode.Hover(line.slice(key.length+1)));
						}
					});
				});
			}
			return;
		}
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
