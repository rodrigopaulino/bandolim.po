#!/usr/bin/env node

const vorpal = require('vorpal')(); //???
const request = require('request');
const fs = require('fs');
const shell = require('shelljs');
const patchingToolPath = "./patching-tool";
const patchesPath = `${patchingToolPath}/patches`;
const prefixURL = "http://nikita/private/ee/fix-packs/6.2.10";

function revertAndClear() {
  shell.exec(`${patchingToolPath}/patching-tool.sh revert`);
  shell.rm('-f', `${patchesPath}/*`);
}

vorpal
  .command("fixpack <level>")
  .action(
    (args, callback) => {
      const fileName = `liferay-fix-pack-portal-${args.level}-6210.zip`;
      const url = `${prefixURL}/portal/${fileName}`;

      // revertAndClear();

      request
        .get(url)
        .pipe(
          fs.createWriteStream(`${patchesPath}/${fileName}`)
        );

      //shell.exec(`${patchingToolPath}/patching-tool.sh install`);
    }
  )

vorpal
  .command("hotfix <level>")
  .action(
    (args, callback) => {
      const fileName = `liferay-hotfix-${args.level}-6210.zip`;
      const url = `${prefixURL}/hotfix/${fileName}`;

      // revertAndClear();

      request
        .get(url)
        .pipe(
          fs.createWriteStream(`${patchesPath}/${fileName}`)
        );

      //shell.exec(`${patchingToolPath}/patching-tool.sh install`);
    }
  )

vorpal.delimiter("").show().parse(process.argv);
