import { useState, useEffect } from 'react'

export interface Toast {
    id: string
    title?: string
    description?: string
    variant?: 'default' | 'destructive'
}

interface ToasterToast extends Toast {
    onOpenChange?: (open: boolean) => void
}

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 3000

type ToastActionElement = React.ReactElement

interface ToastProps {
    title?: string
    description?: string
    variant?: 'default' | 'destructive'
    action?: ToastActionElement
}

let count = 0

function genId() {
    count = (count + 1) % Number.MAX_VALUE
    return count.toString()
}

type ToasterState = {
    toasts: ToasterToast[]
}

const listeners: Array<(state: ToasterState) => void> = []

let memoryState: ToasterState = { toasts: [] }

function dispatch(action: { type: string; toast?: ToasterToast }) {
    if (action.type === 'ADD_TOAST') {
        memoryState.toasts = [...memoryState.toasts, action.toast!].slice(-TOAST_LIMIT)
    } else if (action.type === 'UPDATE_TOAST') {
        memoryState.toasts = memoryState.toasts.map((t) =>
            t.id === action.toast?.id ? { ...t, ...action.toast } : t
        )
    } else if (action.type === 'DISMISS_TOAST') {
        memoryState.toasts = memoryState.toasts.filter((t) => t.id !== action.toast?.id)
    }
    listeners.forEach((listener) => {
        listener(memoryState)
    })
}

export function toast(props: ToastProps) {
    const id = genId()

    const update = (props: ToasterToast) =>
        dispatch({
            type: 'UPDATE_TOAST',
            toast: { ...props, id },
        })
    const dismiss = () => dispatch({ type: 'DISMISS_TOAST', toast: { id, title: '', description: '' } })

    dispatch({
        type: 'ADD_TOAST',
        toast: {
            ...props,
            id,
            onOpenChange: (open) => {
                if (!open) dismiss()
            },
        },
    })

    setTimeout(() => {
        dismiss()
    }, TOAST_REMOVE_DELAY)

    return {
        id,
        dismiss,
        update,
    }
}

export function useToast() {
    const [state, setState] = useState<ToasterState>(memoryState)

    useEffect(() => {
        listeners.push(setState)
        return () => {
            const index = listeners.indexOf(setState)
            if (index > -1) {
                listeners.splice(index, 1)
            }
        }
    }, [])

    return {
        ...state,
        toast,
        dismiss: (toastId?: string) => dispatch({ type: 'DISMISS_TOAST', toast: { id: toastId!, title: '', description: '' } }),
    }
}
