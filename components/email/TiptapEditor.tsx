'use client'
import React, { useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'

interface Props { value: string; onChange: (md: string) => void; disabled?: boolean }

const toMarkdown = (html: string): string => {
  return html
    .replace(/<li><p>/g, '<li>')
    .replace(/<\/p><\/li>/g, '</li>')
    .replace(/<br\s*\/>/g, '\n')
    .replace(/<p><\/p>/g, '\n')
    .replace(/<p>/g, '\n')
    .replace(/<\/p>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .trim()
}

export default function TiptapEditor({ value, onChange, disabled }: Props) {
  const editor = useEditor({
    editable: !disabled,
    extensions: [StarterKit, Link.configure({ openOnClick: false })],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      const md = toMarkdown(html)
      onChange(md.length > 5 ? md : html)
    },
  }, [disabled])

  useEffect(() => { /* no-op sync to avoid cursor jumps */ }, [value])
  if (!editor) return null
  return (
    <div className="border rounded-md p-2 bg-white dark:bg-neutral-900">
      <div className="flex gap-2 mb-2 flex-wrap">
        <button type="button" className="text-xs px-2 py-1 rounded border" onClick={() => editor.chain().focus().toggleBold().run()}>B</button>
        <button type="button" className="text-xs px-2 py-1 rounded border" onClick={() => editor.chain().focus().toggleItalic().run()}>I</button>
        <button type="button" className="text-xs px-2 py-1 rounded border" onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</button>
        <button type="button" className="text-xs px-2 py-1 rounded border" onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. List</button>
        <button type="button" className="text-xs px-2 py-1 rounded border" onClick={() => { const url = prompt('URL'); if (url) editor.chain().focus().setLink({ href: url }).run() }}>Link</button>
      </div>
      <EditorContent editor={editor} className="prose max-w-none text-sm" />
    </div>
  )
}
