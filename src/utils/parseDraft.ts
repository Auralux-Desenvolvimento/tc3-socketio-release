import AppError from "../errors";
import IDraftContent from "../types/IDraftContent";

export default function parseDraft (portfolio: IDraftContent) {
  try {
    let content = portfolio.blocks.map(e => e.text);
    return content;
  } catch {
    throw new AppError([ 400, "Invalid Portfolio" ], -999);
  }
}