export interface TrainingPlan {
  id: number;
  name: string;
  description?: string;
}

export interface Exercise {
  id: number;
  name: string;
  category?: string;
  muscleGroups?: string;
}

export interface PlannedExerciseResponse {
  id: number;

  exerciseId?: number;
  exerciseName?: string;

  exercise?: {
    id: number;
    name: string;
    category?: string | null;
    muscleGroups?: string | null;
  };

  category?: string | null;
  muscleGroups?: string | null;

  orderIndex?: number | null;
  plannedSets?: number | null;
  plannedReps?: number | null;
  plannedWeightKg?: number | null;
  notes?: string | null;
}

export interface TrainingSession {
  id?: number;
  name: string;
  days: number[];
  planId: number | null;
  planName?: string;

  exerciseExecutions?: PlannedExerciseResponse[];
  exerciseNames?: string[];
}

export interface ExecutionDraft {
  executionId?: number | null;
  exerciseId: number;
  orderIndex: number;
  plannedSets: number;
  plannedReps: number;
  plannedWeightKg: number;
  notes: string | null;
}

export interface CreateTrainingSessionRequest {
  planId: number;
  name: string;
  days: number[];
}

export interface UpdateTrainingSessionRequest {
  planId?: number;
  name?: string;
  days?: number[];
}

export interface ExecutionRequest {
  exerciseId: number;
  orderIndex: number;
  plannedSets: number;
  plannedReps: number;
  plannedWeightKg: number;
  notes: string | null;
}
