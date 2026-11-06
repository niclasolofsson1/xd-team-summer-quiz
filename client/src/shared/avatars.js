// The avatar list lives in avatars.json (the server reads it too). Swap that file for a themed set.
import avatars from "./avatars.json";

export { avatars };

export function avatarById(id) {
  return avatars.find((avatar) => avatar.id === id) || avatars[0];
}
