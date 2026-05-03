import { APP_NAME } from "@sario/shared";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-4xl font-bold tracking-tight">{APP_NAME}</h1>
      <p className="text-muted-foreground text-lg">
        Premium sarees, direct from weavers.
      </p>
      <p className="text-sm text-muted-foreground">
        Storefront coming soon — catalog, cart, and checkout are next.
      </p>
    </main>
  );
}
