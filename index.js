#!/usr/bin/env node

const vorpal = require('vorpal')();
const request = require('request');
const fs = require('fs');
const cmd = vorpal.activeCommand;
const prefixURL = "http://nikita/private/ee/fix-packs/6.2.10";

vorpal
  .command("fixpack <level>")
  .action(
    (args, callback) => {
      const url =
        `${prefixURL}/portal/liferay-fix-pack-portal-${args.level}-6210.zip`;
      request(url, (error, response, body) => {
        fs.writeFile(
          `liferay-hotfix-${args.level}-6210.zip`,
          body,
          (err, written, buffer) => {
            cmd.log("Fix-Pack Downloaded!");
            callback();
          });
      });
    }
  )

vorpal
  .command("hotfix <level>")
  .action(
    (args, callback) => {
      const url =
        `${prefixURL}/hotfix/liferay-hotfix-${args.level}-6210.zip`;
      request(url, (error, response, body) => {
        fs.writeFile(
          `liferay-hotfix-${args.referencia}-6210.zip`,
          body,
          (err, written, buffer) => {
            cmd.log("Hotfix Downloaded!");
            callback();
          });
      });
    }
  )

vorpal.delimiter("$").show().parse(process.argv);
