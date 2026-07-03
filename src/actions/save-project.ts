"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function saveProject(
  projectId: string,
  messages: any[],
  data: Record<string, any>
) {
  const session = await getSession();
  if (!session) return;

  try {
    await prisma.project.update({
      where: { id: projectId, userId: session.userId },
      data: {
        messages: JSON.stringify(messages),
        data: JSON.stringify(data),
      },
    });
  } catch (error) {
    console.error("Failed to save project:", error);
  }
}
