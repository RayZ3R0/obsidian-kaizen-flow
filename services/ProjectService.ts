import { App, TFile, Notice } from 'obsidian';
import { DateTime } from 'luxon';

export interface ProjectTemplateStep {
    name: string;
    lead_days: number;
    context: string;
}

export interface ProjectConfig {
    projectName: string;
    deadline: string; // YYYY-MM-DD
    steps: ProjectTemplateStep[];
}

export class ProjectService {
    private app: App;

    constructor(app: App) {
        this.app = app;
    }

    async createProject(config: ProjectConfig) {
        const { projectName, deadline, steps } = config;
        let currentDeadline: DateTime = DateTime.fromISO(deadline);

        if (!currentDeadline.isValid) {
            new Notice('Invalid deadline date.');
            return;
        }

        // 1. Create Project Folder
        // We'll put everything in "Kaizen Projects/ProjectName" to keep it tidy
        const rootFolder = "Kaizen Projects";
        if (!this.app.vault.getAbstractFileByPath(rootFolder)) {
            await this.app.vault.createFolder(rootFolder);
        }

        const projectFolder = `${rootFolder}/${projectName}`;
        if (!this.app.vault.getAbstractFileByPath(projectFolder)) {
            await this.app.vault.createFolder(projectFolder);
        }

        const filesCreated: TFile[] = [];

        // Iterate backwards through steps
        // The last step in the array is the "Final" step usually, or we assume the array is ordered Start -> Finish.
        // If the array is [Scripting, Filming, Editing], then Editing happens LAST.
        // So we process in REVERSE order.

        const reverseSteps = [...steps].reverse();

        for (const step of reverseSteps) {
            // Task Deadline = currentDeadline
            // Task Start = currentDeadline - lead_days
            const taskDeadline: DateTime = currentDeadline;
            const taskStart: DateTime = taskDeadline.minus({ days: step.lead_days });

            // Format dates
            const deadlineStr = taskDeadline.toISODate();
            const planStr = taskStart.toISODate();

            // Create Content
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
                // Check if file exists, if so, append 1, 2 etc? Or just fail?
                // For now, let's just try to create.
                // Assuming root for now, or user configured folder.
                const file = await this.app.vault.create(filename, content);
                filesCreated.push(file);

                // Update currentDeadline for the NEXT step (which is the PREVIOUS logical step)
                // The PREVIOUS step must finish by the START of THIS step.
                currentDeadline = taskStart;

            } catch (e) {
                console.error(`Failed to create file: ${filename}`, e);
                new Notice(`Error creating ${filename}.`);
            }
        }

        new Notice(`Kaizen: Created ${filesCreated.length} project files in ${projectFolder}.`);
    }
}
