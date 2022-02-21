// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {
	console.log('Congratulations, your extension "sample" is now active!');

	const storageStruct = {
		'/Users/Mac': {
			1: {
				2: {
					
				}	
			}
		}
	}
	
	const storage = context.workspaceState
	let editor = vscode.window.activeTextEditor

	let clearStorage = vscode.commands.registerCommand('sample.clearStorage', function () {
		storage.keys().forEach((key) => {
			storage.update(key, undefined)
		})

		if(! editor) {
			return
		}

		editor.setDecorations(noteDecorationType, []);
	});

	let disposable = vscode.commands.registerCommand('sample.noteSelection', function () {
		if(!editor) {
			return
		}
		
		const editorFileName = editor.document.fileName

		const selection = editor.selection

		if(! selection.isSingleLine) {
			return
		}

		const message = (new Date()).toISOString()

		addNoteAtRange(editorFileName, selection, message)
		
		triggerHighlightNoted()
	});

	let isObject = function(obj) {
		return obj !== undefined && obj !== null && obj.constructor == Object && ! Array.isArray(obj);
	}

	let parseNotedLineKey = function(notedLineKey) {
		let notedLineSplitted = notedLineKey.split(':')
		let notedLineCharSplitted = notedLineSplitted[1]?.split('|')

		return {
			line: parseInt(notedLineSplitted[0]),
			start: parseInt(notedLineCharSplitted[0]),
			end: parseInt(notedLineCharSplitted[1]),
		}
	}

	const noteDecorationType = vscode.window.createTextEditorDecorationType({
		borderWidth: '1px',
		borderStyle: 'solid',
		overviewRulerColor: 'blue',
		overviewRulerLane: vscode.OverviewRulerLane.Right,
		light: {
			// this color will be used in light color themes
			borderColor: 'darkblue'
		},
		dark: {
			// this color will be used in dark color themes
			borderColor: 'lightblue'
		}
	})

	const triggerHighlightNoted = function() {
		if(!editor) {
			return;
		}

		const editorFileName = editor.document.fileName

		let fileNotedLines = storage.get(editorFileName)

		const fileNotedDecorations = []

		if(isObject(fileNotedLines) && Object.keys(fileNotedLines).length) {
			for (const [key, value] of Object.entries(fileNotedLines)) {
				let {line, start, end} = parseNotedLineKey(key)

				const startPos = new vscode.Position(line, start)
				const endPos = new vscode.Position(line, end)
				const range = new vscode.Range(startPos, endPos)

				console.log(editor.document.getText(range))

				if(editor.document.getText(range) == '') {
					removeNoteAtRange(editorFileName, range)
					continue
				}

				const decoration = { range: new vscode.Range(startPos, endPos), hoverMessage: value};

				fileNotedDecorations.push(decoration)
			}

			editor.setDecorations(noteDecorationType, fileNotedDecorations);
		}
	}

	const addNoteAtRange = function(fileName, range, note = '') {
		const key = `${range.start.line}:${range.start.character}|${range.end.character}`

		let notes = storage.get(fileName, {});
		
		notes[key] = note;

		storage.update(fileName, notes)
	}

	const removeNoteAtRange = function(fileName, range) {
		const key = `${range.start.line}:${range.start.character}|${range.end.character}`

		let notes = storage.get(key, {})

		delete notes[key]

		storage.update(fileName, notes)
	}

	if(editor) {
		triggerHighlightNoted()
	}

	vscode.window.onDidChangeActiveTextEditor(activeEditor => {
		editor = activeEditor;
		if (editor) {
			triggerHighlightNoted();
		}
	}, null, context.subscriptions);

	context.subscriptions.push(
		disposable,
		clearStorage
	);
}

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
