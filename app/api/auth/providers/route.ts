import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { getLinkedProviders } from "@/lib/auth/linked-providers";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getUsersCollection } from "@/lib/db/models/User";
import { auditAuthEvent } from "@/lib/auth/audit";

export async function DELETE(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const provider = body?.provider;
    if (provider !== "google" && provider !== "apple") {
      return NextResponse.json({ error: "Only OAuth providers can be unlinked here" }, { status: 400 });
    }

    const db = await connectWithRetry();
    const users = await getUsersCollection(db);
    const user = await users.findOne({ _id: new ObjectId(auth.user.id) });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const linkedProviders = getLinkedProviders(user);
    const remainingProviders = linkedProviders.filter((item) => item.provider !== provider);
    if (remainingProviders.length === linkedProviders.length) {
      return NextResponse.json({ error: "Provider is not linked" }, { status: 404 });
    }
    if (remainingProviders.length === 0) {
      return NextResponse.json({ error: "At least one sign-in method must remain linked" }, { status: 400 });
    }

    const primary = remainingProviders.find((item) => item.provider !== "credentials") ?? remainingProviders[0];
    const setFields = {
      linkedProviders: remainingProviders,
      provider: primary.provider,
      ...(primary.providerId ? { providerId: primary.providerId } : {}),
    };
    const calendarUnset: Record<string, ""> = provider === "google" ? { googleCalendarAccessToken: "", googleCalendarRefreshToken: "", googleCalendarExpiresAt: "" } : {};
    await users.updateOne(
      { _id: user._id },
      primary.providerId
        ? { $set: setFields, ...(Object.keys(calendarUnset).length ? { $unset: calendarUnset } : {}), $inc: { sessionVersion: 1 } }
        : { $set: setFields, $unset: { providerId: "", ...calendarUnset }, $inc: { sessionVersion: 1 } }
    );

    auditAuthEvent("provider_unlinked", { userId: auth.user.id, provider });
    return NextResponse.json({ success: true, providers: remainingProviders.map(({ provider: name, linkedAt }) => ({ provider: name, linkedAt })) });
  } catch (error) {
    console.error("Provider-unlink error:", error);
    return NextResponse.json({ error: "Unable to unlink provider" }, { status: 503 });
  }
}

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const db = await connectWithRetry();
    const users = await getUsersCollection(db);
    const user = await users.findOne({ _id: new ObjectId(auth.user.id) });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    return NextResponse.json({
      providers: getLinkedProviders(user).map(({ provider, linkedAt }) => ({ provider, linkedAt })),
      hasPassword: Boolean(user.password),
    });
  } catch (error) {
    console.error("Provider-status error:", error);
    return NextResponse.json({ error: "Unable to load account providers" }, { status: 503 });
  }
}
