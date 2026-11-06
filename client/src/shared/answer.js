import { postWithRetry } from "./api.js";

// Sends an answer and turns the server's reply into what the phone shows.
// "locked" only after the server confirms, with the option the server recorded: if a first,
// lost request already got through, that first answer is the one shown (it is the one scored).
export async function submitAnswer(token, optionIndex, post = postWithRetry) {
  const result = await post("answer", { token, optionIndex });
  if (result.ok && Number.isInteger(result.data.optionIndex)) {
    return { status: "locked", optionIndex: result.data.optionIndex };
  }
  if (result.status === 403) return { status: "lost", message: result.data.message };
  if (result.status === 409) return { status: "closed", message: result.data.message };
  return { status: "failed" };
}
