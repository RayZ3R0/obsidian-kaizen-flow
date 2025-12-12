import { App, TFile, Notice } from 'obsidian';
import { DateTime } from 'luxon';

export interface ProjectTemplateStep {
    name: string;
    lead_days: number;
    context: string;
    time?: string;
}

export interface ProjectConfig {
    projectName: string;
    deadline: string;
    steps: ProjectTemplateStep[];
    finalTaskName?: string;
}

export class ProjectService {
    private app: App;

    constructor(app: App) {
        this.app = app;
    }

    async createProject(config: ProjectConfig) {
        const { projectName, deadline, steps, finalTaskName } = config;
        let currentDeadline: DateTime = DateTime.fromISO(deadline);

        if (!currentDeadline.isValid) {
            new Notice('Invalid deadline date.');
            return;
        }

        const rootFolder = "Kaizen Projects";
        if (!this.app.vault.getAbstractFileByPath(rootFolder)) {
            await this.app.vault.createFolder(rootFolder);
        }

        const projectFolder = `${rootFolder}/${projectName}`;
        if (!this.app.vault.getAbstractFileByPath(projectFolder)) {
            await this.app.vault.createFolder(projectFolder);
        }

        const filesCreated: TFile[] = [];

        const finalStep: ProjectTemplateStep = {
            name: finalTaskName || "Submission",
            lead_days: 0,
            context: "Submission"
        };
        const allSteps = [...steps, finalStep];

        const reverseSteps = [...allSteps].reverse();

        for (const step of reverseSteps) {

            let taskDeadline: DateTime = currentDeadline;

            if (step.time) {
                const [targetHour, targetMinute] = step.time.split(':').map(Number);
                if (!isNaN(targetHour) && !isNaN(targetMinute)) {
                    taskDeadline = taskDeadline.set({ hour: targetHour, minute: targetMinute, second: 0, millisecond: 0 });
                }
            }

            const taskStart: DateTime = taskDeadline.minus({ days: step.lead_days });

            const deadlineStr = taskDeadline.toISO();
            const planStr = taskStart.toISO();

            const filename = `${projectFolder}/${step.name}.md`;
            const content = `---
type: "task"
project: "${projectName}"
status: "todo"
context: "${step.context}"
lead_days: ${step.lead_days}
deadline: "${deadlineStr}"
planned_date: "${planStr}"
est_time: 60
act_time: null
---
# ${step.name} for ${projectName}

Tasks:
- [ ] 
`;

            try {
                const file = await this.app.vault.create(filename, content);
                filesCreated.push(file);

                currentDeadline = taskStart;

            } catch (e) {
                console.error(`Failed to create file: ${filename}`, e);
                new Notice(`Error creating ${filename}.`);
            }
        }

        new Notice(`Kaizen: Created ${filesCreated.length} project files in ${projectFolder}.`);
    }
}
