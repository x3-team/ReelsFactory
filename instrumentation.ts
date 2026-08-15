export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { bootProductionServices } = await import("@/lib/boot");
    await bootProductionServices();
  }
}
