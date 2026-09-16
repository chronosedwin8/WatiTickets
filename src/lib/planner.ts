import { addDays, addWeeks, addMonths, addYears, isBefore, startOfDay, format } from 'date-fns'
import { type MaintenancePlan, type MaintenanceActivity } from './api'

export function generateActivityDates(
    start: Date,
    end: Date | null,
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom',
    interval: number = 1,
    limit: number = 365 // Safety limit for occurrences to avoid infinite loops
): Date[] {
    const dates: Date[] = []
    let current = startOfDay(start)
    // If no end date, default to 1 year from start
    const effectiveEnd = end ? startOfDay(end) : addYears(start, 1)

    // Safety brake
    let count = 0

    while ((isBefore(current, effectiveEnd) || current.getTime() === effectiveEnd.getTime()) && count < limit) {
        dates.push(new Date(current))
        count++

        switch (frequency) {
            case 'daily':
                current = addDays(current, interval)
                break
            case 'weekly':
                current = addWeeks(current, interval)
                break
            case 'monthly':
                current = addMonths(current, interval)
                break
            case 'yearly':
                current = addYears(current, interval)
                break
            case 'custom':
                // Custom frequency uses interval as number of days
                current = addDays(current, interval)
                break
            default:
                current = addMonths(current, 1)
        }
    }

    return dates
}

export function createActivitiesFromPlan(
    plan: MaintenancePlan,
    tenantId: string
): Omit<MaintenanceActivity, 'id' | 'created_at' | 'updated_at' | 'assignees'>[] {
    const dates = generateActivityDates(
        new Date(plan.start_date),
        plan.end_date ? new Date(plan.end_date) : null,
        plan.frequency,
        plan.interval
    )

    return dates.map(date => ({
        tenant_id: tenantId,
        plan_id: plan.id,
        team_id: plan.team_id || null,
        title: plan.title,
        scheduled_date: format(date, 'yyyy-MM-dd'),
        due_date: null,
        status: 'pending' as const,
        priority: plan.priority,
        created_by: plan.created_by,
        completed_at: null,
        completed_by: null
    }))
}
