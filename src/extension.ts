// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import fs = require('fs');
import readline = require('readline');
import path = require('path');
import * as vscode from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "get-message" is now active!');

	vscode.languages.registerHoverProvider('javascript', {
		provideHover(document, position, token) {
			const range = document.getWordRangeAtPosition(position, /\"([a-zA-Z]+\.)+[a-zA-Z]+\"/);
			const word = document.getText(range);
			

			if (typeof range !== 'undefined') {
				const propertyFile = path.dirname(document.fileName)+path.sep+'sample.properties';
				const contents = fs.readFileSync(propertyFile);
				const lines = contents.toString().split('\n');
				const regExp = new RegExp(`${word.slice(1,-1)}=(.*)`);
				var message:string = "";

				for (var i in lines) {
					const result = lines[i].match(regExp);
					if (result !== null) {
						message = result.at(1)!;
						break;
					}
				};
				return new vscode.Hover(message);
			}
		}
	});
}

// this method is called when your extension is deactivated
export function deactivate() {}
