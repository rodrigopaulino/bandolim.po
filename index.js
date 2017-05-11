#!/usr/bin/env node

const vorpal = require("vorpal")();
// const request = require("request");
// const fs = require("fs");
// const shell = require("shelljs");
// const del = require("del");
const colors = require("colors");
const inquirer = require("inquirer");
const JiraApi = require('jira').JiraApi;
// const patchingToolPath = "./patching-tool";
// const patchesPath = `${patchingToolPath}/patches`;
// const prefixURL = "http://nikita/private/ee/fix-packs/6.2.10";
const questions = [
	{
		type: "input",
		message: colors.magenta("JIRA's username:"),
		name: "username",
		required: true
	},
	{
		type: "password",
		message: colors.magenta("JIRA's password:"),
		name: "password"
	}
];

function log(message) {
	vorpal.activeCommand.log(message);
}

// function downloadAndInstall(url, destFile) {
// 	var statusCode;
// 	request
// 		.get(url)
// 		.on("response", function(response) {
// 			statusCode = response.statusCode;
// 			if (statusCode == 200) {
// 				log("Downloading patch...");
// 			}
// 			else if (statusCode == 404) {
// 				log("Patch not found!");
// 			}
// 			else {
// 				log(`Resquest status: ${response.statusCode}`);
// 			}
// 		})
// 		.pipe(
// 			fs.createWriteStream(destFile)
// 		).on("finish", function () {
// 			if (statusCode == 200) {
// 				del([`${patchesPath}/*`, `!${destFile}`])
// 				.then(paths => {
// 					shell.exec(
// 						`${patchingToolPath}/patching-tool.sh install -force`);
// 				});
// 			}
// 			else {
// 				del(destFile);
// 			}
// 		});
// }

function getIssues(newer, older, version, total, component, username, password) {
	var filter = "";
	var label = "";
	var tuple = "";
	var comma = "";

	if (version == "7.0") {
		filter = "AND ((project = LPS AND level = null) OR project = LPE)";
	} else {
		filter = "AND project = LPE";
	}

	filter += (component) ? ` AND component = ${component}` : "";

	while (newer > older) {
		if (version == "7.0") {
			label = `liferay-fixpack-de-${newer}-7010`;
		} else {
			label = `liferay-fixpack-portal-${newer}-6210`;
		}

		tuple = tuple + comma + label;
		comma = ",";
		newer--;
	}

	var jira = new JiraApi(
		"https", "issues.liferay.com", null, username, password, 2);
	var options = {
		startAt: 0,
		maxResults: 5000,
		fields: [
			"id",
			"key"
		]
	};

	function callback(error, body) {
		if (!error) {
			if (total) {
				log(`Number of tickets: ${body.total}`);
			} else {
				var tickets = "";
				var comma = "";

				body.issues.forEach((item, index, arr) => {
					tickets = tickets + comma + item.key;
					comma = ", ";
				});

				log(tickets);
			}
		} else {
			log(error);
		}
	}

	jira.searchJira(
		`labels IN (${tuple}) ${filter} ORDER BY key ASC`,
		options, callback);
}

// vorpal
// 	.command("fixpack <level>")
// 	.action(
// 		(args, callback) => {
// 			var fileName = `liferay-fix-pack-portal-${args.level}-6210.zip`;
// 			var url = `${prefixURL}/portal/${fileName}`;
// 			var destFile = `${patchesPath}/${fileName}`;
//
// 			downloadAndInstall(url, destFile);
// 		}
// 	);
//
// vorpal
// 	.command("hotfix <level>")
// 	.action(
// 		(args, callback) => {
// 			var fileName = `liferay-hotfix-${args.level}-6210.zip`;
// 			var url = `${prefixURL}/hotfix/${fileName}`;
// 			var destFile = `${patchesPath}/${fileName}`;
//
// 			downloadAndInstall(url, destFile);
// 		}
// 	);

vorpal
	.command("diff <fixpack1> <fixpack2> <version>")
	.option("-t, --total, Number of tickets between two patch levels.")
	.option("-c, --component <name>, Filter by Component.")
	// .option("-g, --group', 'Group the result by Components.")
	.action(
		(args, callback) => {
			var newer;
			var older;

			if (args.fixpack1 > args.fixpack2) {
				newer = args.fixpack1;
				older = args.fixpack2;
			} else if (args.fixpack1 < args.fixpack2) {
				newer = args.fixpack2;
				older = args.fixpack1;
			} else {
				log("The fixpacks passed are the same.");
				return;
			}

			if (args.version != "7.0" && args.version != "6.2") {
				log(
					"Not a valid Liferay Portal version nor supported by Bandolim.po");
				return;
			}

			inquirer.prompt(questions).then(function (answers) {
				getIssues(
					newer, older, args.version, args.options.total,
					args.options.component, answers.username, answers.password);
			});
		}
	);

vorpal.parse(process.argv);
