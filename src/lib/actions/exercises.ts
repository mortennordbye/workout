"use server";

/**
 * Exercise Server Actions
 *
 * Server actions for managing exercises.
 * Handles both system exercises and user-created custom exercises.
 */

import { db } from "@/db";
import { exercises } from "@/db/schema";
import { createExerciseSchema } from "@/lib/validators/workout";
import type { ActionResult, Exercise } from "@/types/workout";

/**
 * Get all exercises
 *
 * Fetches all available exercises, both system and custom.
 * Used to populate exercise selection dropdowns.
 *
 * @returns All exercises in the database
 */
export async function getAllExercises(): Promise<ActionResult<Exercise[]>> {
  try {
    const allExercises = await db.query.exercises.findMany({
      orderBy: (exercises, { asc }) => [asc(exercises.name)],
    });

    return {
      success: true,
      data: allExercises,
    };
  } catch (error) {
    console.error("Error fetching exercises:", error);
    return {
      success: false,
      error: "Failed to fetch exercises",
    };
  }
}

/**
 * Create a custom exercise
 *
 * Allows users to add their own exercises beyond the system defaults.
 *
 * @returns The created exercise on success
 */
export async function createCustomExercise(
  data: unknown,
): Promise<ActionResult<Exercise>> {
  try {
    // Validate input
    const validation = createExerciseSchema.safeParse(data);

    if (!validation.success) {
      return {
        success: false,
        error: "Invalid input data",
        fieldErrors: validation.error.flatten().fieldErrors,
      };
    }

    const { name, category, isCustom, bodyArea, muscleGroup, equipment, movementPattern } = validation.data;

    // Check if exercise already exists
    const existing = await db.query.exercises.findFirst({
      where: (exercises, { eq }) => eq(exercises.name, name),
    });

    if (existing) {
      return {
        success: false,
        error: "An exercise with this name already exists",
      };
    }

    // Insert exercise
    const [exercise] = await db
      .insert(exercises)
      .values({
        name,
        category,
        isCustom,
        bodyArea,
        muscleGroup,
        equipment,
        movementPattern,
      })
      .returning();

    return {
      success: true,
      data: exercise,
    };
  } catch (error) {
    console.error("Error creating exercise:", error);
    return {
      success: false,
      error: "Failed to create exercise. Please try again.",
    };
  }
}
