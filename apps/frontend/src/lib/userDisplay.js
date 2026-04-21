export const getUserDisplayName = (user) => {
  if (!user || typeof user !== "object") return "Account connected";

  const primaryValue =
    user.name ||
    user.full_name ||
    user.fullName ||
    user.email ||
    user.username;

  if (typeof primaryValue === "string" && primaryValue.trim()) {
    return primaryValue.trim();
  }

  if (user.id) return `User #${user.id}`;
  return "Account connected";
};

export const getUserSecondaryText = (user) => {
  if (!user || typeof user !== "object") return "";
  const email = typeof user.email === "string" ? user.email.trim() : "";

  if (!email) return "";

  const displayName = getUserDisplayName(user);
  if (displayName.toLowerCase() === email.toLowerCase()) return "";

  return email;
};

export const getUserInitials = (user) => {
  const label = getUserDisplayName(user);
  const parts = label
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return label.slice(0, 2).toUpperCase();
};
