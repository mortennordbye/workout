import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { exercises, users } from "../src/db/schema";

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    // Create demo user
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, "demo@example.com"),
    });

    if (!existingUser) {
      await db.insert(users).values({
        email: "demo@example.com",
      });
      console.log("✅ Created demo user");
    } else {
      console.log("ℹ️  Demo user already exists");
    }

    // Seed exercises
    const existingExercises = await db.query.exercises.findMany();

    if (existingExercises.length === 0) {
      await db.insert(exercises).values([
        // Upper Body — Chest
        { name: "Bench Press", category: "strength", isCustom: false, bodyArea: "upper_body", muscleGroup: "chest", equipment: "barbell", movementPattern: "push" },
        { name: "Incline Bench Press", category: "strength", isCustom: false, bodyArea: "upper_body", muscleGroup: "chest", equipment: "barbell", movementPattern: "push" },
        { name: "Dumbbell Fly", category: "strength", isCustom: false, bodyArea: "upper_body", muscleGroup: "chest", equipment: "dumbbell", movementPattern: "push" },
        { name: "Dip", category: "strength", isCustom: false, bodyArea: "upper_body", muscleGroup: "chest", equipment: "bodyweight", movementPattern: "push" },
        { name: "Cable Crossover", category: "strength", isCustom: false, bodyArea: "upper_body", muscleGroup: "chest", equipment: "cable", movementPattern: "push" },

        // Upper Body — Back
        { name: "Deadlift", category: "strength", isCustom: false, bodyArea: "full_body", muscleGroup: "back", equipment: "barbell", movementPattern: "hinge" },
        { name: "Barbell Row", category: "strength", isCustom: false, bodyArea: "upper_body", muscleGroup: "back", equipment: "barbell", movementPattern: "pull" },
        { name: "Pull-up", category: "strength", isCustom: false, bodyArea: "upper_body", muscleGroup: "back", equipment: "bodyweight", movementPattern: "pull" },
        { name: "Lat Pulldown", category: "strength", isCustom: false, bodyArea: "upper_body", muscleGroup: "back", equipment: "cable", movementPattern: "pull" },
        { name: "Seated Cable Row", category: "strength", isCustom: false, bodyArea: "upper_body", muscleGroup: "back", equipment: "cable", movementPattern: "pull" },

        // Upper Body — Shoulders
        { name: "Overhead Press", category: "strength", isCustom: false, bodyArea: "upper_body", muscleGroup: "shoulders", equipment: "barbell", movementPattern: "push" },
        { name: "Dumbbell Lateral Raise", category: "strength", isCustom: false, bodyArea: "upper_body", muscleGroup: "shoulders", equipment: "dumbbell", movementPattern: "push" },

        // Upper Body — Arms
        { name: "Barbell Curl", category: "strength", isCustom: false, bodyArea: "upper_body", muscleGroup: "biceps", equipment: "barbell", movementPattern: "pull" },
        { name: "Tricep Pushdown", category: "strength", isCustom: false, bodyArea: "upper_body", muscleGroup: "triceps", equipment: "cable", movementPattern: "push" },
        { name: "Skull Crusher", category: "strength", isCustom: false, bodyArea: "upper_body", muscleGroup: "triceps", equipment: "barbell", movementPattern: "push" },

        // Lower Body
        { name: "Squat", category: "strength", isCustom: false, bodyArea: "lower_body", muscleGroup: "quads", equipment: "barbell", movementPattern: "squat" },
        { name: "Front Squat", category: "strength", isCustom: false, bodyArea: "lower_body", muscleGroup: "quads", equipment: "barbell", movementPattern: "squat" },
        { name: "Leg Press", category: "strength", isCustom: false, bodyArea: "lower_body", muscleGroup: "quads", equipment: "machine", movementPattern: "squat" },
        { name: "Romanian Deadlift", category: "strength", isCustom: false, bodyArea: "lower_body", muscleGroup: "hamstrings", equipment: "barbell", movementPattern: "hinge" },
        { name: "Hip Thrust", category: "strength", isCustom: false, bodyArea: "lower_body", muscleGroup: "glutes", equipment: "barbell", movementPattern: "hinge" },
        { name: "Leg Curl", category: "strength", isCustom: false, bodyArea: "lower_body", muscleGroup: "hamstrings", equipment: "machine", movementPattern: "pull" },
        { name: "Calf Raise", category: "strength", isCustom: false, bodyArea: "lower_body", muscleGroup: "calves", equipment: "machine", movementPattern: "push" },

        // Core
        { name: "Plank", category: "strength", isCustom: false, bodyArea: "core", muscleGroup: "abs", equipment: "bodyweight", movementPattern: "isometric" },
        { name: "Ab Wheel Rollout", category: "strength", isCustom: false, bodyArea: "core", muscleGroup: "abs", equipment: "other", movementPattern: "isometric" },
        { name: "Hanging Leg Raise", category: "strength", isCustom: false, bodyArea: "core", muscleGroup: "abs", equipment: "bodyweight", movementPattern: "pull" },
        { name: "Russian Twist", category: "strength", isCustom: false, bodyArea: "core", muscleGroup: "abs", equipment: "bodyweight", movementPattern: "rotation" },
        { name: "Farmer's Carry", category: "strength", isCustom: false, bodyArea: "full_body", muscleGroup: "full_body", equipment: "dumbbell", movementPattern: "carry" },

        // Cardio
        { name: "Running", category: "cardio", isCustom: false, bodyArea: "cardio", muscleGroup: "cardio", equipment: "bodyweight", movementPattern: "cardio" },
        { name: "Cycling", category: "cardio", isCustom: false, bodyArea: "cardio", muscleGroup: "cardio", equipment: "machine", movementPattern: "cardio" },
        { name: "Rowing Machine", category: "cardio", isCustom: false, bodyArea: "cardio", muscleGroup: "cardio", equipment: "machine", movementPattern: "cardio" },
        { name: "Jump Rope", category: "cardio", isCustom: false, bodyArea: "cardio", muscleGroup: "cardio", equipment: "other", movementPattern: "cardio" },
        { name: "Swimming", category: "cardio", isCustom: false, bodyArea: "cardio", muscleGroup: "cardio", equipment: "bodyweight", movementPattern: "cardio" },

        // Flexibility
        { name: "Static Stretching", category: "flexibility", isCustom: false, bodyArea: "full_body", muscleGroup: "full_body", equipment: "bodyweight", movementPattern: "isometric" },
        { name: "Dynamic Stretching", category: "flexibility", isCustom: false, bodyArea: "full_body", muscleGroup: "full_body", equipment: "bodyweight", movementPattern: "isometric" },
        { name: "Yoga", category: "flexibility", isCustom: false, bodyArea: "full_body", muscleGroup: "full_body", equipment: "bodyweight", movementPattern: "isometric" },
      ]);
      console.log("✅ Seeded exercises");
    } else {
      console.log("ℹ️  Exercises already seeded");
    }

    console.log("✅ Seeding completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seed();
