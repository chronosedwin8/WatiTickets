import { useState, useRef } from 'react'
import { Upload, X, File as FileIcon, Image as ImageIcon, FileText, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface FileUploaderProps {
    files: File[]
    onFilesChange: (files: File[]) => void
    maxSizeMB?: number
    accept?: string
    className?: string
}

export function FileUploader({
    files,
    onFilesChange,
    maxSizeMB = 50,
    accept = "*",
    className
}: FileUploaderProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [error, setError] = useState<string | null>(null)
    const [isDragging, setIsDragging] = useState(false)

    // Construct accept string for input
    // However, for strict security we also validate in JS
    const allowedExtensions = [
        // Images
        '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
        // Documents
        '.pdf', '.doc', '.docx', '.txt', '.rtf',
        // Spreadsheets
        '.xls', '.xlsx', '.csv',
        // Presentations
        '.ppt', '.pptx',
        // OpenOffice
        '.odt', '.ods', '.odp',
        // Archives
        '.zip', '.rar', '.7z', '.tar', '.gz'
    ]

    const blockedExtensions = [
        '.exe', '.msi', '.bat', '.cmd', '.sh', '.bin', '.scr', '.js', '.vbs', '.php', '.pl', '.py'
    ]

    const handleFiles = (newFiles: File[]) => {
        setError(null)
        const validFiles: File[] = []

            for (const file of newFiles) {
                // Check size
                if (file.size > maxSizeMB * 1024 * 1024) {
                    setError(`El archivo ${file.name} excede el tamaño máximo de ${maxSizeMB}MB.`)
                    continue
                }

                // Check extension
                const extension = '.' + file.name.split('.').pop()?.toLowerCase()

                if (blockedExtensions.includes(extension)) {
                    setError(`El archivo ${file.name} no está permitido por seguridad.`)
                    continue
                }

                // Optional: Check if allowed (if we want to be strict whitelist)
                // For now, relying on blocklist for "dangerous" + general file types
                // But user asked specifically for Office, PDF, Compressed.
                if (!allowedExtensions.includes(extension) && !file.type.startsWith('image/')) {
                    // Warn but maybe allow if it's not blocked? 
                    // Let's be strict to what was requested to ensure safety.
                    if (!blockedExtensions.includes(extension)) {
                        // Decide if we allow or not. 
                        // "it is necessary to attach other types... but allow no dangerous"
                        // Whitelist is safer.
                        setError(`El tipo de archivo ${extension} no es compatible.`)
                        continue
                    }
                }

                validFiles.push(file)
            }

            onFilesChange([...files, ...validFiles])
        
        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            handleFiles(Array.from(e.target.files))
        }
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
        if (e.dataTransfer.files) {
            handleFiles(Array.from(e.dataTransfer.files))
        }
    }

    const removeFile = (index: number) => {
        const newFiles = [...files]
        newFiles.splice(index, 1)
        onFilesChange(newFiles)
    }

    const getFileIcon = (file: File) => {
        if (file.type.startsWith('image/')) return <ImageIcon size={20} className="text-blue-500" />
        if (file.type.includes('pdf')) return <FileText size={20} className="text-red-500" />
        if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) return <FileText size={20} className="text-green-500" />
        if (file.name.endsWith('.doc') || file.name.endsWith('.docx')) return <FileText size={20} className="text-blue-700" />
        if (file.name.endsWith('.zip') || file.name.endsWith('.rar')) return <FileIcon size={20} className="text-yellow-600" />
        return <FileIcon size={20} className="text-gray-500" />
    }

    return (
        <div className={cn("space-y-3", className)}>
            <div
                className={cn(
                    "border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-colors cursor-pointer",
                    isDragging ? "bg-indigo-50 border-indigo-400" : "border-slate-300 bg-slate-50 hover:bg-slate-100"
                )}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    multiple
                    // We can use the accept attribute to help the OS picker
                    accept={allowedExtensions.join(',')}
                />

                <div className="bg-indigo-50 p-3 rounded-full mb-3">
                    <Upload className="h-6 w-6 text-indigo-600" />
                </div>
                <p className="text-sm font-medium text-slate-700">
                    Haz clic para seleccionar o arrastra archivos aquí
                </p>
                <p className="text-xs text-slate-500 mt-1">
                    Soporta imágenes, documentos (PDF, Word, Excel), y comprimidos (ZIP, RAR). Máx {maxSizeMB}MB.
                </p>

                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={(e) => {
                        e.stopPropagation()
                        fileInputRef.current?.click()
                    }}
                >
                    Seleccionar Archivos
                </Button>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            {files.length > 0 && (
                <div className="space-y-2">
                    {files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                            <div className="flex items-center gap-3 overflow-hidden">
                                {getFileIcon(file)}
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-700 truncate">
                                        {file.name}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {(file.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => removeFile(index)}
                                className="text-slate-400 hover:text-red-500 transition-colors p-1"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
