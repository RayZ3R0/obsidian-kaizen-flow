import { DateTime } from 'luxon';

export type UrgencyLevel = 'CRISIS' | 'DUE_TODAY' | 'DO_NOW' | 'CHILL';

export interface UrgencyStatus {
    level: UrgencyLevel;
    label: string;
    score: number; // For sorting
}

export class UrgencyCalculator {
    public static calculate(deadline: string | null, planDate: string | null): UrgencyStatus {
        const today = DateTime.now().startOf('day');

        // If no deadline, check plan date. If neither, it's chill.
        if (!deadline && !planDate) {
            return { level: 'CHILL', label: 'Someday', score: 0 };
        }

        let deadlineDiff = 999;
        if (deadline) {
            const d = DateTime.fromISO(deadline).startOf('day');
            if (d.isValid) {
                deadlineDiff = d.diff(today, 'days').days;
            }
        }

        let planDiff = 999;
        if (planDate) {
            const p = DateTime.fromISO(planDate).startOf('day');
            if (p.isValid) {
                planDiff = p.diff(today, 'days').days;
            }
        }

        // 1. CRISIS: Deadline is today or recently passed
        if (deadlineDiff <= 0) {
            if (deadlineDiff < 0) {
                return { level: 'CRISIS', label: `Overdue ${Math.abs(deadlineDiff)}d`, score: 100 };
            }
            return { level: 'DUE_TODAY', label: 'Due Today', score: 90 };
        }

        // 2. DO NOW: Planned start date is today or passed
        if (planDiff <= 0) {
            return { level: 'DO_NOW', label: 'Do Now', score: 80 };
        }

        // 3. DO NOW (Proximity): Deadline is very close (e.g. tomorrow) even if plan is later?
        // Actually, let's stick to the plan. But if deadline is < 3 days away, bump it.
        if (deadlineDiff <= 3) {
            return { level: 'DO_NOW', label: `Due in ${deadlineDiff}d`, score: 70 };
        }

        // 4. CHILL
        return { level: 'CHILL', label: 'On Track', score: 10 };
    }
}
