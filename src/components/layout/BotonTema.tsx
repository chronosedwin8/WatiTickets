/**
 * Interruptor de tema.
 *
 * El icono gira y se funde al cambiar: un gesto pequeño que confirma que la
 * acción surtió efecto sin necesidad de un aviso.
 */
import { Sun, Moon } from 'lucide-react'
import { useTema } from '@/contexts/TemaContext'
import { cn } from '@/lib/utils'

export function BotonTema({ className }: { className?: string }) {
    const { tema, alternar } = useTema()
    const esOscuro = tema === 'oscuro'

    return (
        <button
            onClick={alternar}
            aria-label={esOscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            title={esOscuro ? 'Tema claro' : 'Tema oscuro'}
            className={cn(
                'relative grid h-9 w-9 place-items-center rounded-lg text-slate-500',
                'transition-colors hover:bg-slate-100 hover:text-slate-800',
                className
            )}
        >
            <Sun
                size={18}
                className={cn(
                    'absolute transition-all duration-300',
                    esOscuro ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
                )}
            />
            <Moon
                size={18}
                className={cn(
                    'absolute transition-all duration-300',
                    esOscuro ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
                )}
            />
        </button>
    )
}
