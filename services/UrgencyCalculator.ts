import { DateTime } from 'luxon';

export type UrgencyLevel = 'CRISIS' | 'DUE_TODAY' | 'DO_NOW' | 'CHILL';

export interface UrgencyStatus {
    level: UrgencyLevel;
    label: string;
    score: number; // For sorting
}

export class UrgencyCalculator {
    public static calculate(deadline: string | null, planDate: string | null): UrgencyStatus {
        const now = DateTime.now();

        // If no deadline, check plan date. If neither, it's chill.
        if (!deadline && !planDate) {
            return { level: 'CHILL', label: 'Someday', score: 0 };
        }

        let deadlineDiff = 999;
        if (deadline) {
            const d = DateTime.fromISO(deadline);
            if (d.isValid) {
                // Precise diff in days (float)
                deadlineDiff = d.diff(now, 'days').days;
            }
        }

        let planDiff = 999;
        if (planDate) {
            const p = DateTime.fromISO(planDate);
            if (p.isValid) {
                planDiff = p.diff(now, 'days').days;
            }
        }

        // 1. CRISIS: Deadline passed
        if (deadlineDiff < 0) {
            return { level: 'CRISIS', label: `Overdue`, score: 100 };
        }

        // 2. DUE SOON (Within 24 hours)
        if (deadlineDiff <= 1) {
            // Calculate hours/minutes for label
            const hours = Math.ceil(deadlineDiff * 24);
            return { level: 'DUE_TODAY', label: `Due in ${hours}h`, score: 90 };
        }

        // 3. DO NOW: Planned start date is passed
        if (planDiff <= 0) {
            return { level: 'DO_NOW', label: 'Do Now', score: 80 };
        }

        // 4. DO NOW (Proximity): Deadline is < 3 days away
        if (deadlineDiff <= 3) {
            const days = Math.ceil(deadlineDiff);
            return { level: 'DO_NOW', label: `Due in ${days}d`, score: 70 };
        }

        // 5. CHILL
        return { level: 'CHILL', label: 'On Track', score: 10 };
    }
}
