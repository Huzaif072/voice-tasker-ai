import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is required");

const apply = process.argv.includes("--apply");
const client = new MongoClient(uri);
await client.connect();
try {
  const users = client.db("voicetasker").collection("users");
  const documents = await users.find({}, {
    projection: {
      email: 1,
      provider: 1,
      providerId: 1,
      linkedProviders: 1,
      emailVerifiedAt: 1,
      emailVerificationTokenHash: 1,
      sessionVersion: 1,
    },
  }).toArray();

  const emailGroups = new Map<string, string[]>();
  const identityGroups = new Map<string, string[]>();
  for (const user of documents) {
    const email = typeof user.email === "string" ? user.email.trim().toLowerCase() : "";
    if (email) emailGroups.set(email, [...(emailGroups.get(email) ?? []), String(user._id)]);
    const identities = [
      user.providerId && user.provider ? `${user.provider}:${user.providerId}` : null,
      ...(user.linkedProviders ?? []).map((item: { provider?: string; providerId?: string }) =>
        item.providerId && item.provider ? `${item.provider}:${item.providerId}` : null
      ),
    ].filter((value): value is string => Boolean(value));
    for (const identity of identities) {
      identityGroups.set(identity, [...(identityGroups.get(identity) ?? []), String(user._id)]);
    }
  }

  const duplicateEmails = [...emailGroups].filter(([, ids]) => ids.length > 1);
  const duplicateIdentities = [...identityGroups].filter(([, ids]) => ids.length > 1);
  console.log(JSON.stringify({
    apply,
    users: documents.length,
    nonNormalizedEmails: documents.filter((user) => user.email !== user.email?.trim().toLowerCase()).length,
    duplicateEmails,
    duplicateIdentities,
  }, null, 2));

  if (!apply) {
    console.log("Dry run only. Re-run with --apply after resolving duplicate emails and provider identities.");
  } else if (duplicateEmails.length || duplicateIdentities.length) {
    throw new Error("Refusing to apply while duplicate email or provider identities exist");
  } else {
    for (const user of documents) {
      const update: Record<string, unknown> = { sessionVersion: user.sessionVersion ?? 0 };
      if (typeof user.email === "string") update.email = user.email.trim().toLowerCase();
      if (user.providerId && user.provider && !user.emailVerifiedAt) update.emailVerifiedAt = new Date().toISOString();
      await users.updateOne({ _id: user._id }, { $set: update });
    }
    console.log("Applied safe normalization and verification/session defaults.");
  }
} finally {
  await client.close();
}
