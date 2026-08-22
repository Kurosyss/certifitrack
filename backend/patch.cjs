import fs from "fs";
import path from "path";

const dir = "tests";
const files = fs.readdirSync(dir).filter(f => f.endsWith(".test.ts"));

for (const file of files) {
  const fp = path.join(dir, file);
  let content = fs.readFileSync(fp, "utf8");
  
  if (!content.includes("getTestToken")) {
    content = "import { getTestToken } from './testHelper.js';\n" + content;
  }
  
  content = content.replace(
    /headers:\s*\{\s*"content-type":\s*"multipart\/form-data;\s*boundary=---boundary",?\s*\}/g,
    `headers: {\n        "content-type": "multipart/form-data; boundary=---boundary",\n        "Authorization": \`Bearer \${getTestToken()}\`\n      }`
  );
  
  fs.writeFileSync(fp, content);
}
console.log("Done");
