import { useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import {
    Bold, Italic, Underline, Strikethrough,
    List, ListOrdered, AlignLeft, AlignCenter, AlignRight,
    Link as LinkIcon, Image as ImageIcon, Code, Quote, Heading1, Heading2, Heading3,
    Undo, Redo, Palette, Type, Upload, Loader2
} from 'lucide-react'
import { uploadFileToS3 } from '@/lib/uploads'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface RichTextEditorProps {
    value: string
    onChange: (html: string) => void
    placeholder?: string
    minHeight?: string
    className?: string
    s3Path?: string
}

function ToolbarButton({ onClick, active, title, children, disabled }: {
    onClick: () => void
    active?: boolean
    title: string
    children: React.ReactNode
    disabled?: boolean
}) {
    return (
        <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
                e.preventDefault()
                onClick()
            }}
            disabled={disabled}
            title={title}
            className={`p-1.5 rounded transition-colors ${active ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            {children}
        </button>
    )
}

function ToolbarSeparator() {
    return <div className="w-px h-6 bg-slate-200 mx-1" />
}

export function RichTextEditor({
    value,
    onChange,
    placeholder = 'Escribe aquí...',
    minHeight = '200px',
    className,
    s3Path = 'uploads/general'
}: RichTextEditorProps) {
    const [uploading, setUploading] = useState(false)
    const [dialog, setDialog] = useState<{
        type: 'link' | 'image' | 'color' | null
        value: string
    }>({ type: null, value: '' })

    const editor = useEditor({
        extensions: [
            StarterKit,
            TextStyle,
            Color,
            Image,
            Link.configure({
                openOnClick: false,
            }),
            Placeholder.configure({
                placeholder,
            }),
        ],
        content: value,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        },
    })

    if (!editor) {
        return null
    }

    const openDialog = (type: 'link' | 'image' | 'color', defaultValue: string = '') => {
        setDialog({ type, value: defaultValue })
    }

    const handleDialogSubmit = () => {
        if (!dialog.type) return

        if (dialog.value) {
            if (dialog.type === 'link') {
                editor.chain().focus().setLink({ href: dialog.value }).run()
            }
            if (dialog.type === 'image') {
                editor.chain().focus().setImage({ src: dialog.value }).run()
            }
            if (dialog.type === 'color') {
                editor.chain().focus().setColor(dialog.value).run()
            }
        }

        setDialog({ type: null, value: '' })
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            setUploading(true)
            const timestamp = new Date().getTime()
            const filename = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
            const path = `${s3Path}/${filename}`

            const url = await uploadFileToS3(file, path)
            editor.chain().focus().setImage({ src: url }).run()
            setDialog({ type: null, value: '' })
        } catch (error) {
            if (import.meta.env.DEV) console.error('Error uploading image:', error)
            const message = error instanceof Error ? error.message : 'Error desconocido'
            toast({ title: 'Error al subir imagen', description: 'Verifica tu configuración de S3. ' + message, variant: 'destructive' })
        } finally {
            setUploading(false)
            if (e.target) e.target.value = ''
        }
    }

    return (
        <div className={cn("rounded-lg border border-slate-200 overflow-hidden bg-white focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-300 transition-all flex flex-col", className)}>
            <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-slate-50 border-b border-slate-200">
                <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Deshacer"><Undo size={15} /></ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Rehacer"><Redo size={15} /></ToolbarButton>
                <ToolbarSeparator />
                <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Título 1"><Heading1 size={15} /></ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Título 2"><Heading2 size={15} /></ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Título 3"><Heading3 size={15} /></ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().setParagraph().run()} active={editor.isActive('paragraph')} title="Párrafo normal"><Type size={15} /></ToolbarButton>
                <ToolbarSeparator />
                <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Negrita"><Bold size={15} /></ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Cursiva"><Italic size={15} /></ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Tachado"><Strikethrough size={15} /></ToolbarButton>
                <ToolbarSeparator />
                <ToolbarButton onClick={() => openDialog('color', editor.getAttributes('textStyle').color || '#000000')} title="Color de texto"><Palette size={15} /></ToolbarButton>
                <ToolbarSeparator />
                <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Lista con viñetas"><List size={15} /></ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Lista numerada"><ListOrdered size={15} /></ToolbarButton>
                <ToolbarSeparator />
                <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Cita"><Quote size={15} /></ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Bloque de código"><Code size={15} /></ToolbarButton>
                <ToolbarSeparator />
                <ToolbarButton onClick={() => openDialog('link', editor.getAttributes('link').href || 'https://')} active={editor.isActive('link')} title="Insertar enlace"><LinkIcon size={15} /></ToolbarButton>
                <ToolbarButton onClick={() => openDialog('image', '')} title="Insertar imagen"><ImageIcon size={15} /></ToolbarButton>
            </div>

            {dialog.type && (
                <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 flex items-center gap-3 text-sm animate-fade-in z-10 w-full overflow-hidden">
                    <span className="font-semibold text-slate-700 whitespace-nowrap hidden sm:inline-block">
                        {dialog.type === 'link' && 'Enlace:'}
                        {dialog.type === 'image' && 'Imagen:'}
                        {dialog.type === 'color' && 'Color:'}
                    </span>

                    {dialog.type === 'image' ? (
                        <div className="flex gap-2 flex-1 items-center overflow-hidden">
                            <input
                                type="url"
                                autoFocus
                                placeholder="Pegar URL de imagen..."
                                className="flex-1 px-2 py-1.5 border border-slate-300 rounded text-sm min-w-0 bg-white"
                                value={dialog.value}
                                onChange={e => setDialog(prev => ({ ...prev, value: e.target.value }))}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleDialogSubmit() } }}
                            />
                            <span className="text-slate-400 text-xs hidden sm:inline-block">o</span>
                            <label className={`flex items-center justify-center px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded border border-indigo-200 text-sm font-medium transition-colors shrink-0 ${uploading ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}>
                                {uploading ? <Loader2 size={14} className="animate-spin sm:mr-1.5" /> : <Upload size={14} className="sm:mr-1.5" />}
                                <span className="hidden sm:inline-block">Subir archivo</span>
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                            </label>
                        </div>
                    ) : dialog.type === 'color' ? (
                        <input
                            type="color"
                            className="w-10 h-8 p-0.5 rounded cursor-pointer border border-slate-300"
                            value={dialog.value}
                            autoFocus
                            onChange={e => setDialog(prev => ({ ...prev, value: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleDialogSubmit() } }}
                        />
                    ) : (
                        <input
                            type="url"
                            autoFocus
                            placeholder="https://..."
                            className="flex-1 px-3 py-1.5 border border-slate-300 rounded text-sm min-w-0 bg-white"
                            value={dialog.value}
                            onChange={e => setDialog(prev => ({ ...prev, value: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleDialogSubmit() } }}
                        />
                    )}

                    <button
                        type="button"
                        onMouseDown={e => e.preventDefault()}
                        onClick={handleDialogSubmit}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-medium transition-colors shrink-0"
                    >
                        Aplicar
                    </button>
                    <button
                        type="button"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => setDialog({ type: null, value: '' })}
                        className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-sm font-medium transition-colors shrink-0"
                    >
                        Cancelar
                    </button>
                </div>
            )}

            <EditorContent 
                editor={editor} 
                className="rich-text-editor-content p-4 outline-none text-sm text-slate-800 overflow-y-auto flex-1 prose prose-sm max-w-none"
                style={{ minHeight }}
            />

            <style>{`
                .ProseMirror p.is-editor-empty:first-child::before {
                    content: attr(data-placeholder);
                    float: left;
                    color: #adb5bd;
                    pointer-events: none;
                    height: 0;
                }
                .ProseMirror:focus {
                    outline: none;
                }
                .rich-text-editor-content pre { background: #1e293b; color: #e2e8f0; padding: 1em; border-radius: 0.5em; font-family: monospace; }
                .rich-text-editor-content blockquote { border-left: 3px solid #6366f1; padding-left: 1rem; color: #64748b; }
            `}</style>
        </div>
    )
}
