"use client";
// This component runs seedDatabase() once when the app first loads.
// It's invisible to the user — just initializes default data in IndexedDB.
import { useEffect } from "react";
import { seedDatabase } from "@/lib/db";

export function InitDb() {
  useEffect(() => {
    seedDatabase();
  }, []);
  return null;
}
