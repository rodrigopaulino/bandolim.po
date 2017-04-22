#!/usr/bin/env node

const vorpal = require("vorpal")();
const request = require("request");
const fs = require("fs");
const shell = require("shelljs");
const patchingToolPath = "./patching-tool";
const patchesPath = `${patchingToolPath}/patches`;
const prefixURL = "https://nikita/private/ee/fix-packs/6.2.10";

function revertAndClear() {
  shell.exec(`${patchingToolPath}/patching-tool.sh revert`);
  shell.rm("-f", `${patchesPath}/*`);
}

function downloadAndInstall(url, fileName) {
  request
    .get(url)
    .on("response", function(response) {
      if (response.statusCode == 200) {
        vorpal.activeCommand.log("Downloading...");
      }
      else if (response.statusCode == 404) {
        vorpal.activeCommand.log("Patch not found!");
      }
      else {
        vorpal.activeCommand.log(`Resquest status: ${response.statusCode}`);
      }
    })
    .pipe(
      fs.createWriteStream(`${patchesPath}/${fileName}`)
    ).on("finish", function () {
      shell.exec(`${patchingToolPath}/patching-tool.sh install`);
    });
}

vorpal
  .command("fixpack <level>")
  .action(
    (args, callback) => {
      const fileName = `liferay-fix-pack-portal-${args.level}-6210.zip`;
      const url = `${prefixURL}/portal/${fileName}`;

      revertAndClear();
      downloadAndInstall(url, fileName);
    }
  )

vorpal
  .command("hotfix <level>")
  .action(
    (args, callback) => {
      const fileName = `liferay-hotfix-${args.level}-6210.zip`;
      const url = `${prefixURL}/hotfix/${fileName}`;

      revertAndClear();
      downloadAndInstall(url, fileName);
    }
  )

vorpal.parse(process.argv);
