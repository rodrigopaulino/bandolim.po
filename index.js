#!/usr/bin/env node

const vorpal = require("vorpal")();
const request = require("request");
const fs = require("fs");
const shell = require("shelljs");
const del = require("del");
const patchingToolPath = "./patching-tool";
const patchesPath = `${patchingToolPath}/patches`;
const prefixURL = "http://nikita/private/ee/fix-packs/6.2.10";

function downloadAndInstall(url, destFile) {
	var statusCode;
	request
		.get(url)
		.on("response", function(response) {
			statusCode = response.statusCode;
			if (statusCode == 200) {
				vorpal.activeCommand.log("Downloading patch...");
			}
			else if (statusCode == 404) {
				vorpal.activeCommand.log("Patch not found!");
			}
			else {
				vorpal.activeCommand.log(`Resquest status: ${response.statusCode}`);
			}
		})
		.pipe(
			fs.createWriteStream(destFile)
		).on("finish", function () {
			if (statusCode == 200) {
				del([`${patchesPath}/*`, `!${destFile}`])
				.then(paths => {
					shell.exec(`${patchingToolPath}/patching-tool.sh install -force`);
				});
			}
			else {
				del(destFile);
			}
		});
}

vorpal
	.command("fixpack <level>")
	.action(
		(args, callback) => {
			var fileName = `liferay-fix-pack-portal-${args.level}-6210.zip`;
			var url = `${prefixURL}/portal/${fileName}`;
			var destFile = `${patchesPath}/${fileName}`;

			downloadAndInstall(url, destFile);
		}
	)

vorpal
	.command("hotfix <level>")
	.action(
		(args, callback) => {
			var fileName = `liferay-hotfix-${args.level}-6210.zip`;
			var url = `${prefixURL}/hotfix/${fileName}`;
			var destFile = `${patchesPath}/${fileName}`;

			downloadAndInstall(url, destFile);
		}
	)

vorpal.parse(process.argv);
