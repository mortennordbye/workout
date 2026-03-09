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
        // Strength Exercises
        { name: "Squat", category: "strength", isCustom: false },
        { name: "Bench Press", category: "strength", isCustom: false },
        { name: "Deadlift", category: "strength", isCustom: false },
        { name: "Overhead Press", category: "strength", isCustom: false },
        { name: "Barbell Row", category: "strength", isCustom: false },
        { name: "Pull-up", category: "strength", isCustom: false },
        { name: "Dip", category: "strength", isCustom: false },
        { name: "Leg Press", category: "strength", isCustom: false },
        { name: "Romanian Deadlift", category: "strength", isCustom: false },
        { name: "Front Squat", category: "strength", isCustom: false },
        { name: "Incline Bench Press", category: "strength", isCustom: false },
        { name: "Lat Pulldown", category: "strength", isCustom: false },

        // Cardio  Exercises
        { name: "Running", category: "cardio", isCustom: false },
        { name: "Cycling", category: "cardio", isCustom: false },
        { name: "Rowing Machine", category: "cardio", isCustom: false },
        { name: "Jump Rope", category: "cardio", isCustom: false },
        { name: "Swimming", category: "cardio", isCustom: false },

        // Flexibility
        { name: "Static Stretching", category: "flexibility", isCustom: false },
        {
          name: "Dynamic Stretching",
          category: "flexibility",
          isCustom: false,
        },
        { name: "Yoga", category: "flexibility", isCustom: false },
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
