import * as ui from "./ui";
import * as util from "./util";
import { Quiz } from "./quiz";

function main() {
  const args = util.validateInput(process.argv);
  const quiz = new Quiz(args);
  ui.show(quiz);
}

main();
