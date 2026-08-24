import type { AuthProvider, LinkedProvider, User } from "@/types/user";

interface ProviderIdentity {
  provider: AuthProvider;
  providerId?: string;
}

type UserProviderFields = Pick<
  User,
  "provider" | "providerId" | "password" | "linkedProviders" | "createdAt"
>;

export function getLinkedProviders(user: UserProviderFields) {
  const linked = [...(user.linkedProviders ?? [])];

  if (user.password && !linked.some((item) => item.provider === "credentials")) {
    linked.push({ provider: "credentials", linkedAt: user.createdAt });
  }

  if (
    user.provider &&
    !linked.some(
      (item) => item.provider === user.provider && (!user.providerId || item.providerId === user.providerId)
    )
  ) {
    linked.push({
      provider: user.provider,
      providerId: user.providerId,
      linkedAt: user.createdAt,
    });
  }

  return linked;
}

export function addLinkedProvider(user: UserProviderFields, identity: ProviderIdentity): LinkedProvider[] {
  const linked = getLinkedProviders(user);
  const alreadyLinked = linked.some(
    (item) => item.provider === identity.provider && item.providerId === identity.providerId
  );

  if (!alreadyLinked) {
    linked.push({
      ...identity,
      linkedAt: new Date().toISOString(),
    });
  }

  return linked;
}

export function hasLinkedProvider(user: UserProviderFields, identity: ProviderIdentity) {
  return addLinkedProvider(user, identity).length === getLinkedProviders(user).length;
}
