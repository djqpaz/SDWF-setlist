// Opens a printable page of the show's charts in a new tab.
// Uses the same data as the prompter export so the two always match.
import { buildPrompterSet } from "./prompterExport";
import template from "./chartsTemplate.html?raw";

export function openChartsPage(show, songs) {
  const payload = buildPrompterSet(show, songs);
  const json = JSON.stringify(payload).replace(/</g, "\\u003c");
  const html = template.replace("/*__DATA__*/null", () => json);
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const win = window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return { count: payload.songs.length, opened: !!win };
}
