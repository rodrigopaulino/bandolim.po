#!/usr/bin/env node

const vorpal = require('vorpal')();
const request = require('request');
const fs = require('fs');

vorpal
  .command("comando <obrigatorio> [opcional]", "este comando só faz printar os argumentos")
  .option("--opcao, -o", "uma opcao")
  .option("--opcao2, -p", "segunda opção")
  .action(
    (args, callback) => {
      console.log(args);
      callback();
    }
  );

  vorpal
    .command("<referencia>")
    .option("--hotfix, -h", "Use se for baixar hotfix")
    .option("--fixpack, -f", "Use se for baixa fixpack")
    .action(
      (args, callback) => {
        if (args.options.hotfix) {
          vorpal.activeCommand.log("escolheu hotfix");
          const url =
            `http://192.168.110.251/private/ee/fix-packs/6.2.10/hotfix/liferay-hotfix-${args.referencia}-6210.zip`;
          const cmd = vorpal.activeCommand;
          cmd.log(url);
          request(url, (error, response, body) => {
            fs.writeFile(
              `liferay-hotfix-${args.referencia}-6210.zip`,
              body,
              (err, written, buffer) => {
                cmd.log("terminei!");
                callback();
              });
          });
          //hotfix
        }
        else if (args.options.fixpack) {
          vorpal.activeCommand.log("escolheu fixpack");
          const url =
            `http://192.168.110.251/private/ee/fix-packs/6.2.10/portal/liferay-fix-pack-portal-${args.referencia}-6210.zip`;
          vorpal.activeCommand.log(url);
          request(url, (error, response, body) => {
            fs.writeFile(
              `liferay-hotfix-${args.referencia}-6210.zip`,
              body,
              (err, written, buffer) => {
                callback();
              });
          });
        }
      }
    )

vorpal.delimiter("$").show().parse(process.argv);

// console.log("Hello, world!");