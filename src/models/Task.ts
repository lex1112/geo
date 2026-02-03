import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn } from "typeorm";
import { Workflow } from "./Workflow";
import { TaskStatus } from "../workers/TaskStatus";

@Entity({ name: "tasks" })
export class Task {
  @PrimaryColumn()
  taskId!: string;

  @Column()
  clientId!: string;

  @Column("text")
  geoJson!: string;

  @Column()
  status!: TaskStatus;

  @Column({ nullable: true, type: "text" })
  progress?: string | null;

  @Column({ nullable: true })
  resultId?: string;

  @Column()
  taskType!: string;

  @Column({ default: 1 })
  stepNumber!: number;

  @Column({ nullable: true, type: "text" })
  output!: string | null;

  @Column({ nullable: true, type: "text" })
  input!: string | null;

  @ManyToOne(() => Workflow, (workflow) => workflow.tasks)
  workflow!: Workflow;

  @Column({ nullable: true })
  dependsOnId?: string;

  @ManyToOne(() => Task, { nullable: true })
  @JoinColumn({ name: "dependsOnId" })
  dependency?: Task;
}

export { TaskStatus };
