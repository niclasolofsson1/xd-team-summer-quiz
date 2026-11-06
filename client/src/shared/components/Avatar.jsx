import { avatarById } from "../avatars.js";

// An emoji on a coloured circle. Decorative by default: the player's name is always shown next to it.
export function Avatar({ id, size = "md", label }) {
  const avatar = avatarById(id);
  return (
    <span
      className={`quiz-avatar quiz-avatar--${size}`}
      style={{ "--avatar-bg": avatar.color }}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {avatar.emoji}
    </span>
  );
}
