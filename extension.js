// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const _set = require('lodash.set');
const _get = require('lodash.get');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {
	// const storageStruct = {
	// 	'/path/to/file/': {
	// 		1: // startLine
	// 			{
	// 				1: //endLine - currently, startLine and endLine has same value (single line)
	// 					[
	// 						{
	// 							start: 1, //start of position
	// 							end: 2, //end of position
	// 							note: 'Test 1-2' // note (Markdownable)
	// 						}
	// 					]
	// 			}
	// 	}
	// }
	
	const storage = context.workspaceState
	let editor = vscode.window.activeTextEditor

	const isObject = function(obj) {
		return obj !== undefined && obj !== null && obj.constructor == Object && ! Array.isArray(obj)
	}

	const noteDecorationType = vscode.window.createTextEditorDecorationType({
		borderRadius: '3px',
		borderWidth: '0.5px',
		borderStyle: 'groove',
		overviewRulerColor: 'gray',
		overviewRulerLane: vscode.OverviewRulerLane.Right,
		light: {
			borderColor: '#bcc6d6',
		},
		dark: {
			borderColor: '#bcc6d6',
		}
	})

	let clearStorage = vscode.commands.registerCommand('cote.clearStorage', function () {
		storage.keys().forEach((key) => {
			storage.update(key, undefined)
		})

		if(! editor) {
			return
		}

		editor.setDecorations(noteDecorationType, [])
	})

	let addNote = vscode.commands.registerCommand('cote.noteSelection', async function () {
		if(!editor) {
			return
		}
		
		const editorFileName = editor.document.fileName

		const selection = editor.selection

		if(! selection.isSingleLine) {
			vscode.window.showWarningMessage('Currently we only support note in single line.')
			return
		}

		const note = await vscode.window.showInputBox({
			placeHolder: 'Write your note.'
		})

		if(typeof note === 'undefined') {
			return
		}
		
		addNoteAtRange(editorFileName, selection, note)

		triggerHighlightNoted()
	})

	let removeNote = vscode.commands.registerCommand('cote.removeNote', function () {
		if(!editor) {
			return
		}
		
		const editorFileName = editor.document.fileName

		const selection = editor.selection

		let startLine = selection?.start.line
		let endLine = selection?.end.line

		let notes = storage.get(editorFileName, {})
		
		let storedNotes = _get(notes, [startLine, endLine], [])

		if(storedNotes != null) {
			storedNotes.forEach((note) => {
				const startPos = new vscode.Position(parseInt(startLine), parseInt(note?.start))
				const endPos = new vscode.Position(parseInt(endLine), parseInt(note?.end))
				const range = new vscode.Range(startPos, endPos)

				if(range.contains(selection)) {
					removeNoteAtRange(editorFileName, range)
				}
			})

			triggerHighlightNoted()
		}
	})

	const triggerHighlightNoted = function() {
		if(!editor) {
			return
		}

		const editorFileName = editor.document.fileName

		let storedNotes = storage.get(editorFileName)

		const fileNotedDecorations = []

		if(isObject(storedNotes) && Object.keys(storedNotes).length) {
			Object.keys(storedNotes).forEach((startOfLine) => {
				let startObject = storedNotes[startOfLine]

				Object.keys(startObject).forEach((endOfLine) => {
					let noteObjects = startObject[endOfLine]

					if(noteObjects == null) {
						return
					}

					noteObjects.forEach((note) => {
						const startPos = new vscode.Position(parseInt(startOfLine), parseInt(note?.start))
						const endPos = new vscode.Position(parseInt(endOfLine), parseInt(note?.end))
						const range = new vscode.Range(startPos, endPos)
	
						if(editor.document.getText(range) == '' || !editor.document.getText(range)) {
							removeNoteAtRange(editorFileName, range)
							return
						}

						if(! note?.note) {
							return
						}
	
						const decoration = { range: new vscode.Range(startPos, endPos), hoverMessage: note?.note}
	
						fileNotedDecorations.push(decoration)
					})
				})
			})

			editor.setDecorations(noteDecorationType, fileNotedDecorations)
		}
	}

	const addNoteAtRange = function(fileName, range, note = '') {
		if(range.isEmpty) {
			return
		}

		let startLine = range?.start.line
		let endLine = range?.end.line

		let notes = storage.get(fileName, {})
		
		let storedNotes = _get(notes, [startLine, endLine], [])

		let resolvedOverlapNotes = storedNotes.map((item) => {
			let storedRange = storedNoteToRange(startLine, endLine, item)

			if(storedRange.isEmpty) {
				return
			}

			if(range.intersection(storedRange)) {
				return
			}

			return item
		})

		resolvedOverlapNotes.push({
			start: range?.start.character,
			end: range?.end.character,
			note: note
		})

		_set(notes, [startLine, endLine], resolvedOverlapNotes.filter(i => i))

		storage.update(fileName, notes)
	}

	const storedNoteToRange = function(startLine, endLine, storedNote) {
		return new vscode.Range(
			new vscode.Position(startLine, storedNote?.start),
			new vscode.Position(endLine, storedNote?.end)
		)
	}

	const removeNoteAtRange = function(fileName, range) {
		let notes = storage.get(fileName, {})

		let startLine = range?.start.line
		let endLine = range?.end.line

		let storedNotes = _get(notes, [startLine, endLine], [])

		let removeNoteIndex = storedNotes.findIndex((item) => {
			return item.start == range?.start.character && item.end == range?.end.character
		})

		if(removeNoteIndex < 0) {
			return
		}
		
		storedNotes[removeNoteIndex] = undefined

		_set(notes, [startLine, endLine], storedNotes.filter(i => i))
		
		storage.update(fileName, notes)
	}

	if(editor) {
		triggerHighlightNoted()
	}

	vscode.window.onDidChangeActiveTextEditor(activeEditor => {
		editor = activeEditor
		if (editor) {
			triggerHighlightNoted()
		}
	}, null, context.subscriptions)

	context.subscriptions.push(
		addNote,
		removeNote
	)
}

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
