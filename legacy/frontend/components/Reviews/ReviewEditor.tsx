/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import { Editor, EditorState, RichUtils } from "draft-js"

import "draft-js/dist/Draft.css"

import React from "react"

interface IReviewEditorProps {
  editorState: EditorState
  handleChange: (es: EditorState) => void
}

const ReviewEditor: React.FunctionComponent<IReviewEditorProps> = ({
  editorState,
  handleChange,
}) => {
  const editor = React.useRef(null)

  const focusEditor = (): void => {
    editor.current.focus()
  }
  const styleMap = {
    SPOILER: {
      textDecoration: "line-through",
    },
  }

  const toggleSpoiler = (): void => {
    handleChange(RichUtils.toggleInlineStyle(editorState, "SPOILER"))
  }
  // const contentState = editorState.getCurrentContent();

  return (
    <div className="space-y-1">
      <button
        className="text-xs px-2 py-1 rounded-sm bg-bastille-lightest uppercase font-semibold"
        onClick={toggleSpoiler}
      >
        spoiler
      </button>
      <div className="h-36 md:h-48">
        <div
          className="border rounded-sm border-gray-500 bg-selago min-h-full cursor-text p-2 md:text-sm"
          onClick={focusEditor}
        >
          <Editor
            ref={editor}
            editorState={editorState}
            onChange={handleChange}
            customStyleMap={styleMap}
            placeholder="Vous avez aimé ? détesté ? C'est votre avis qui intéresse la communauté Tiween !"
          />
        </div>
      </div>
    </div>
  )
}

export default ReviewEditor
